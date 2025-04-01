/**
 * 预加载脚本
 * 在主窗口加载前执行的初始化工作
 */

const { ipcRenderer } = require('electron');
const path = require('path');

/**
 * 启用远程模块访问
 * @param {Object} webContents - WebContents对象
 * @returns {boolean} 是否成功启用
 */
const enableRemoteModule = (webContents) => {
    try {
        const remoteEnable = require('@electron/remote').require('@electron/remote/main').enable;
        remoteEnable(webContents);
        console.log('成功启用远程模块');
        return true;
    } catch (error) {
        console.error('启用远程模块失败:', error);
        
        // 尝试通过IPC请求启用
        try {
            ipcRenderer.send('enable-remote-module', { 
                webContentsId: webContents.id 
            });
            console.log('已发送远程模块启用请求');
            return true;
        } catch (ipcError) {
            console.error('IPC请求启用远程模块失败:', ipcError);
            return false;
        }
    }
};

/**
 * 初始化预加载环境
 */
const initPreloadEnvironment = () => {
    // 为window对象添加属性
    window.electronPreload = {
        enableRemote: enableRemoteModule,
        ipcRenderer,
        path
    };
    
    // 设置心跳检测
    setInterval(() => {
        try {
            ipcRenderer.send('heartbeat', { 
                message: 'Server heartbeat', 
                timestamp: Date.now(),
                webContentID: process.guestInstanceId || null
            });
        } catch (e) {
            console.warn('心跳发送失败', e);
        }
    }, 5000);
    
    // 监听来自主进程的消息
    ipcRenderer.on('remote-module-enabled', (event, arg) => {
        if (arg.success) {
            console.log('远程模块已启用');
        } else {
            console.error('远程模块启用失败:', arg.error);
        }
    });
    
    // 监听服务器关闭请求
    ipcRenderer.on('server-shutdown', () => {
        console.log('接收到服务器关闭请求');
        window.dispatchEvent(new CustomEvent('server-shutdown'));
    });
    
    console.log('预加载环境初始化完成');
};

// 立即执行初始化
initPreloadEnvironment();

// 导出预加载API
module.exports = {
    enableRemoteModule,
    initPreloadEnvironment
}; 