/**
 * 性能测量与记录工具集
 * 用于函数性能监控、执行时间测量和性能分析
 */

// 存储函数性能记录的Map
const functionPerformance = new Map();

/**
 * 包装函数以记录其执行性能
 * @param {Function} fn - 需要记录性能的函数
 * @returns {Function} 包装后的函数，执行相同功能但会记录性能数据
 */
export function withPerformanceLogging(fn) {
  return function(...args) {
    const start = performance.now();
    let result = fn(...args);
    
    const endPerformanceLog = () => {
      const end = performance.now();
      const executionTime = (end - start).toFixed(2);
      
      // 保存或更新函数性能数据
      if (functionPerformance.has(fn)) {
        const existingData = functionPerformance.get(fn);
        existingData.count += 1;
        existingData.totalTime += parseFloat(executionTime);
        existingData.averageTime = (existingData.totalTime / existingData.count).toFixed(2);
        existingData.lastTime = parseFloat(executionTime);
        
        if (parseFloat(executionTime) < existingData.minTime) {
          existingData.minTime = parseFloat(executionTime);
        }
        
        if (parseFloat(executionTime) > existingData.maxTime) {
          existingData.maxTime = parseFloat(executionTime);
        }
      } else {
        functionPerformance.set(fn, {
          name: fn.name || 'anonymous',
          count: 1,
          totalTime: parseFloat(executionTime),
          averageTime: executionTime,
          minTime: parseFloat(executionTime),
          maxTime: parseFloat(executionTime),
          lastTime: parseFloat(executionTime)
        });
      }
      
      console.log(`函数 ${fn.name || 'anonymous'} 执行耗时 ${executionTime} 毫秒`);
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

/**
 * 测量函数执行时间
 * @param {Function} fn - 要测量的函数
 * @param {Array} args - 函数参数
 * @returns {Object} 包含执行结果和执行时间的对象
 */
export function measureExecutionTime(fn, ...args) {
  const start = performance.now();
  let result;
  
  try {
    result = fn(...args);
    const end = performance.now();
    const executionTime = (end - start).toFixed(2);
    
    return {
      result,
      executionTime: parseFloat(executionTime),
      success: true
    };
  } catch (error) {
    const end = performance.now();
    const executionTime = (end - start).toFixed(2);
    
    return {
      error,
      executionTime: parseFloat(executionTime),
      success: false
    };
  }
}

/**
 * 获取函数性能统计数据
 * @param {Function} [fn] - 特定函数（可选）
 * @returns {Object|Map} 函数性能数据或全部性能数据Map
 */
export function getPerformanceStats(fn) {
  if (fn) {
    return functionPerformance.get(fn);
  }
  return functionPerformance;
}

/**
 * 清除性能统计数据
 * @param {Function} [fn] - 特定函数（可选）
 */
export function clearPerformanceStats(fn) {
  if (fn) {
    functionPerformance.delete(fn);
  } else {
    functionPerformance.clear();
  }
}

/**
 * 比较多个函数性能
 * @param {Object} config - 比较配置
 * @param {Array<Function>} config.functions - 函数数组
 * @param {Array} config.args - 函数参数
 * @param {number} config.iterations - 迭代次数（默认：100）
 * @returns {Array<Object>} 性能比较结果数组
 */
export function comparePerformance({ functions, args, iterations = 100 }) {
  const results = [];
  
  for (const fn of functions) {
    const name = fn.name || 'anonymous';
    let totalTime = 0;
    let minTime = Infinity;
    let maxTime = 0;
    
    for (let i = 0; i < iterations; i++) {
      const { executionTime } = measureExecutionTime(fn, ...args);
      totalTime += executionTime;
      
      if (executionTime < minTime) {
        minTime = executionTime;
      }
      
      if (executionTime > maxTime) {
        maxTime = executionTime;
      }
    }
    
    results.push({
      name,
      averageTime: (totalTime / iterations).toFixed(2),
      minTime: minTime.toFixed(2),
      maxTime: maxTime.toFixed(2),
      totalTime: totalTime.toFixed(2),
      iterations
    });
  }
  
  // 按平均执行时间升序排序
  return results.sort((a, b) => parseFloat(a.averageTime) - parseFloat(b.averageTime));
}

// 性能计时器，用于手动测量代码块性能
export const performanceTimer = {
  timers: {},
  
  /**
   * 开始计时
   * @param {string} label - 计时器标签
   */
  start(label) {
    this.timers[label] = performance.now();
  },
  
  /**
   * 结束计时并返回耗时
   * @param {string} label - 计时器标签
   * @param {boolean} [log=true] - 是否输出日志
   * @returns {number} 执行耗时（毫秒）
   */
  end(label, log = true) {
    if (!this.timers[label]) {
      console.warn(`计时器 "${label}" 未启动`);
      return 0;
    }
    
    const endTime = performance.now();
    const startTime = this.timers[label];
    const duration = (endTime - startTime).toFixed(2);
    
    if (log) {
      console.log(`计时器 "${label}" 执行耗时: ${duration} 毫秒`);
    }
    
    delete this.timers[label];
    return parseFloat(duration);
  }
};

// 向后兼容导出
export { 
  withPerformanceLogging as withPerformance,
  measureExecutionTime as measure
}; 