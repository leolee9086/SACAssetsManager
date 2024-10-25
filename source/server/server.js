const maxLogLength = 10000; // 设置最大日志长度
let logCount = 0;

// 重写 console.log 方法
const originalConsoleLog = console.log;
console.log = function(...args) {
    // 增加日志计数
    logCount++;

    // 检查日志长度
    if (logCount > maxLogLength) {
        console.clear(); // 清空控制台
        logCount = 0; // 重置日志计数
        originalConsoleLog('控制台已清空');
    }

    // 调用原始的 console.log 方法
    originalConsoleLog.apply(console, args);
};
/**
 * 一个web服务器,用于查看文件服务
 */
import './apiService.js'

/**
 * 开始索引队列
 */
import './indexer.js'
/**
 * 实现自定义的原生拖拽事件
 */
//import './nativeDrag.js'