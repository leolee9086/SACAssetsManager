/**
 * WebSocket事件处理工具
 * 提供WebSocket服务器事件处理的封装
 */

/**
 * 创建WebSocket事件监听器
 * @param {WebSocket} wsTarget - WebSocket目标
 * @param {EventEmitter} eventBus - 事件总线
 * @returns {Object} WebSocket事件监听器
 */
export const 创建WebSocket事件监听器 = (wsTarget, eventBus) => {
  if (!wsTarget || !eventBus) {
    throw new Error('创建WebSocket事件监听器需要提供WebSocket目标和事件总线');
  }

  // 添加消息监听器
  const 添加消息监听器 = () => {
    wsTarget.on('message', (message) => {
      try {
        const 解析消息 = JSON.parse(message);
        // 根据消息类型、数据和选项发出事件
        eventBus.emit(解析消息.type, 解析消息.data, 解析消息.option);
      } catch (错误) {
        console.error('WebSocket消息解析失败:', 错误);
      }
    });
  };

  // 立即添加监听器
  添加消息监听器();

  return {
    wsTarget,
    eventBus,
    添加消息监听器
  };
};

/**
 * 创建后端事件系统
 * 基于WebSocket的事件广播系统
 * 
 * @param {Object} 配置 - 配置选项
 * @param {Array<number>} 配置.端口列表 - WebSocket服务器端口列表
 * @param {Array<WebSocket>} 配置.WS目标列表 - WebSocket目标列表
 * @returns {Object} 后端事件系统
 */
export const 创建后端事件系统 = ({ 端口列表 = [], WS目标列表 = [] }) => {
  const EventEmitter = window.require ? window.require('events') : null;
  const WebSocket = window.require ? window.require('ws') : null;
  
  if (!EventEmitter || !WebSocket) {
    throw new Error('创建后端事件系统需要Node.js环境');
  }

  // 创建事件发射器
  const eventBus = new EventEmitter();
  
  // 创建WebSocket服务器
  const ws服务器列表 = 端口列表.map(端口 => new WebSocket.WebSocketServer({ port: 端口 }));
  
  // 添加目标
  WS目标列表.forEach(目标 => {
    ws服务器列表.forEach(服务器 => {
      服务器.add(目标);
    });
  });

  // 创建监听器
  const 监听器列表 = WS目标列表.map(目标 => 创建WebSocket事件监听器(目标, eventBus));

  // 广播消息给所有目标
  const 广播 = (事件名, ...参数) => {
    WS目标列表.forEach(目标 => {
      if (目标.readyState === WebSocket.OPEN) {
        目标.send(JSON.stringify({ type: 事件名, data: 参数 }));
      }
    });
  };

  // 发出事件并广播
  const 发出并广播 = (事件名, ...参数) => {
    eventBus.emit(事件名, ...参数);
    广播(事件名, ...参数);
  };

  // 准备发出事件的工具函数
  const 准备发出 = (事件名, ...参数) => {
    return () => {
      eventBus.emit(事件名, ...参数);
      return {
        广播: () => 广播(事件名, ...参数)
      };
    };
  };

  return {
    // 事件处理函数
    on: (事件名, 监听器) => eventBus.on(事件名, 监听器),
    once: (事件名, 监听器) => eventBus.once(事件名, 监听器),
    off: (事件名, 监听器) => eventBus.off(事件名, 监听器),
    removeListener: (事件名, 监听器) => eventBus.removeListener(事件名, 监听器),
    removeAllListeners: (事件名) => eventBus.removeAllListeners(事件名),
    listeners: (事件名) => eventBus.listeners(事件名),
    
    // 广播功能
    广播,
    发出并广播,
    准备发出,
    
    // 原始对象
    eventBus,
    ws服务器列表,
    监听器列表
  };
};

// 兼容导出
export const createWebSocketEventListener = 创建WebSocket事件监听器;
export const createBackendEventSystem = 创建后端事件系统; 