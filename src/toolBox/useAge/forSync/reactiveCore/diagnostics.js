/**
 * 响应式诊断工具
 * 用于检测响应式代理是否正确工作
 */

import { INTERNAL_SYMBOL } from './constants.js';

/**
 * 检查对象的响应式状态
 * @param {Object} obj - 要检查的对象
 * @param {string} path - 当前属性路径
 * @param {Set} visited - 已访问的对象，用于避免循环引用
 * @returns {Object} 检查结果
 */
export function checkReactivity(obj, path = '', visited = new Set()) {
  const result = {
    path,
    isReactive: false,
    hasCRDT: false,
    type: typeof obj,
    children: [],
    issues: []
  };
  
  // 基本类型检查
  if (obj === null || obj === undefined) {
    result.type = obj === null ? 'null' : 'undefined';
    return result;
  }
  
  if (typeof obj !== 'object') {
    return result;
  }
  
  // 防止循环引用
  if (visited.has(obj)) {
    result.issues.push('循环引用');
    return result;
  }
  visited.add(obj);
  
  // 检查是否有CRDT内部标记
  result.hasCRDT = INTERNAL_SYMBOL in obj;
  
  // 检查是否是Vue响应式对象
  try {
    // Vue响应式对象通常有__v_isRef或__v_reactive等标记
    const hasVueReactiveFlag = obj.__v_isRef || obj.__v_reactive || obj.__v_isReactive;
    result.isReactive = !!hasVueReactiveFlag;
    
    // 如果没有Vue标记但有CRDT标记，我们认为它是响应式的
    if (!result.isReactive && result.hasCRDT) {
      result.isReactive = true;
    }
  } catch (err) {
    result.issues.push(`检查响应式标记出错: ${err.message}`);
  }
  
  // 数组特殊检查
  if (Array.isArray(obj)) {
    result.type = 'array';
    result.length = obj.length;
    
    // 检查数组方法
    const arrayMethods = ['forEach', 'map', 'filter', 'slice', 'find', 'push', 'pop'];
    const missingMethods = arrayMethods.filter(method => typeof obj[method] !== 'function');
    
    if (missingMethods.length > 0) {
      result.issues.push(`缺少数组方法: ${missingMethods.join(', ')}`);
    }
    
    // 检查前5个元素
    for (let i = 0; i < Math.min(obj.length, 5); i++) {
      const childPath = `${path}[${i}]`;
      const item = obj[i];
      
      if (item && typeof item === 'object') {
        const childResult = checkReactivity(item, childPath, new Set(visited));
        result.children.push(childResult);
        
        if (!childResult.isReactive && typeof item === 'object' && item !== null) {
          result.issues.push(`数组项 ${i} 不是响应式的`);
        }
      }
    }
  } 
  // 对象检查
  else {
    result.type = 'object';
    result.keys = Object.keys(obj);
    
    // 检查重要属性的响应式状态
    for (const key of result.keys) {
      if (key.startsWith('$') || typeof obj[key] === 'function') continue;
      
      const value = obj[key];
      const childPath = path ? `${path}.${key}` : key;
      
      if (value && typeof value === 'object') {
        const childResult = checkReactivity(value, childPath, new Set(visited));
        result.children.push(childResult);
        
        if (!childResult.isReactive && typeof value === 'object' && value !== null) {
          result.issues.push(`属性 ${key} 不是响应式的`);
        }
      }
    }
  }
  
  return result;
}

/**
 * 打印响应式检查结果
 * @param {Object} result - checkReactivity的结果
 * @param {number} indent - 缩进级别
 */
export function printReactivityReport(result, indent = 0) {
  const prefix = ' '.repeat(indent * 2);
  const statusMarker = result.isReactive ? '✓' : '✗';
  const crdtMarker = result.hasCRDT ? 'CRDT' : '';
  
  console.log(`${prefix}${statusMarker} ${result.path || '根对象'} [${result.type}] ${crdtMarker}`);
  
  if (result.issues.length > 0) {
    result.issues.forEach(issue => {
      console.warn(`${prefix}  ! ${issue}`);
    });
  }
  
  result.children.forEach(child => {
    printReactivityReport(child, indent + 1);
  });
}

/**
 * 诊断响应式对象并输出报告
 * @param {Object} obj - 响应式对象
 * @returns {Object} 诊断结果
 */
export function diagnoseReactivity(obj) {
  console.log('开始响应式诊断...');
  const result = checkReactivity(obj);
  
  console.log('========= 响应式诊断报告 =========');
  printReactivityReport(result);
  console.log('==================================');
  
  // 汇总问题
  const allIssues = [];
  
  function collectIssues(node) {
    if (node.issues.length > 0) {
      node.issues.forEach(issue => {
        allIssues.push(`${node.path || '根对象'}: ${issue}`);
      });
    }
    
    node.children.forEach(collectIssues);
  }
  
  collectIssues(result);
  
  if (allIssues.length > 0) {
    console.warn(`检测到 ${allIssues.length} 个响应式问题`);
  } else {
    console.log('未检测到响应式问题');
  }
  
  return {
    hasIssues: allIssues.length > 0,
    issues: allIssues,
    report: result
  };
}

/**
 * 为 useSyncedReactive 对象添加诊断方法
 * @param {Object} reactiveObj - useSyncedReactive 返回的对象
 */
export function addDiagnostics(reactiveObj) {
  if (!reactiveObj || typeof reactiveObj !== 'object') return;
  
  Object.defineProperty(reactiveObj, '$diagnose', {
    value: function() {
      return diagnoseReactivity(this);
    },
    enumerable: false,
    configurable: true
  });
} 