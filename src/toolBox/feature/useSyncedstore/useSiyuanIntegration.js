/**
 * @fileoverview 思源笔记 WebSocket 连接管理器
 * 
 * 该模块负责与思源笔记建立和管理 WebSocket 连接，
 * 用于实现思源笔记内的实时数据同步
 * 
 * @module siyuanManager
 */

// 思源 WebSocket 相关默认配置
export const defaultConfig = {
  enabled: false,
  port: 6806,
  channel: 'sync',
  token: 'xqatmtk3jfpchiah',
  host: '127.0.0.1',
  autoReconnect: true,
  reconnectInterval: 1000,
  maxReconnectAttempts: 10
}

// 当前配置
export const config = { ...defaultConfig }

/**
 * 更新思源配置
 * @param {Object} newConfig - 新的配置选项
 * @returns {Object} 更新后的配置
 */
export function updateConfig(newConfig = {}) {
  Object.assign(config, newConfig)
  return { ...config }
}

// 思源 WebSocket 连接管理器
const connections = new Map() // roomName -> { socket, status, reconnectAttempts, reconnectTimer, messageHandlers }

/**
 * 连接到思源 WebSocket
 * @param {string} roomName - 房间名称
 * @param {Object} options - 连接选项
 * @returns {Promise<WebSocket|null>} WebSocket 连接或 null
 */
export async function connect(roomName, options = {}) {
  const {
    port = config.port,
    channel = config.channel,
    token = config.token,
    host = config.host,
    autoReconnect = config.autoReconnect,
    reconnectInterval = config.reconnectInterval,
    maxReconnectAttempts = config.maxReconnectAttempts
  } = options

  // 检查是否已存在连接
  const existingConn = connections.get(roomName);
  if (existingConn?.socket && existingConn.socket.readyState === WebSocket.OPEN) {
    console.log(`[思源同步] 房间 ${roomName} 已有活跃WebSocket连接，复用现有连接`);
    return existingConn.socket;
  }
  
  // 创建或重置连接状态
  if (!connections.has(roomName)) {
    connections.set(roomName, {
      socket: null,
      status: 'connecting',
      reconnectAttempts: 0,
      reconnectTimer: null,
      messageHandlers: new Set()
    });
  }
  
  const connState = connections.get(roomName);

  try {
    console.log(`[思源同步] 尝试连接到思源WebSocket: ws://${host}:${port}/ws/broadcast?channel=${channel}_${roomName}`);
    
    const wsUrl = `ws://${host}:${port}/ws/broadcast?channel=${channel}_${roomName}&token=${token}`;
    const socket = new WebSocket(wsUrl);
    
    return new Promise((resolve, reject) => {
      socket.onopen = () => {
        console.log(`[思源同步] 房间 ${roomName} WebSocket 连接成功`);
        
        // 更新连接状态
        connState.socket = socket;
        connState.status = 'connected';
        connState.reconnectAttempts = 0;
        
        // 设置消息处理器
        setupMessageHandler(socket, roomName);
        
        // 发送一条初始连接消息
        try {
          socket.send(JSON.stringify({
            type: 'connect',
            room: roomName,
            clientId: Date.now().toString(36) + Math.random().toString(36).substr(2)
          }));
        } catch (e) {
          console.warn(`[思源同步] 发送初始连接消息失败:`, e);
        }
        
        resolve(socket);
      };

      socket.onerror = (error) => {
        console.error(`[思源同步] 房间 ${roomName} WebSocket 连接错误:`, error);
        connState.status = 'error';
        reject(error);
      };

      socket.onclose = (event) => {
        console.log(`[思源同步] 房间 ${roomName} WebSocket 连接关闭, 代码: ${event.code}, 原因: ${event.reason}`);
        connState.status = 'closed';
        connState.socket = null;
        
        // 自动重连
        if (autoReconnect && connState.reconnectAttempts < maxReconnectAttempts) {
          connState.reconnectAttempts++;
          
          console.log(`[思源同步] 房间 ${roomName} 将在 ${reconnectInterval}ms 后进行第 ${connState.reconnectAttempts} 次重连尝试`);
          
          if (connState.reconnectTimer) {
            clearTimeout(connState.reconnectTimer);
          }
          
          connState.reconnectTimer = setTimeout(() => {
            connect(roomName, options).catch(err => {
              console.error(`[思源同步] 房间 ${roomName} 重连失败:`, err);
            });
          }, reconnectInterval);
        } else if (connState.reconnectAttempts >= maxReconnectAttempts) {
          console.error(`[思源同步] 房间 ${roomName} 重连次数已达上限 (${maxReconnectAttempts}), 停止重连`);
          connState.status = 'failed';
        }
      };
    });
  } catch (error) {
    console.error(`[思源同步] 创建 WebSocket 连接失败:`, error);
    return null;
  }
}

/**
 * 设置消息处理器
 * @param {WebSocket} socket - WebSocket实例
 * @param {string} roomName - 房间名称
 */
function setupMessageHandler(socket, roomName) {
  const connState = connections.get(roomName);
  if (!connState) return;
  
  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log(`[思源同步] 房间 ${roomName} 收到消息:`, message.type || '未知类型');
      
      // 处理消息
      processMessage(message, roomName);
      
      // 调用注册的消息处理器
      if (connState.messageHandlers.size > 0) {
        for (const handler of connState.messageHandlers) {
          try {
            handler(message);
          } catch (err) {
            console.error(`[思源同步] 消息处理器执行错误:`, err);
          }
        }
      }
    } catch (error) {
      console.warn(`[思源同步] 解析消息失败:`, error);
    }
  };
}

/**
 * 处理接收到的消息
 * @param {Object} message - 消息对象
 * @param {string} roomName - 房间名称
 */
function processMessage(message, roomName) {
  const { type } = message;
  
  switch (type) {
    case 'sync':
      // 数据同步消息
      console.log(`[思源同步] 房间 ${roomName} 收到同步数据`);
      break;
      
    case 'connect':
      // 有新客户端连接
      console.log(`[思源同步] 房间 ${roomName} 有新客户端连接`);
      break;
      
    case 'disconnect':
      // 客户端断开连接
      console.log(`[思源同步] 房间 ${roomName} 客户端断开连接`);
      break;
      
    default:
      // 其他消息
      console.log(`[思源同步] 房间 ${roomName} 收到未知类型消息: ${type}`);
      break;
  }
}

/**
 * 断开指定房间的思源 WebSocket 连接
 * @param {string} roomName - 房间名称
 */
export function disconnect(roomName) {
  const conn = connections.get(roomName);
  if (!conn) return;
  
  // 清除重连定时器
  if (conn.reconnectTimer) {
    clearTimeout(conn.reconnectTimer);
    conn.reconnectTimer = null;
  }
  
  // 关闭WebSocket连接
  if (conn.socket) {
    try {
      conn.socket.close();
    } catch (err) {
      console.warn(`[思源同步] 关闭房间 ${roomName} WebSocket连接时出错:`, err);
    }
    conn.socket = null;
  }
  
  // 更新状态
  conn.status = 'disconnected';
}

/**
 * 获取指定房间的连接状态
 * @param {string} roomName - 房间名称
 * @returns {Object|null} 连接状态或 null
 */
export function getConnectionStatus(roomName) {
  return connections.get(roomName) || null;
}

/**
 * 获取所有活跃连接
 * @returns {Map} 房间名到连接的映射
 */
export function getAllConnections() {
  return new Map(connections);
}

/**
 * 发送数据到指定房间
 * @param {string} roomName - 房间名称
 * @param {Object} data - 要发送的数据
 * @returns {boolean} 是否成功发送
 */
export function sendData(roomName, data) {
  const conn = connections.get(roomName);
  if (!conn?.socket || conn.socket.readyState !== WebSocket.OPEN) {
    console.warn(`[思源同步] 房间 ${roomName} WebSocket未连接，无法发送数据`);
    return false;
  }
  
  try {
    const message = JSON.stringify({
      ...data,
      timestamp: Date.now(),
      room: roomName
    });
    
    conn.socket.send(message);
    console.log(`[思源同步] 向房间 ${roomName} 发送数据成功, 类型: ${data.type || '未知'}`);
    return true;
  } catch (error) {
    console.warn(`[思源同步] 向房间 ${roomName} 发送数据失败:`, error);
    return false;
  }
}

/**
 * 添加消息处理器
 * @param {string} roomName - 房间名称
 * @param {Function} handler - 消息处理函数
 * @returns {boolean} 是否成功添加
 */
export function addMessageHandler(roomName, handler) {
  const conn = connections.get(roomName);
  if (!conn) return false;
  
  conn.messageHandlers.add(handler);
  return true;
}

/**
 * 移除消息处理器
 * @param {string} roomName - 房间名称
 * @param {Function} handler - 消息处理函数
 * @returns {boolean} 是否成功移除
 */
export function removeMessageHandler(roomName, handler) {
  const conn = connections.get(roomName);
  if (!conn) return false;
  
  return conn.messageHandlers.delete(handler);
}

// 导出完整接口
export default {
  config,
  connect,
  disconnect,
  updateConfig,
  getConnectionStatus,
  getAllConnections,
  sendData,
  addMessageHandler,
  removeMessageHandler,
  connections
} 