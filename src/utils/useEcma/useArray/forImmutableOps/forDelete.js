/**
 * 数组不可变删除操作工具函数集合 - 函数式单参数风格
 * 所有函数不会修改原数组，而是返回新数组
 * 所有函数均为柯里化形式，便于函数组合
 */

/**
 * 删除指定索引的元素
 * @param {number} index - 要删除的索引
 * @returns {Function} 接收数组并返回新数组的函数
 */
export const 删除指定索引 = (index) => (arr) => {
  if (!Array.isArray(arr) || index < 0 || index >= arr.length) {
    return arr;
  }
  return [...arr.slice(0, index), ...arr.slice(index + 1)];
};

/**
 * 删除第一个匹配的元素
 * @param {any} item - 要删除的元素值
 * @returns {Function} 接收数组并返回新数组的函数
 */
export const 删除首个匹配 = (item) => (arr) => {
  if (!Array.isArray(arr)) return arr;
  const index = arr.indexOf(item);
  return index === -1 ? arr : 删除指定索引(index)(arr);
};

/**
 * 删除所有匹配的元素
 * @param {any} item - 要删除的元素值
 * @returns {Function} 接收数组并返回新数组的函数
 */
export const 删除所有匹配 = (item) => (arr) => {
  if (!Array.isArray(arr)) return arr;
  return arr.filter(element => element !== item);
};

/**
 * 删除指定范围的元素
 * @param {number} start - 起始索引（包含）
 * @returns {Function} 接收结束索引的函数
 */
export const 删除范围 = (start) => (end) => (arr) => {
  if (!Array.isArray(arr) || start < 0 || end > arr.length || start >= end) {
    return arr;
  }
  return [...arr.slice(0, start), ...arr.slice(end)];
};

/**
 * 删除数组第一个元素
 * @returns {Array} 新数组
 */
export const 删除首个元素 = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return arr;
  return arr.slice(1);
};

/**
 * 删除数组最后一个元素
 * @returns {Array} 新数组
 */
export const 删除末尾元素 = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return arr;
  return arr.slice(0, -1);
};

/**
 * 删除数组中的所有空值(null, undefined)
 * @returns {Array} 新数组
 */
export const 删除空值 = (arr) => {
  if (!Array.isArray(arr)) return arr;
  return arr.filter(item => item != null);
};

/**
 * 删除数组中的所有假值(false, 0, '', null, undefined, NaN)
 * @returns {Array} 新数组
 */
export const 删除假值 = (arr) => {
  if (!Array.isArray(arr)) return arr;
  return arr.filter(Boolean);
};

/**
 * 根据条件函数删除元素
 * @param {Function} predicate - 条件函数，返回true的元素将被删除
 * @returns {Function} 接收数组并返回新数组的函数
 */
export const 按条件删除 = (predicate) => (arr) => {
  if (!Array.isArray(arr) || typeof predicate !== 'function') return arr;
  return arr.filter(item => !predicate(item));
};

/**
 * 删除数组中的重复元素
 * @returns {Array} 新数组
 */
export const 删除重复项 = (arr) => {
  if (!Array.isArray(arr)) return arr;
  return [...new Set(arr)];
};

/**
 * 删除对象数组中指定属性值相同的对象
 * @param {string} key - 用于比较的属性名
 * @returns {Function} 接收数组并返回新数组的函数
 */
export const 按键删除重复项 = (key) => (arr) => {
  if (!Array.isArray(arr) || !key) return arr;
  const seen = new Set();
  return arr.filter(item => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

/**
 * 带缓存的按条件删除 - 使用WeakMap缓存结果
 * @param {Function} predicate - 条件函数
 * @returns {Function} 带缓存的过滤函数
 */
export const 带缓存按条件删除 = (predicate) => {
  const cache = new WeakMap();
  
  return (arr) => {
    if (!Array.isArray(arr) || typeof predicate !== 'function') return arr;
    
    // 如果缓存中有结果，直接返回
    if (cache.has(arr)) return cache.get(arr);
    
    // 计算新结果并缓存
    const result = arr.filter(item => !predicate(item));
    cache.set(arr, result);
    return result;
  };
};

/**
 * 高性能删除所有匹配 - 使用Map记录索引
 * @param {any} item - 要删除的元素值
 * @returns {Function} 接收数组并返回新数组的函数
 */
export const 高性能删除所有匹配 = (item) => (arr) => {
  if (!Array.isArray(arr)) return arr;
  
  // 使用Map记录所有不需要删除的元素的索引
  const keepIndices = new Map();
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== item) {
      keepIndices.set(i, arr[i]);
    }
  }
  
  // 如果没有元素需要删除，返回原数组
  if (keepIndices.size === arr.length) return arr;
  
  // 创建新数组，只包含需要保留的元素
  return Array.from(keepIndices.values());
};

/**
 * 带记忆功能的删除重复项
 * @returns {Function} 带缓存的函数
 */
export const 记忆化删除重复项 = (() => {
  const cache = new WeakMap();
  
  return (arr) => {
    if (!Array.isArray(arr)) return arr;
    
    // 如果缓存中有结果，直接返回
    if (cache.has(arr)) return cache.get(arr);
    
    const result = [...new Set(arr)];
    cache.set(arr, result);
    return result;
  };
})();

/**
 * 批量删除多个元素值 - 一次遍历完成
 * @param {Array} items - 要删除的元素值数组
 * @returns {Function} 接收数组并返回新数组的函数
 */
export const 批量删除多值 = (items) => (arr) => {
  if (!Array.isArray(arr) || !Array.isArray(items)) return arr;
  
  // 创建一个Set来存储要删除的元素，加速查找
  const itemSet = new Set(items);
  
  return arr.filter(element => !itemSet.has(element));
};

/**
 * 带索引映射的删除范围 - 适用于大范围删除
 * @param {number} start - 起始索引（包含）
 * @returns {Function} 接收结束索引的函数
 */
export const 索引映射删除范围 = (start) => (end) => (arr) => {
  if (!Array.isArray(arr) || start < 0 || end > arr.length || start >= end) {
    return arr;
  }
  
  // 对于较大范围删除，直接使用索引映射可能更高效
  const result = new Array(arr.length - (end - start));
  
  // 复制前半部分
  for (let i = 0; i < start; i++) {
    result[i] = arr[i];
  }
  
  // 复制后半部分
  for (let i = end; i < arr.length; i++) {
    result[i - (end - start)] = arr[i];
  }
  
  return result;
};
