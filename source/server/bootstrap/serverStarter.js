import { 设置DLL路径 } from '../../../src/toolBox/base/useElectron/forCSharp/useCSharpLoader.js'
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
 * 启动API服务
 */
import '../api/apiService.js'

/**
 * 开始索引队列
 */
import '../indexer.js'

/**
 * 服务器启动器
 * 负责协调服务器启动过程
 */

import { 日志 } from '../../../src/toolBox/base/useEcma/forLogs/useLogger.js';
import { initConfig } from '../config/index.js';
import { versionInfo } from './main.js';

/**
 * 启动服务器
 * @param {Object} options - 启动选项
 * @param {Object} [options.siyuanConfig] - 思源笔记配置
 * @param {Object} [options.serverConfig] - 服务器配置
 * @param {Object} [options.servicesConfig] - 服务配置
 * @param {Object} [options.electron] - Electron对象
 * @returns {Promise<void>}
 */
export const startServer = async (options = {}) => {
  try {
    日志.信息(`启动SACAssetsManager服务器 v${versionInfo.version}`, 'Server');
    
    // 初始化配置
    日志.信息('加载配置...', 'Server');
    await initConfig(options.siyuanConfig, {
      server: options.serverConfig,
      services: options.servicesConfig
    });
    
    // 导入初始化模块并启动
    日志.信息('执行初始化流程...', 'Server');
    const { initialize } = await import('./initializer.js');
    await initialize();
    
    // 发送准备就绪消息
    if (window.channel) {
      window.channel.postMessage('serverReady');
      日志.信息('已发送服务器就绪通知', 'Server');
    }
    
    return true;
  } catch (error) {
    日志.错误(`服务器启动失败: ${error.message}`, 'Server');
    console.error('启动错误详情:', error);
    return false;
  }
};

/**
 * 停止服务器
 * @returns {Promise<void>}
 */
export const stopServer = async () => {
  try {
    日志.信息('停止服务器...', 'Server');
    
    // 导入初始化模块并关闭
    const { shutdown } = await import('./initializer.js');
    await shutdown();
    
    return true;
  } catch (error) {
    日志.错误(`服务器停止失败: ${error.message}`, 'Server');
    console.error('停止错误详情:', error);
    return false;
  }
};

/**
 * 重启服务器
 * @param {Object} options - 重启选项
 * @returns {Promise<boolean>} 是否成功重启
 */
export const restartServer = async (options = {}) => {
  try {
    日志.信息('重启服务器...', 'Server');
    
    await stopServer();
    await startServer(options);
    
    日志.信息('服务器已重启', 'Server');
    return true;
  } catch (error) {
    日志.错误(`服务器重启失败: ${error.message}`, 'Server');
    console.error('重启错误详情:', error);
    return false;
  }
}; 