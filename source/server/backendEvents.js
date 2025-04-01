/**
 * 后端事件系统
 * 提供基于WebSocket的事件通信功能
 */

import { 创建后端事件系统 } from '../../src/toolBox/base/forNetwork/forWebSocket/useWebSocketEvents.js';

// 导出BackendEvents类
// 这个导出仅用于保持API兼容性
export class BackendEvents {
  constructor(ports, wsTargets) {
    const 事件系统 = 创建后端事件系统({
      端口列表: ports,
      WS目标列表: wsTargets
    });
    
    // 将事件系统的所有方法绑定到this上
    this.on = 事件系统.on;
    this.off = 事件系统.off;
    this.once = 事件系统.once;
    this.removeListener = 事件系统.removeListener;
    this.removeAllListeners = 事件系统.removeAllListeners;
    this.listeners = 事件系统.listeners;
    this.broadcast = 事件系统.广播;
    this.emitBroadcast = 事件系统.发出并广播;
    this.prepareEmit = 事件系统.准备发出;
    
    // 保存原始对象
    this.ws = 事件系统.ws服务器列表;
    this.wsTargets = wsTargets;
    this.wsEventListener = 事件系统.监听器列表;
  }
}