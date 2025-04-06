/**
 * 性能统计工具模块
 * 用于计算测试性能指标
 */

/**
 * 计算性能统计数据
 * @param {Array<number>} times - 执行时间或数值数组
 * @returns {Object} 统计数据，包含平均值、最小值、最大值、中位数和95%分位数
 */
export function computePerformanceStats(times) {
  // 确保至少有一个样本
  if (!times || times.length === 0) return { avg: 0, min: 0, max: 0, median: 0, p95: 0 };

  // 使用单次遍历计算总和、最小值和最大值
  let sum = 0;
  let min = times[0];
  let max = times[0];
  
  for (let i = 0; i < times.length; i++) {
    const val = times[i];
    sum += val;
    min = val < min ? val : min;
    max = val > max ? val : max;
  }
  
  const avg = sum / times.length;
  
  // 对于中位数和p95值，需要排序
  if (times.length === 1) {
    return { avg, min, max, median: times[0], p95: times[0] };
  }
  
  // 创建排序副本，仅当需要计算分位数时
  const sortedTimes = [...times].sort((a, b) => a - b);
  
  // 计算中位数和95%分位数
  const medianIndex = Math.floor(times.length / 2);
  const p95Index = Math.min(Math.floor(times.length * 0.95), times.length - 1);
  
  return {
    avg,
    min,
    max,
    median: sortedTimes[medianIndex],
    p95: sortedTimes[p95Index]
  };
}

/**
 * 计算有效值的平均值 (跳过0或负值)
 * @param {Array<number>} values - 数值数组
 * @returns {number} 有效值的平均值
 */
export function computeValidAvg(values) {
  if (!values || values.length === 0) return 0;
  
  const validValues = values.filter(v => v > 0);
  if (validValues.length === 0) return 0;
  
  return validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
} 