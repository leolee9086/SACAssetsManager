
import { 设置DLL路径 } from '../../src/toolBox/base/useElectron/forCSharp/useCSharpLoader.js'
await 设置DLL路径()

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

    // 获取调用堆栈
    const stack = new Error().stack;
    // 解析调用位置 (通常在堆栈的第三行)
    const stackLines = stack.split('\n');
    let callerInfo = '未知位置';
    
    if (stackLines.length >= 3) {
        // 提取调用位置信息
        const callerLine = stackLines[2].trim();
        // 提取文件路径和行号
        const matches = callerLine.match(/at\s+(.+?)(?:\s+\((.+?):(\d+):(\d+)\)|:(\d+):(\d+))/);
        if (matches) {
            const file = matches[2] || callerLine.split(':')[0].replace('at ', '');
            const line = matches[3] || matches[5];
            const column = matches[4] || matches[6];
            callerInfo = `${file}:${line}:${column}`;
        }
    }

    // 在日志前添加调用位置
    const newArgs = [`[${callerInfo}]`, ...args];
    
    // 调用原始的 console.log 方法
    originalConsoleLog.apply(console, newArgs);
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