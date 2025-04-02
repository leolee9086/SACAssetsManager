/**
 * 心跳响应处理模块
 * 负责处理心跳请求并返回详细的服务状态信息
 */

import { plugin } from '../asyncModules.js';

// 服务启动时间记录
let serverStartTime = Date.now();
let staticServerStartTime = null;

// 初始化心跳响应处理
export function 初始化心跳处理(ipcRenderer) {
  // 处理心跳消息
  ipcRenderer.on('heartbeat', (e, data) => {
    try {
      if (data && data.message) {
        console.log('收到心跳消息:', data.message);
      }

      // 收集服务状态信息
      const statusInfo = {
        type: 'heartbeat',
        isActive: true,
        timestamp: Date.now(),
        webContentID: plugin.serverContainerWebContentsID,
        port: plugin.http服务端口号,
        status: 'running',
        services: {
          main: {
            isRunning: true,
            startTime: serverStartTime,
            port: plugin.http服务端口号,
            status: 'running'
          },
          static: {
            isRunning: !!plugin.staticServerContainer && 
                      (typeof plugin.staticServerContainer.isDestroyed !== 'function' || 
                       !plugin.staticServerContainer.isDestroyed()),
            startTime: plugin.staticServerStartTime || staticServerStartTime,
            port: plugin.https服务端口号,
            status: plugin.staticServerContainer ? 'running' : 'stopped',
            lastHeartbeat: plugin.staticServerLastPong
          }
        }
      };
      
      // 发送心跳回应到原发送者
      e.sender.send('heartbeat', statusInfo);
      
      // 记录服务启动时间（如果是第一次响应）
      if (!plugin.mainServerStartTime) {
        plugin.mainServerStartTime = serverStartTime;
      }
      
    } catch (error) {
      // 即使发生错误，也尝试发送最小的心跳响应
      console.error('处理心跳消息时发生错误:', error);
      e.sender.send('heartbeat', {
        type: 'heartbeat',
        isActive: true,
        timestamp: Date.now(),
        webContentID: plugin.serverContainerWebContentsID,
        error: error.message
      });
    }
  });
  
  console.log('心跳响应处理已初始化');
}

// 更新主服务启动时间
export function 更新主服务启动时间(timestamp = Date.now()) {
  serverStartTime = timestamp;
  plugin.mainServerStartTime = timestamp;
  return serverStartTime;
}

// 更新静态服务启动时间
export function 更新静态服务启动时间(timestamp = Date.now()) {
  staticServerStartTime = timestamp;
  plugin.staticServerStartTime = timestamp;
  return staticServerStartTime;
}

// 获取服务状态快照
export function 获取服务状态快照() {
  return {
    main: {
      isRunning: true,
      startTime: serverStartTime,
      port: plugin.http服务端口号,
      status: 'running'
    },
    static: {
      isRunning: !!plugin.staticServerContainer && 
                (typeof plugin.staticServerContainer.isDestroyed !== 'function' || 
                 !plugin.staticServerContainer.isDestroyed()),
      startTime: plugin.staticServerStartTime || staticServerStartTime,
      port: plugin.https服务端口号,
      status: plugin.staticServerContainer ? 'running' : 'stopped',
      lastHeartbeat: plugin.staticServerLastPong
    }
  };
} 