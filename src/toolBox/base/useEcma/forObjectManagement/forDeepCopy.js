/**
 * @fileoverview 深拷贝和对象合并工具函数
 * 提供高性能的对象深拷贝和合并功能
 */

/**
 * 判断是否为对象
 * @param {*} item - 要判断的数据项
 * @returns {boolean} 是否为对象
 */
const 是对象 = (item) => {
  return (item && typeof item === 'object' && !Array.isArray(item));
};

/**
 * 深拷贝对象或数组
 * @param {Object|Array} source - 源对象或数组
 * @returns {Object|Array} 拷贝后的新对象或数组
 */
export function 深拷贝(source) {
  // 处理基本类型、null和undefined
  if (source === null || source === undefined || typeof source !== 'object') {
    return source;
  }
  
  // 处理日期对象
  if (source instanceof Date) {
    return new Date(source.getTime());
  }
  
  // 处理正则表达式
  if (source instanceof RegExp) {
    return new RegExp(source);
  }
  
  // 处理数组
  if (Array.isArray(source)) {
    return source.map(item => 深拷贝(item));
  }
  
  // 处理普通对象
  const copy = {};
  Object.keys(source).forEach(key => {
    copy[key] = 深拷贝(source[key]);
  });
  
  return copy;
}

/**
 * 深度合并对象
 * @param {Object} target - 目标对象
 * @param {...Object} sources - 源对象，可以有多个
 * @returns {Object} 合并后的对象
 */
export function 深度合并(target, ...sources) {
  if (!sources.length) return target;
  
  const source = sources.shift();
  
  if (是对象(target) && 是对象(source)) {
    Object.keys(source).forEach(key => {
      if (是对象(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        深度合并(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    });
  }
  
  return 深度合并(target, ...sources);
}

/**
 * 扁平化对象（支持自定义分隔符）
 * @param {Object} obj - 要扁平化的对象
 * @param {string} [separator='.'] - 键名分隔符
 * @param {string} [prefix=''] - 前缀
 * @returns {Object} 扁平化后的对象
 */
export function 扁平化对象(obj, separator = '.', prefix = '') {
  return Object.keys(obj).reduce((acc, key) => {
    const newKey = prefix ? `${prefix}${separator}${key}` : key;
    
    if (是对象(obj[key]) && Object.keys(obj[key]).length > 0) {
      Object.assign(acc, 扁平化对象(obj[key], separator, newKey));
    } else {
      acc[newKey] = obj[key];
    }
    
    return acc;
  }, {});
}

/**
 * 从扁平化对象还原嵌套对象
 * @param {Object} obj - 扁平化后的对象
 * @param {string} [separator='.'] - 键名分隔符
 * @returns {Object} 还原后的嵌套对象
 */
export function 还原嵌套对象(obj, separator = '.') {
  const result = {};
  
  Object.keys(obj).forEach(key => {
    if (key.includes(separator)) {
      const keyPath = key.split(separator);
      let current = result;
      
      keyPath.forEach((part, index) => {
        if (index === keyPath.length - 1) {
          current[part] = obj[key];
        } else {
          current[part] = current[part] || {};
          current = current[part];
        }
      });
    } else {
      result[key] = obj[key];
    }
  });
  
  return result;
}

/**
 * 比较两个对象的差异
 * @param {Object} obj1 - 对象1
 * @param {Object} obj2 - 对象2
 * @returns {Object} 包含差异的对象
 */
export function 对象差异(obj1, obj2) {
  if (!是对象(obj1) || !是对象(obj2)) {
    return obj1 === obj2 ? undefined : obj2;
  }
  
  const diff = {};
  const allKeys = [...new Set([...Object.keys(obj1), ...Object.keys(obj2)])];
  
  allKeys.forEach(key => {
    // 如果key只在obj2中存在
    if (!(key in obj1)) {
      diff[key] = obj2[key];
    } 
    // 如果key在两个对象中都存在
    else if (key in obj2) {
      // 如果两者都是对象，递归比较
      if (是对象(obj1[key]) && 是对象(obj2[key])) {
        const nestedDiff = 对象差异(obj1[key], obj2[key]);
        if (nestedDiff && Object.keys(nestedDiff).length > 0) {
          diff[key] = nestedDiff;
        }
      } 
      // 基本类型或数组直接比较
      else if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
        diff[key] = obj2[key];
      }
    }
    // 如果key只在obj1中存在，不添加到差异中
  });
  
  return Object.keys(diff).length > 0 ? diff : undefined;
}

/**
 * 安全获取对象嵌套属性值
 * @param {Object} obj - 要获取值的对象
 * @param {string|string[]} path - 属性路径，可以是字符串或字符串数组
 * @param {*} defaultValue - 默认值，如果路径不存在则返回此值
 * @returns {*} 获取到的值或默认值
 */
export function 安全获取(obj, path, defaultValue = undefined) {
  const keys = Array.isArray(path) ? path : path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result === null || result === undefined || typeof result !== 'object') {
      return defaultValue;
    }
    result = result[key];
    if (result === undefined) {
      return defaultValue;
    }
  }
  
  return result;
}

/**
 * 安全设置对象嵌套属性值
 * @param {Object} obj - 要设置值的对象
 * @param {string|string[]} path - 属性路径，可以是字符串或字符串数组
 * @param {*} value - 要设置的值
 * @returns {Object} 设置后的对象
 */
export function 安全设置(obj, path, value) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const keys = Array.isArray(path) ? path : path.split('.');
  const target = 深拷贝(obj);
  let current = target;
  
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    
    // 如果是最后一个键，则设置值
    if (i === keys.length - 1) {
      current[key] = value;
    } else {
      // 如果中间路径不存在或不是对象，则创建一个空对象
      if (current[key] === undefined || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
  }
  
  return target;
}

// 添加英文别名以提高兼容性
export const deepCopy = 深拷贝;
export const deepMerge = 深度合并;
export const flattenObject = 扁平化对象;
export const unflattenObject = 还原嵌套对象;
export const objectDiff = 对象差异;
export const safeGet = 安全获取;
export const safeSet = 安全设置;

// 默认导出
export default {
  深拷贝,
  深度合并,
  扁平化对象,
  还原嵌套对象,
  对象差异,
  安全获取,
  安全设置,
  deepCopy,
  deepMerge,
  flattenObject,
  unflattenObject,
  objectDiff,
  safeGet,
  safeSet
}; 