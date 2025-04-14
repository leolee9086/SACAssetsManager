/**
 * @deprecated 此模块已迁移至 src/toolBox/base/useEcma/performance.js
 * 请使用新模块中的函数以获得更完整的功能
 */

// 导入新的实现
import { withPerformanceLogging, measureExecutionTime, comparePerformance } from '../../../src/toolBox/base/useEcma/performance.js';

// 兼容性导出，保留原有接口
export { withPerformanceLogging };

// 向后兼容的Map（不鼓励直接使用）
const functionPerformance = new Map();

// 记录废弃警告
console.warn('performanceRun.js 已废弃，请使用 src/toolBox/base/useEcma/performance.js');

// 保持原始实现可用
const originalWithPerformanceLogging = withPerformanceLogging;

export function withPerformanceLogging(fn) {
  return function(...args) {
    const start = performance.now();
    let result = fn(...args);
    
    const endPerformanceLog = () => {
      const end = performance.now();
      const executionTime = (end - start).toFixed(2);
      functionPerformance.set(fn, executionTime);
      console.log(`Function ${fn.name || 'anonymous'} took ${executionTime} milliseconds.n/${(new Error()).stack}`);
    };
    if (result instanceof Promise) {
      // 处理异步函数
      return result.then(res => {
        endPerformanceLog();
        return res;
      }).catch(err => {
        endPerformanceLog();
        throw err; // 继续抛出错误，以便调用者可以处理它
      });
    } else {
      // 处理同步函数
      endPerformanceLog();
      return result;
    }
  };
}