/**
 * CRDT响应式核心 - 导出所有功能
 */

// 常量和工具
export { INTERNAL_SYMBOL, areSame, getYjsValue, isCrdtType } from './constants.js';

// 数据类型转换
export { valueToYjs, valueFromYjs, crdtValue } from './internal.js';

// 代理创建函数
export { createMapProxy } from './map.js';
export { hasArrayMethods, fixArrayMethods, createArrayProxy } from './array.js';
export { createTextProxy } from './text.js';

// 导出诊断工具
export { addDiagnostics, checkReactivity } from './diagnostics.js';

// 当前版本号
export const VERSION = '1.0.0';

// 映射处理
export { computeMapImplementation, createMap, isMap } from './map.js';

// 包装类
export { Box, isBox, unbox } from './boxed.js';

// 文本处理
export { createText, isTextProxy } from './text.js';

/**
 * 创建CRDT值 - 根据传入值类型选择合适的实现
 * @param {any} initialValue - 初始值
 * @returns {Object} CRDT值
 */
export function createCrdtValue(initialValue) {
  // 数组类型
  if (Array.isArray(initialValue)) {
    return createArrayProxy(initialValue);
  }
  
  // 对象类型
  if (initialValue && typeof initialValue === 'object' && !isBox(initialValue)) {
    return createMapProxy(initialValue);
  }
  
  // 字符串类型
  if (typeof initialValue === 'string') {
    return createText(initialValue);
  }
  
  // 其它原始类型
  return Box(initialValue);
} 