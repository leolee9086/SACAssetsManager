import { parse } from '@babel/parser';
import * as Vue from '../../../../../../static/vue.esm-browser.js';
import { loadVueComponentAsNodeSync } from '../../../../../../src/toolBox/useVue/vueComponentLoader.js';
const { ref, reactive, computed } = Vue;

/**
 * 创建模拟的 Vue 运行时上下文
 */
function createMockVueContext() {
    return {
        ref,
        reactive,
        computed,
        defineProps: (props) => props,
        defineEmits: () => {},
        defineExpose: () => {},
        withDefaults: (props, defaults) => ({ ...defaults, ...props }),
        // 可以根据需要添加更多 Vue 组合式 API
    };
}

/**
 * 将 setup 代码转换为可执行的函数
 * @param {string} setupCode 
 * @returns {Function}
 */
function createSetupFunction(setupCode) {
    // 注入 Vue 组合式 API
    const contextKeys = Object.keys(createMockVueContext());
    const contextParams = contextKeys.join(', ');
    
    // 构建函数体
    const functionBody = `
        return async function setup(props) {
            ${setupCode}
            
            // 收集所有导出的变量
            const exports = {};
            ${contextKeys.map(key => `
                try {
                    if (typeof ${key} !== 'undefined') exports['${key}'] = ${key};
                } catch(e) {}`
            ).join('\n')}
            
            return exports;
        }
    `;
    
    // 创建函数
    const createSetup = new Function(contextParams, functionBody);
    return createSetup(...Object.values(createMockVueContext()));
}

/**
 * 解析 setup 代码块中的变量声明
 * @param {string} setupCode setup 代码块的内容
 * @returns {Object} 解析结果
 */
function parseSetupBlock(setupCode) {
    const ast = parse(setupCode, {
        sourceType: 'module',
        plugins: ['typescript']
    });

    const inputs = {};  // props 定义
    const outputs = {}; // 其他导出变量
    
    ast.program.body.forEach(node => {
        if (node.type === 'VariableDeclaration') {
            // 检查是否是 props 定义
            const defineProps = node.declarations.find(dec => 
                dec.init?.callee?.name === 'defineProps'
            );
            
            if (defineProps) {
                // 解析 props 定义
                const propsNode = defineProps.init.arguments[0];
                if (propsNode.type === 'ObjectExpression') {
                    propsNode.properties.forEach(prop => {
                        inputs[prop.key.name] = {
                            type: prop.value.type === 'ObjectExpression' 
                                ? prop.value.properties.find(p => p.key.name === 'type')?.value.name 
                                : prop.value.name,
                            label: prop.key.name
                        };
                    });
                }
            } else {
                // 其他变量声明作为输出
                node.declarations.forEach(dec => {
                    outputs[dec.id.name] = {
                        type: 'any', // 需要进一步分析类型
                        label: dec.id.name
                    };
                });
            }
        }
    });

    return { inputs, outputs };
}

/**
 * 将 Vue 组件封装为节点组件
 * @param {string} componentUrl 组件路径
 * @param {boolean} headless 是否为无头模式
 */
export async function wrapComponentAsNode(componentUrl, headless = false) {
    const response = await fetch(componentUrl);
    const content = await response.text();
    
    // 提取 setup 代码块
    const setupMatch = content.match(/<script setup>([\s\S]*?)<\/script>/);
    if (!setupMatch) {
        throw new Error('组件必须包含 setup 代码块');
    }
    
    const setupCode = setupMatch[1];
    const { inputs, outputs } = parseSetupBlock(setupCode);
    
    // 创建 setup 函数
    const setupFunction = createSetupFunction(setupCode);
    
    // 生成 nodeDefine
    const nodeDefine = {
        flowType: "start",
        inputs,
        outputs,
        async process(inputValues) {
            if (headless) {
                // 无头模式：直接运行 setup 函数
                try {
                    const result = await setupFunction(inputValues);
                    // 过滤出我们关心的输出值
                    return Object.keys(outputs).reduce((acc, key) => {
                        if (key in result) {
                            // 处理 ref 和 reactive 值
                            acc[key] = Vue.unref(result[key]);
                        }
                        return acc;
                    }, {});
                } catch (error) {
                    console.error('Setup function execution error:', error);
                    throw error;
                }
            } else {
                // 有头模式：使用正常的组件渲染
                const scope = {};
                const component = await loadVueComponentAsNodeSync(componentUrl).getComponent(scope);
                return Object.keys(outputs).reduce((result, key) => {
                    result[key] = Vue.unref(scope[key]);
                    return result;
                }, {});
            }
        }
    };
    
    // 生成新的组件代码
    const wrappedComponent = `
    ${content.replace(/<script setup>[\s\S]*?<\/script>/, '')}
    <script nodeDefine>
    export const nodeDefine = ${JSON.stringify(nodeDefine, null, 2)};
    
    export const getDefaultInput = () => ({
        ${Object.keys(inputs).map(key => `${key}: undefined`).join(',\n')}
    });
    </script>
    `;
    
    return wrappedComponent;
}

