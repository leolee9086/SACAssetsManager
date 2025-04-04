const ts = require(`D:/思源主库/data/plugins/SACAssetsManager/static/typeScript.js`)

/**
 * 从.d.ts文件解析类型定义
 * @param {string} dtsContent .d.ts文件内容
 * @param {string} exportName 导出函数名
 * @returns {Object} 类型定义结果
 */
async function parseDtsTypes(dtsContent, exportName) {
    // 创建一个内存中的源文件
    const sourceFile = ts.createSourceFile(
        'index.d.ts',
        dtsContent,
        ts.ScriptTarget.Latest,
        true
    );

    // 创建编译器主机
    const compilerHost = {
        getSourceFile: (fileName) => sourceFile,
        getDefaultLibFileName: () => 'lib.d.ts',
        writeFile: () => {},
        getCurrentDirectory: () => '/',
        getCanonicalFileName: (fileName) => fileName,
        useCaseSensitiveFileNames: () => true,
        getNewLine: () => '\n',
        fileExists: () => true,
        readFile: () => ''
    };

    // 创建程序实例
    const program = ts.createProgram(['index.d.ts'], {}, compilerHost);
    const checker = program.getTypeChecker();

    // 查找导出的函数
    let functionSymbol;
    ts.forEachChild(sourceFile, node => {
        if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
            const symbol = checker.getSymbolAtLocation(node.moduleSpecifier);
            if (symbol) {
                const exports = checker.getExportsOfModule(symbol);
                functionSymbol = exports.find(exp => exp.name === exportName);
            }
        }
    });

    if (!functionSymbol) {
        throw new Error(`找不到导出的函数: ${exportName}`);
    }

    // 获取函数类型
    const functionType = checker.getTypeOfSymbolAtLocation(
        functionSymbol,
        functionSymbol.valueDeclaration
    );

    // 获取函数签名
    const signature = checker.getSignaturesOfType(
        functionType,
        ts.SignatureKind.Call
    )[0];

    // 解析输入参数
    const inputs = {};
    signature.parameters.forEach((param, index) => {
        const declaration = param.declarations?.[0] || param.valueDeclaration;
        const paramType = checker.getTypeOfSymbolAtLocation(
            param,
            declaration
        );
        
        inputs[param.name] = {
            type: checker.typeToString(paramType),
            label: param.name,
            description: ts.displayPartsToString(
                param.getDocumentationComment(checker)
            )
        };
    });

    // 解析返回值
    const outputs = {};
    const returnType = signature.getReturnType();
    
    if (checker.isObjectType(returnType)) {
        returnType.getProperties().forEach(prop => {
            outputs[prop.name] = {
                type: checker.typeToString(
                    checker.getTypeOfSymbolAtLocation(
                        prop,
                        prop.valueDeclaration
                    )
                ),
                label: prop.name,
                description: ts.displayPartsToString(
                    prop.getDocumentationComment(checker)
                )
            };
        });
    } else {
        outputs.$result = {
            type: checker.typeToString(returnType),
            label: '返回值'
        };
    }

    return {
        inputs,
        outputs,
        description: ts.displayPartsToString(
            functionSymbol.getDocumentationComment(checker)
        )
    };
}

/**
 * 将TypeScript类型定义转换为节点定义
 * @param {string} dtsContent .d.ts文件内容
 * @param {Object} module 模块对象
 * @param {string} exportName 导出函数名
 * @returns {Object} 节点定义
 */
export async function ts2NodeDefine(dtsContent, module, exportName) {
    const typeInfo = await parseDtsTypes(dtsContent, exportName);
    const nodeDefine = module[exportName];
    
    // 如果模块直接导出了完整的节点定义，优先使用它
    if (nodeDefine && typeof nodeDefine === 'object' && nodeDefine.process) {
        return nodeDefine;
    }

    return {
        flowType: 'process',
        inputs: typeInfo.inputs,
        outputs: typeInfo.outputs,
        process: module[exportName],
        description: typeInfo.description,
        category: 'typescript'
    };
}

/**
 * 将节点定义转换为Vue单文件组件字符串
 * @param {Object} nodeDefine 节点定义
 * @param {string} url 模块URL
 * @param {string} exportName 导出函数名
 * @returns {Object} SFC字符串和Blob URL
 */
export function wrapSFCStringFromTSNodeDefine(nodeDefine, url, exportName) {
    const outputs = nodeDefine.outputs;
    const sfc = `
<template>
    <div class="node-control">
        <div>文件: ${url.split('/').pop()}; 函数: ${exportName}</div>
        <div>输入: {{inputValue}}</div>
        <div>输出: {{outputValue}}</div>
    </div>
</template>

<script nodeDefine>
import { ref } from 'vue';
import { create, all } from '${url}';

// 创建 mathjs 实例并获取函数
const math = create(all);
const ${exportName} = math.${exportName};

const outputValue = ref(null);
const inputValue = ref(null);

export const getDefaultInput = () => {
    return outputValue;
};

const nodeDefine = ${JSON.stringify(nodeDefine, null, 2)};

nodeDefine.process = async (input) => {
    const realInput = Object.values(input).map(item => item.value);
    inputValue.value = realInput;
    
    try {
        const result = await ${exportName}(...realInput);
        outputValue.value = result;
        
        const outputData = {};
        ${!outputs.$result 
            ? Object.keys(outputs)
                .map(name => `outputData['${name}'] = result['${name}']`)
                .join(';\n')
            : 'outputData.$result = result'
        };
        
        return outputData;
    } catch (e) {
        console.error(e);
        outputValue.value = String(e);
        return {};
    }
};

export default nodeDefine;
</script>

<script setup>
import { defineProps, defineEmits, watch } from 'vue';

const props = defineProps({
    modelValue: {
        type: null,
        required: true
    }
});

const emit = defineEmits(['update:modelValue']);

watch(outputValue, () => {
    emit('update:modelValue', outputValue.value);
});
</script>

<style scoped>
.node-control {
    padding: 8px;
}
</style>`;

    const blob = new Blob([sfc], { type: 'text/plain' });
    const blobUrl = URL.createObjectURL(blob);
    
    return {
        sfcString: sfc,
        blobUrl
    };
}
/**
 * 解析 mathjs 函数导出
 */
async function parseMathJSExports() {
    try {
        console.log('开始获取类型定义...');
        const dtsResponse = await fetch('https://esm.sh/v135/mathjs/types/index.d.ts');
        const dtsContent = await dtsResponse.text();
        const mathjs = await import('https://esm.sh/mathjs');

        const functionNodes = {};
        
        const sourceFile = ts.createSourceFile(
            'index.d.ts',
            dtsContent,
            ts.ScriptTarget.Latest,
            true
        );

        const compilerHost = {
            getSourceFile: () => sourceFile,
            getDefaultLibFileName: () => 'lib.d.ts',
            writeFile: () => {},
            getCurrentDirectory: () => '/',
            getCanonicalFileName: (fileName) => fileName,
            useCaseSensitiveFileNames: () => true,
            getNewLine: () => '\n',
            fileExists: () => true,
            readFile: () => ''
        };

        const program = ts.createProgram(['index.d.ts'], {}, compilerHost);
        const checker = program.getTypeChecker();

        function visit(node) {
            if (ts.isInterfaceDeclaration(node)) {
                node.members.forEach(member => {
                    if (ts.isMethodSignature(member) || ts.isPropertySignature(member)) {
                        const memberName = member.name.getText();
                        
                        if (mathjs[memberName] && typeof mathjs[memberName] === 'function') {
                            try {
                                const symbol = checker.getSymbolAtLocation(member.name);
                                const type = checker.getTypeAtLocation(member);
                                const signatures = type.getCallSignatures();

                                if (signatures.length > 0) {
                                    // 获取所有签名
                                    const allSignatures = signatures.map(signature => {
                                        const inputs = {};
                                        
                                        // 处理泛型参数
                                        if (signature.typeParameters) {
                                            signature.typeParameters.forEach(typeParam => {
                                                const typeParamName = typeParam.symbol.name;
                                                inputs[typeParamName] = {
                                                    type: 'type parameter',
                                                    label: typeParamName,
                                                    description: '类型参数'
                                                };
                                            });
                                        }

                                        // 处理值参数
                                        signature.getParameters().forEach(param => {
                                            const paramName = param.getName();
                                            let paramType = checker.getTypeOfSymbolAtLocation(
                                                param,
                                                param.declarations?.[0] || param.valueDeclaration
                                            );

                                            // 处理联合类型
                                            if (paramType.isUnion()) {
                                                const types = paramType.types.map(t => 
                                                    checker.typeToString(t)).join(' | ');
                                                inputs[paramName] = {
                                                    type: types,
                                                    label: paramName,
                                                    description: ts.displayPartsToString(
                                                        param.getDocumentationComment(checker)
                                                    )
                                                };
                                            } else {
                                                inputs[paramName] = {
                                                    type: checker.typeToString(paramType),
                                                    label: paramName,
                                                    description: ts.displayPartsToString(
                                                        param.getDocumentationComment(checker)
                                                    )
                                                };
                                            }
                                        });

                                        return {
                                            inputs,
                                            returnType: checker.typeToString(signature.getReturnType())
                                        };
                                    });

                                    // 使用最详细的签名
                                    const mostDetailedSignature = allSignatures.reduce((prev, curr) => 
                                        Object.keys(curr.inputs).length > Object.keys(prev.inputs).length ? curr : prev
                                    );

                                    functionNodes[memberName] = {
                                        name: memberName,
                                        inputs: mostDetailedSignature.inputs,
                                        outputs: {
                                            $result: {
                                                type: mostDetailedSignature.returnType,
                                                label: '返回值'
                                            }
                                        },
                                        description: symbol ? ts.displayPartsToString(
                                            symbol.getDocumentationComment(checker)
                                        ) : ''
                                    };
                                }
                            } catch (err) {
                                console.warn(`解析函数 ${memberName} 失败:`, err);
                            }
                        }
                    }
                });
            }
            ts.forEachChild(node, visit);
        }

        visit(sourceFile);
        
        console.log('解析完成，找到的函数数量:', Object.keys(functionNodes).length);
        return functionNodes;

    } catch (err) {
        console.error('解析 mathjs 导出失败:', err);
        return null;
    }
}

/**
 * 创建 mathjs 节点
 */
export async function createMathJSNodes() {
    const functionNodes = await parseMathJSExports();
    
    if (!functionNodes) {
        console.error('未能解析任何函数节点');
        return {};
    }
    
    // 为每个函数创建节点定义
    const nodes = {};
    for (const [name, info] of Object.entries(functionNodes)) {
        try {
            const nodeDefine = {
                flowType: 'process',
                inputs: info.inputs,
                outputs: info.outputs,
                process: async (...args) => {
                    // 动态创建 mathjs 实例并调用函数
                    const mathjs = await import('https://esm.sh/mathjs');
                    const math = mathjs.create(mathjs.all);
                    return math[name](...args);
                },
                description: info.description,
                category: 'mathjs'
            };

            // 生成 Vue 组件
            const { sfcString, blobUrl } = wrapSFCStringFromTSNodeDefine(
                nodeDefine,
                'https://esm.sh/mathjs',
                name
            );

            nodes[name] = {
                nodeDefine,
                sfcString,
                blobUrl
            };
        } catch (err) {
            console.warn(`创建节点 ${name} 失败:`, err);
        }
    }

    return nodes;
}

