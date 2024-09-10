/**
 * 这个函数帮助遍历等耗时但并没有假死的操作的时候,向前端汇报后台仍然存活
*/
const ipcRenderer = require('electron').ipcRenderer
const { webContents } = require('@electron/remote');

ipcRenderer.on('heartbeat', (e, data) => {
    const currentWebcontentID = data.data.currentWebcontentID
    window.currentMainWebContentID=currentWebcontentID
})
// 使用 Symbol 创建一个唯一的键，用于存储上次发送时间
const lastHeartbeatTime = Symbol('lastHeartbeatTime');

export function reportHeartbeat() {
    if (!window.currentMainWebContentID) {
        return;
    }

    const now = Date.now();
    if (global[lastHeartbeatTime] && now - global[lastHeartbeatTime] < 100) {
        return; // 如果距离上次发送不足100毫秒，则不发送
    }

    const targetWebcontent = webContents.fromId(window.currentMainWebContentID);

    const heartbeatData = {
        timestamp: now,
        webContentID: window.currentMainWebContentID
    };

    targetWebcontent.send('heartbeat', heartbeatData);
    global[lastHeartbeatTime] = now; // 更新上次发送时间
}

