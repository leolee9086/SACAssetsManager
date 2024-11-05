import { loadVueComponentAsNodeSync } from "../../../utils/componentsLoader.js";
import { shallowRef } from "../../../../../static/vue.esm-browser.js";
/**
 * 自定义错误类
 */
class ValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

/**
 * 用于校验一个卡片节点的输入定义是否与它的显示组件的属性定义是否兼容
 * @param {Object|Array} props 组件的属性定义
 * @param {Object|Array} inputs 节点的输入定义
 * @param {String} componentName 组件名称
 * @returns {Object} 校验结果
 */
function checkInputs(props, inputs, componentName) {
  try {
    // 标准化 props
    const propsObj = Array.isArray(props)
      ? props.reduce((acc, prop) => {
        if (typeof prop === 'string') {
          acc[prop] = { type: 'any' };
        }
        return acc;
      }, {})
      : props || {};

    // 标准化 inputs
    const inputsObj = normalizeInputs(inputs);
    const errors = [];

    // 校验每个输入
    Object.entries(inputsObj).forEach(([inputName, inputDef]) => {
      const propDef = propsObj[inputName];

      // 检查是否存在对应的 prop
      if (!propDef) {
        errors.push({
          type: 'missing_prop',
          input: inputName,
          message: `组件 ${componentName} 缺少属性 "${inputName}"`,
          suggestion: `请在组件中添加属性定义: props: { ${inputName}: { type: ${inputDef.type || 'Any'} } }`
        });
        return;
      }

      // 检查类型兼容性
      const propType = utils.normalizeType(propDef.type);
      const inputType = utils.normalizeType(inputDef.type);

      if (propType && inputType && propType !== inputType) {
        errors.push({
          type: 'type_mismatch',
          input: inputName,
          message: `属性 "${inputName}" 类型不匹配: 期望 ${propType.name}，实际 ${inputType.name}`,
          suggestion: `请修改输入定义类型为 ${propType.name} 或修改组件属性类型为 ${inputType.name}`
        });
      }

      // 检查默认值
      if (inputDef.default !== undefined) {
        if (!utils.validateValue(inputDef.default, inputDef.type)) {
          errors.push({
            type: 'invalid_default',
            input: inputName,
            message: `属性 "${inputName}" 的默认值类型错误`,
            suggestion: `请确保默认值类型与定义的类型 ${inputDef.type} 匹配`
          });
        }
      }
    });

    // 如果存在错误，抛出异常
    if (errors.length > 0) {
      throw new ValidationError(
        `组件 ${componentName} 输入定义验证失败`,
        errors
      );
    }

    return {
      parsedInputs: inputsObj,
      isValid: true
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      // 格式化错误信息
      const errorMessage = [
        `组件 ${componentName} 输入定义验证失败:`,
        ...error.details.map(detail =>
          `- ${detail.message}\n  建议: ${detail.suggestion}`
        )
      ].join('\n');

      console.error(errorMessage);
      throw error;
    }

    console.error(`检查输入定义时发生错误:`, error);
    throw error;
  }
}

/**
 * 校验组件的事件定义是否包含节点定义中的所有输出
 * @param {Object|Array} emits 组件的事件定义
 * @param {Object|Array} outputs 节点的输出定义
 * @param {String} componentName 组件名称
 * @returns {Object} 校验结果
 */
function checkOutputs(emits, outputs, componentName) {
  try {
    // 标准化 outputs
    const outputsObj = normalizeOutputs(outputs);

    // 转换为数组形式用于后续处理
    const outputsArray = Object.entries(outputsObj).map(([name, def]) => ({
      name,
      type: def.type || 'any',
      description: def.description || '',
      validator: def.validator
    }));

    const warnings = [];

    // 标准化 emits
    const normalizedEmits = Array.isArray(emits)
      ? emits
      : (typeof emits === 'object' ? Object.keys(emits) : []);

    // 验证事件
    outputsArray.forEach(output => {
      const emitName = `update:${output.name}`;
      if (!normalizedEmits.includes(emitName)) {
        warnings.push({
          type: 'missing_emit',
          output: output.name,
          message: `组件 ${componentName} 缺少输出事件 "${emitName}"`,
          suggestion: `请在组件中添加事件定义: emits: ['${emitName}']`
        });
      }
    });

    // 输出警告信息
    if (warnings.length > 0) {
      const warningMessage = [
        `组件 ${componentName} 输出定义检查结果:`,
        ...warnings.map(warning =>
          `⚠️ ${warning.message}\n  建议: ${warning.suggestion}`
        )
      ].join('\n');

      console.warn(warningMessage);
    }

    return {
      parsedOutputs: outputsArray,
      warnings
    };
  } catch (error) {
    console.error(`检查输出定义时发生错误:`, error);
    throw error;
  }
}

/**
 * 将输入定义标准化为对象形式
 * @param {Array|Object} inputs 输入定义
 * @returns {Object} 标准化后的输入定义
 */
function normalizeInputs(inputs) {
  if (!inputs) return {};

  // 如果已经是对象形式，直接返回
  if (!Array.isArray(inputs) && typeof inputs === 'object') {
    return inputs;
  }

  // 处理数组形式
  return Array.isArray(inputs) ? inputs.reduce((acc, input) => {
    // 处理字符串形式: ['name', 'age']
    if (typeof input === 'string') {
      acc[input] = { type: 'any' };
    }
    // 处理对象形式: [{ name: 'age', type: 'number' }]
    else if (input && typeof input === 'object') {
      const name = input.name || input.id;
      if (name) {
        acc[name] = {
          type: input.type || 'any',
          required: !!input.required,
          default: input.default,
          validator: input.validator,
          description: input.description
        };
      }
    }
    return acc;
  }, {}) : {};
}

/**
 * 将输出定义标准化为对象形式
 * @param {Array|Object} outputs 输出定义
 * @returns {Object} 标准化后的输出定义
 */
function normalizeOutputs(outputs) {
  if (!outputs) return {};

  // 如果已经是对形式，直接返回
  if (!Array.isArray(outputs) && typeof outputs === 'object') {
    return outputs;
  }

  // 处理数组形式
  return Array.isArray(outputs) ? outputs.reduce((acc, output) => {
    // 处理字符串形式: ['result', 'error']
    if (typeof output === 'string') {
      acc[output] = { type: 'any' };
    }
    // 处理对象形式: [{ name: 'result', type: 'number' }]
    else if (output && typeof output === 'object') {
      const name = output.name || output.id;
      if (name) {
        acc[name] = {
          type: output.type || 'any',
          description: output.description,
          validator: output.validator
        };
      }
    }
    return acc;
  }, {}) : {};
}

/**
 * 创建锚点控制器
 */
function createAnchorController(anchor) {
  return {
    ...anchor,
    setValue: (newValue) => {
      anchor.value.value = newValue;
    },
    getValue: () => anchor.value.value,
    reset: () => {
      const defaultValue = anchor.type === 'input' ? anchor.define.default : null;
      anchor.value.value = defaultValue;
    }
  };
}

/**
 * 创建运行时控制器
 */
function createRuntimeController(anchorControllers, component, componentName) {
  return {
    setOutput: (name, value) => {
      const controller = anchorControllers.find(
        c => c.type === 'output' && c.id === name
      );
      if (controller) {
        controller.setValue(value);
      } else {
        console.warn(`[${componentName}] 未找到输出锚点: ${name}`);
      }
    },
    getInput: (name) => {
      console.log(name, anchorControllers)

      const controller = anchorControllers.find(
        c => c.type === 'input' && c.id === name
      );
      return controller ? controller.getValue() : undefined;
    },
    getInputs: (appData) => {

      if (!anchorControllers
        .filter(c => c.type === 'input')[0]) {
        return appData
      }

      return anchorControllers
        .filter(c => c.type === 'input')
        .reduce((acc, c) => {
          acc[c.id] = c.value;
          return acc;
        }, {});
    },
    component,
    componentName,
    log: (...args) => console.log(`[${componentName}]`, ...args),
    warn: (...args) => console.warn(`[${componentName}]`, ...args),
    error: (...args) => console.error(`[${componentName}]`, ...args)
  };
}

/**
 * 创建节点控制器
 */
function createNodeController(anchorControllers, nodeDefine, component, componentName, componentProps) {
  const runtime = createRuntimeController(anchorControllers, component, componentName);
  return {
    component: () => component,
    anchors: anchorControllers,
    componentProps,
    runtime,
    async exec(appData) {
      try {
        // 验证输入
        const inputControllers = anchorControllers.filter(c => c.type === 'input');
        for await (const controller of inputControllers) {
          if (controller.define.required && !controller.getValue()) {
            throw new Error(`缺少必需的输入: ${controller.label || controller.id}`);
          }
        }

        // 执行处理
        const result = await nodeDefine.process(runtime.getInputs(appData), runtime);
        console.log(result)
        // 处理返回值
        if (result && typeof result === 'object') {
          Object.entries(result).forEach(([name, value]) => {
            runtime.setOutput(name, value);
          });
        }
      } catch (error) {
        runtime.error('执行失败:', error);
        // 重置所有输出
        anchorControllers
          .filter(c => c.type === 'output')
          .forEach(c => c.reset());
        throw error;
      }
    },
    // 重置所有锚点
    reset() {
      anchorControllers.forEach(c => c.reset());
    },
    // 获取锚点控制器
    getAnchor(id) {
      return anchorControllers.find(c => c.id === id);
    },
    // 获取所有输入控制器
    getInputs() {
      return anchorControllers.filter(c => c.type === 'input');
    },
    // 获取所有输出控制器
    getOutputs() {
      return anchorControllers.filter(c => c.type === 'output');
    }
  };
}

export async function parseNodeDefine(componentURL) {
  try {
    const component = await loadVueComponentAsNodeSync(componentURL).getComponent();
    const nodeDefine = await loadVueComponentAsNodeSync(componentURL).getNodeDefine();
    const componentName = new URL(componentURL, window.location.origin).pathname;

    if (!nodeDefine) {
      throw new Error(`组件 ${componentName} 未暴露 nodeDefine`);
    }

    const componentProps = {};
    const parsedInputs = parseInputs(component.props, nodeDefine.inputs, componentName, componentProps,nodeDefine);
    const parsedOutputs = parseOutputs(component.emits, nodeDefine.outputs, componentName,nodeDefine);

    const anchorControllers = createAnchorControllers(parsedInputs, parsedOutputs, nodeDefine, componentProps);

    return createNodeController(anchorControllers, nodeDefine, component, componentName, componentProps);
  } catch (error) {
    console.error(`解析节点定义失败:`, error);
    throw error;
  }
}

function parseInputs(props, inputs, componentName, componentProps,nodeDefine) {
  const { parsedInputs } = checkInputs(props, inputs, componentName);
  const inputAnchors = Object.entries(parsedInputs)
    .filter(() => nodeDefine.flowType !== 'start')
    .map(([name, def], index, array) => ({
      id: name,
      label: def.label || name,
      define: def,
      type: 'input',
      side: def.side || 'left',
      value: shallowRef(def.default),
      position: (index + 1) / (array.length + 1)
    }));

  for (const anchor of inputAnchors) {
    componentProps[anchor.id] = anchor.value;
  }

  return inputAnchors;
}

function parseOutputs(emits, outputs, componentName) {
  const { parsedOutputs } = checkOutputs(emits, outputs, componentName);
  return parsedOutputs.map((output, index, array) => ({
    id: output.name,
    label: output.label || output.name,
    define: output,
    type: 'output',
    side: output.side || 'right',
    value: shallowRef(null),
    position: (index + 1) / (array.length + 1)
  }));
}

function createAnchorControllers(inputAnchors, outputAnchors, nodeDefine, componentProps) {
  const anchorPoints = inputAnchors.concat(outputAnchors);
  return anchorPoints.map(anchor => createAnchorController(anchor));
}

/**
 * 判断输出锚点是否可以连接到输入锚点
 * @param {Object} outputAnchor 输出锚点定义
 * @param {Object} inputAnchor 输入锚点定义
 * @returns {boolean} 是否可以连接
 */
export function linkAble(outputAnchor, inputAnchor) {
  try {
    if (!outputAnchor?.define?.type || !inputAnchor?.define?.type) {
      return true;
    }

    const outputType = utils.normalizeType(outputAnchor.define.type);
    const inputType = utils.normalizeType(inputAnchor.define.type);

    // 如果任一类型为 null (any)，允许连接
    if (!outputType || !inputType) {
      return true;
    }

    // 检查类型兼容性
    const isCompatible = outputType === inputType;

    if (!isCompatible) {
      console.warn(`类型不匹配: ${outputType.name} -> ${inputType.name}`);
    }

    return isCompatible;
  } catch (error) {
    console.error('检查连接兼容性时发生错误:', error);
    return false;
  }
}

// 类型定义和常量
const TYPE_MAP = {
  'string': String,
  'number': Number,
  'boolean': Boolean,
  'object': Object,
  'array': Array,
  'function': Function,
  'date': Date,
  'regexp': RegExp,
  'promise': Promise,
  'any': null
};

// 工具函数
const utils = {
  /**
   * 规范化类型定义
   * @param {*} type 原始类型定义
   * @returns {Function|null} 规范化后的类型
   */
  normalizeType(type) {
    try {
      if (!type) return null;

      // 处理字符串类型
      if (typeof type === 'string') {
        return TYPE_MAP[type.toLowerCase()] || null;
      }

      // 处理函数类型
      if (typeof type === 'function') {
        return type;
      }

      // 处理数组类型 [String]
      if (Array.isArray(type)) {
        return type[0] || null;
      }

      // 处理对象类型 { type: String }
      if (typeof type === 'object' && type.type) {
        return this.normalizeType(type.type);
      }

      return null;
    } catch (error) {
      console.warn('类型规范化失败:', error);
      return null;
    }
  },

  /**
   * 验证值是否符合类型要求
   * @param {*} value 要验证的值
   * @param {*} type 类型定义
   * @returns {boolean} 验证结果
   */
  validateValue(value, type) {
    if (!type || type === 'any') return true;

    const normalizedType = this.normalizeType(type);
    if (!normalizedType) return true;

    // 处理 null 和 undefined
    if (value === null || value === undefined) {
      return false;
    }

    // 处理基本类型
    if (normalizedType === String) return typeof value === 'string';
    if (normalizedType === Number) return typeof value === 'number' && !isNaN(value);
    if (normalizedType === Boolean) return typeof value === 'boolean';

    // 处理复杂类型
    return value instanceof normalizedType;
  }
};