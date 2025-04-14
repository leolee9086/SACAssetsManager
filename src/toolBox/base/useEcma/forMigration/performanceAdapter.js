/**
 * 性能工具适配器
 * 为现有代码提供从旧的performanceRun.js到新的performance.js的迁移路径
 */

// 从新模块导入所有功能
import {
  withPerformanceLogging,
  withPerformance,
  measureExecutionTime,
  measure,
  getPerformanceStats,
  clearPerformanceStats,
  comparePerformance,
  performanceTimer
} from '../performance.js';

// 提供与原模块相同的主要导出
export { withPerformanceLogging };

// 向后兼容别名导出
export const withPerformance = withPerformanceLogging;

// 导出所有其他新功能，使这个适配器成为完整的替代品
export {
  measureExecutionTime,
  measure,
  getPerformanceStats,
  clearPerformanceStats,
  comparePerformance,
  performanceTimer
};

/**
 * 迁移指南:
 * 
 * 1. 将导入语句从:
 *    import { withPerformanceLogging } from "path/to/performanceRun.js";
 *    更改为:
 *    import { withPerformanceLogging } from "path/to/performanceAdapter.js";
 * 
 * 2. 一旦适应了新API，可以直接从主模块导入:
 *    import { withPerformanceLogging, comparePerformance } from "../useEcma/performance.js";
 * 
 * 此适配器可确保平滑过渡，无需一次性更改所有代码
 */

console.info('正在使用性能工具适配器 - 建议直接迁移到 performance.js'); 