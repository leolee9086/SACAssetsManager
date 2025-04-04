import { addMethodWithMetadata } from "../object/addMethod.js";

/**
 * 类型转换工具模块
 * 使用方法:
 * import { string, number, boolean, array } from './converters'
 * 
 * string.toNumber('123') // 123
 * number.toString(456) // '456'
 */

// 分别导出各个转换器命名空间
export const string = {};
export const number = {};
export const boolean = {};
export const array = {};

// string 转换器
addMethodWithMetadata(string, 'toNumber', 
  value => Number(value),
  {
    description: '将字符串转换为数字',
    inputType: 'string',
    outputType: 'number',
    example: "string.toNumber('123') // 123"
  }
);

addMethodWithMetadata(string, 'toBoolean',
  value => value === 'true',
  {
    description: '将字符串转换为布尔值',
    inputType: 'string',
    outputType: 'boolean',
    example: "string.toBoolean('true') // true"
  }
);

addMethodWithMetadata(string, 'toArray',
  value => JSON.parse(value),
  {
    description: '将JSON字符串转换为数组',
    inputType: 'string',
    outputType: 'array',
    example: "string.toArray('[1,2,3]') // [1,2,3]"
  }
);

// number 转换器
addMethodWithMetadata(number, 'toString',
  value => String(value),
  {
    description: '将数字转换为字符串',
    inputType: 'number',
    outputType: 'string',
    example: "number.toString(123) // '123'"
  }
);

// boolean 转换器
addMethodWithMetadata(boolean, 'toString',
  value => value.toString(),
  {
    description: '将布尔值转换为字符串',
    inputType: 'boolean',
    outputType: 'string',
    example: "boolean.toString(true) // 'true'"
  }
);

// array 转换器
addMethodWithMetadata(array, 'toString',
  value => JSON.stringify(value),
  {
    description: '将数组转换为JSON字符串',
    inputType: 'array',
    outputType: 'string',
    example: "array.toString([1,2,3]) // '[1,2,3]'"
  }
);

// 为了保持向后兼容性
export const converters = {
  'string-number': string.toNumber,
  'number-string': number.toString,
  'string-boolean': string.toBoolean,
  'boolean-string': boolean.toString,
  'string-array': string.toArray,
  'array-string': array.toString
};

/**
 * 类型转换函数
 * @param {*} value 要转换的值
 * @param {string} fromType 源类型
 * @param {string} toType 目标类型
 * @returns {*} 转换后的值
 */
export function 显式类型转换(value, fromType, toType) {
    // 如果类型相同,直接返回
    if (fromType === toType) return value;
    
    // 获取转换器key
    const converterKey = `${fromType}-${toType}`;
    const converter = converters[converterKey];
    
    if (!converter) {
      console.warn(`No converter found for ${converterKey}`);
      return value;
    }
    
    try {
      return converter(value);
    } catch (error) {
      console.error(`Error converting ${fromType} to ${toType}:`, error);
      return value;
    }
  }
  
  