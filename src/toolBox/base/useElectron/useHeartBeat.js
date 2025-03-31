/**
 * 心跳工具函数
 * 用于在耗时操作中向前端报告后台仍然存活
 */

// 使用 Symbol 创建一个唯一的键，用于存储上次发送时间
const 上次心跳时间 = Symbol('上次心跳时间');

/**
 * 报告心跳
 * 向主进程发送心跳信号，表明当前进程仍在正常工作
 * 频率控制在至少100毫秒一次
 * 
 * @returns {void}
 */
export const 报告心跳 = () => {
    // 导入电子模块，放在函数内部避免在不支持的环境中出错
    let ipcRenderer;
    let webContents;
    
    try {
        const electron = require('electron');
        ipcRenderer = electron.ipcRenderer;
        const remote = require('@electron/remote');
        webContents = remote.webContents;
    } catch (e) {
        console.warn('心跳工具仅在Electron环境中可用');
        return;
    }
    
    // 检查主窗口ID是否存在
    if (!window.currentMainWebContentID) {
        return;
    }

    const 当前时间 = Date.now();
    if (global[上次心跳时间] && 当前时间 - global[上次心跳时间] < 100) {
        return; // 如果距离上次发送不足100毫秒，则不发送
    }

    const 目标窗口 = webContents.fromId(window.currentMainWebContentID);
    if (!目标窗口) {
        return; // 目标窗口不存在
    }

    const 心跳数据 = {
        timestamp: 当前时间,
        webContentID: window.currentMainWebContentID
    };

    目标窗口.send('heartbeat', 心跳数据);
    global[上次心跳时间] = 当前时间; // 更新上次发送时间
};

/**
 * 初始化心跳监听
 * 监听来自主进程的心跳请求，设置当前窗口ID
 * 
 * @returns {Function} 返回取消监听函数
 */
export const 初始化心跳监听 = () => {
    // 导入电子模块
    let ipcRenderer;
    
    try {
        const electron = require('electron');
        ipcRenderer = electron.ipcRenderer;
    } catch (e) {
        console.warn('心跳工具仅在Electron环境中可用');
        return () => {}; // 返回空函数
    }
    
    // 设置监听
    const 心跳处理器 = (e, data) => {
        const currentWebcontentID = data.data.currentWebcontentID;
        window.currentMainWebContentID = currentWebcontentID;
    };
    
    ipcRenderer.on('heartbeat', 心跳处理器);
    
    // 返回取消监听函数
    return () => {
        ipcRenderer.removeListener('heartbeat', 心跳处理器);
    };
};

// 兼容原始导出
export const reportHeartbeat = 报告心跳;
export const useHeartBeat = {
    报告心跳,
    初始化心跳监听
}; 