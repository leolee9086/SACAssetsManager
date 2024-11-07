import { utils } from './utils.js';
import { ValidationError } from './types.js';

/**
 * 规范化输入配置
 * @param {Array|Object} inputs - 原始输入配置
 * @returns {Object} 规范化后的输入配置对象
 * @example
 * // 支持数组格式
 * normalizeInputs(['input1', { name: 'input2', type: 'number' }])
 * // 支持对象格式
 * normalizeInputs({ input1: { type: 'string' } })
 */
export function normalizeInputs(inputs) {
  if (!inputs) return {};
  
  // 如果已经是对象格式，直接返回
  if (!Array.isArray(inputs) && typeof inputs === 'object') {
    return inputs;
  }

  // 处理数组格式的输入配置
  return Array.isArray(inputs) ? inputs.reduce((accumulator, input) => {
    // 处理字符串格式的输入
    if (typeof input === 'string') {
      accumulator[input] = { 
        type: 'any',
        required: false,
        description: ''
      };
    }
    // 处理对象格式的输入
    else if (input && typeof input === 'object') {
      const name = input.name || input.id;
      if (name) {
        accumulator[name] = {
          type: input.type || 'any',
          required: !!input.required,
          default: input.default,
          validator: input.validator,
          description: input.description || '',
          // 添加额外的元数据
          meta: input.meta || {}
        };
      }
    }
    return accumulator;
  }, {}) : {};
}

/**
 * 规范化输出配置
 * @param {Array|Object} outputs - 原始输出配置
 * @returns {Object} 规范化后的输出配置对象
 */
export function normalizeOutputs(outputs) {
  if (!outputs) return {};
  
  if (!Array.isArray(outputs) && typeof outputs === 'object') {
    return outputs;
  }

  return Array.isArray(outputs) ? outputs.reduce((accumulator, output) => {
    if (typeof output === 'string') {
      accumulator[output] = {
        type: 'any',
        description: ''
      };
    }
    else if (output && typeof output === 'object') {
      const name = output.name || output.id;
      if (name) {
        accumulator[name] = {
          type: output.type || 'any',
          description: output.description || '',
          meta: output.meta || {}
        };
      }
    }
    return accumulator;
  }, {}) : {};
}
/**
 * 用于校验一个卡片节点的输入定义是否与它的显示组件的属性定义是否兼容
 * @param {Object|Array} props 组件的属性定义
 * @param {Object|Array} inputs 节点的输入定义
 * @param {String} componentName 组件名称
 * @returns {Object} 校验结果
 */
export function checkInputs(props, inputs, componentName) {
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
        console.warn(
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
export function checkOutputs(emits, outputs, componentName) {
    try {
      // 标准化 outputs
      const outputsObj = normalizeOutputs(outputs);
  
      // 转换为数组形式用于后续处理
      const outputsArray = Object.entries(outputsObj).map(([name, def]) => ({
        name,
        type: def.type || 'any',
        description: def.description || '',
        validator: def.validator,
        side:def.side
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
 * 验证单个值是否符合类型定义
 * @param {any} value - 要验证的值
 * @param {Object} definition - 值的定义
 * @param {string} name - 值的名称（用于错误信息）
 * @returns {boolean} 验证是否通过
 * @throws {ValidationError} 当验证失败时抛出错误
 */
export function validateValueFromDefinition(value, definition, name) {
  try {
    // 检查必填
    if (definition.required && (value === undefined || value === null)) {
      throw new ValidationError(
        `${name} 是必填项`,
        { field: name, type: 'required' }
      );
    }

    // 如果值为空且非必填，直接返回true
    if (value === undefined || value === null) {
      return true;
    }

    // 类型检查
    if (definition.type && !utils.validateValue(value, definition.type)) {
      throw new ValidationError(
        `${name} 的类型不匹配`,
        { field: name, type: 'typeError', expected: definition.type, actual: typeof value }
      );
    }

    // 自定义验证
    if (definition.validator && !definition.validator(value)) {
      throw new ValidationError(
        `${name} 未通过自定义验证`,
        { field: name, type: 'customValidation' }
      );
    }

    return true;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(
      `验证 ${name} 时发生错误: ${error.message}`,
      { field: name, type: 'validationError', originalError: error }
    );
  }
}
