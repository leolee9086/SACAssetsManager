/**
 * 巨型数组不可变删除操作工具函数集合
 * 专用于处理大规模数组的高效操作
 * 所有函数不会修改原数组，而是返回新数组或可迭代对象
 */

/**
 * 分块删除指定元素
 * 将大数组分成小块处理，降低单次内存使用
 * @param {any} item - 要删除的元素值
 * @param {number} chunkSize - 分块大小，默认10000
 * @returns {Function} 接收数组并返回新数组的函数
 */
export const 分块删除元素 = (item, chunkSize = 10000) => (arr) => {
  if (!Array.isArray(arr)) return arr;
  if (arr.length < chunkSize) {
    return arr.filter(element => element !== item);
  }
  
  const result = [];
  const totalChunks = Math.ceil(arr.length / chunkSize);
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, arr.length);
    const chunk = arr.slice(start, end);
    result.push(...chunk.filter(element => element !== item));
  }
  
  return result;
};

/**
 * 惰性删除 - 返回迭代器而不是实际创建数组
 * @param {Function} predicate - 条件函数，返回true的元素将被删除
 * @returns {Function} 返回一个生成迭代器的函数
 */
export const 惰性按条件删除 = (predicate) => (arr) => {
  if (!Array.isArray(arr) || typeof predicate !== 'function') return arr;
  
  return function* () {
    for (let i = 0; i < arr.length; i++) {
      if (!predicate(arr[i])) {
        yield arr[i];
      }
    }
  };
};

/**
 * 异步分块删除 - 不阻塞主线程
 * @param {any} item - 要删除的元素值
 * @param {number} chunkSize - 分块大小，默认5000
 * @returns {Function} 返回Promise的函数
 */
export const 异步删除元素 = (item, chunkSize = 5000) => async (arr) => {
  if (!Array.isArray(arr)) return arr;
  if (arr.length < chunkSize) {
    return arr.filter(element => element !== item);
  }
  
  const result = [];
  const totalChunks = Math.ceil(arr.length / chunkSize);
  
  for (let i = 0; i < totalChunks; i++) {
    // 使用setTimeout让出主线程
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, arr.length);
    const chunk = arr.slice(start, end);
    result.push(...chunk.filter(element => element !== item));
  }
  
  return result;
};

/**
 * 流式处理删除重复项
 * 使用Set逐步处理，适合非常大的数组
 * @param {number} chunkSize - 分块大小，默认10000
 * @returns {Function} 接收数组并返回新数组的函数
 */
export const 流式删除重复项 = (chunkSize = 10000) => (arr) => {
  if (!Array.isArray(arr)) return arr;
  if (arr.length < chunkSize) {
    return [...new Set(arr)];
  }
  
  const seen = new Set();
  const result = [];
  const totalChunks = Math.ceil(arr.length / chunkSize);
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, arr.length);
    
    for (let j = start; j < end; j++) {
      const item = arr[j];
      if (!seen.has(item)) {
        seen.add(item);
        result.push(item);
      }
    }
  }
  
  return result;
};

/**
 * 索引快速映射删除 - 使用Int32Array存储索引映射
 * 适用于大量索引重新映射的场景
 * @param {Function} predicate - 条件函数，返回true的元素将被删除
 * @returns {Function} 接收数组并返回新数组的函数
 */
export const 索引映射删除 = (predicate) => (arr) => {
  if (!Array.isArray(arr) || typeof predicate !== 'function') return arr;
  
  // 先计算保留哪些索引
  const keepIndices = [];
  for (let i = 0; i < arr.length; i++) {
    if (!predicate(arr[i])) {
      keepIndices.push(i);
    }
  }
  
  // 如果没有删除任何元素，返回原数组
  if (keepIndices.length === arr.length) return arr;
  
  // 如果全部删除，返回空数组
  if (keepIndices.length === 0) return [];
  
  // 创建新数组并填充
  const result = new Array(keepIndices.length);
  for (let i = 0; i < keepIndices.length; i++) {
    result[i] = arr[keepIndices[i]];
  }
  
  return result;
};
