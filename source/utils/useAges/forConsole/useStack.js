import { addStackTrace,getCallerLocation } from "../../useEcma/forConsole/useStack.js";
/**
 * 重写控制台日志函数，添加调用位置
 */
export function enhanceConsoleLog() {
    const maxLogLength = 10000;
    let logCount = 0;
    const originalConsoleLog = console.log;
    
    console.log = function(...args) {
        // 增加日志计数
        logCount++;

        // 检查日志长度
        if (logCount > maxLogLength) {
            console.clear();
            logCount = 0;
            originalConsoleLog('控制台已清空');
        }

        // 获取调用位置
        const callerInfo = getCallerLocation();
        
        // 在日志前添加调用位置
        const newArgs = [`[${callerInfo}]`, ...args];
        
        // 调用原始的 console.log 方法
        originalConsoleLog.apply(console, newArgs);
    };
    
    return function reset() {
        console.log = originalConsoleLog;
    };
}
