/**
 * 响应式CRDT常量定义
 */

// YJS关联标识符
export const INTERNAL_SYMBOL = Symbol('__yjs_internal');

/**
 * 比较两个值是否相同
 * @param {any} a - 第一个值
 * @param {any} b - 第二个值
 * @returns {boolean} 是否相同
 */
export function areSame(a, b) {
  if (a === b) return true;
  
  // 如果都是对象但不相等，则尝试深度比较
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch (err) {
      // 如果包含循环引用等情况则无法比较，返回false
      return false;
    }
  }
  
  return false;
}

/**
 * 获取对象内部的Yjs引用
 * @param {Object} obj - 包含内部引用的对象
 * @returns {Y.AbstractType|null} Yjs引用
 */
export function getYjsValue(obj) {
  if (obj && typeof obj === 'object' && obj[INTERNAL_SYMBOL]) {
    return obj[INTERNAL_SYMBOL];
  }
  return null;
}

/**
 * 检查对象是否是CRDT支持的类型
 * @param {any} value - 要检查的值
 * @returns {boolean} 是否是CRDT类型
 */
export function isCrdtType(value) {
  return value && typeof value === 'object' && !!getYjsValue(value);
} 