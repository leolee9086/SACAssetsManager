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

// 存储各房间关联的存储对象
const storeMap = new Map(); // roomName -> store

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

// 用于存储各房间的分块同步状态
const chunkSyncStates = new Map();

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
      handleMessage(message, roomName);
      
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
 * 处理从思源接收的WebSocket消息
 * @param {Object} message - 收到的消息对象
 * @param {string} roomName - 房间名称
 */
function handleMessage(message, roomName) {
  if (!message) {
    console.warn(`[思源同步] 收到无效消息 (房间: ${roomName})`);
    return;
  }

  try {
    // 尝试解析消息
    const data = typeof message === 'string' ? JSON.parse(message) : message;
    
    // 确保数据格式正确
    if (!data || !data.type) {
      console.warn(`[思源同步] 消息格式不正确 (房间: ${roomName}):`, data);
      return;
    }

    // 根据消息类型处理
    switch (data.type) {
      case 'sync':
        // 标准同步消息处理
        if (!data.state) {
          console.warn(`[思源同步] 缺少state数据 (房间: ${roomName})`);
          return;
        }
        
        console.log(`[思源同步] 收到标准同步数据 (房间: ${roomName})`);
        
        // 应用状态到存储
        const store = storeMap.get(roomName);
        if (store) {
          applyStateToStore(data.state, roomName, store);
        } else {
          console.warn(`[思源同步] 无法应用状态: 未找到房间 ${roomName} 的存储对象`);
        }
        break;
      
      case 'sync_start':
        // 开始分块同步
        console.log(`[思源同步] 开始接收分块同步数据 (房间: ${roomName})`);
        initChunkSyncState(roomName);
        break;
      
      case 'sync_index':
        // 接收分块同步索引
        if (!data.keys || !Array.isArray(data.keys)) {
          console.warn(`[思源同步] 分块同步索引无效 (房间: ${roomName})`);
          return;
        }
        
        console.log(`[思源同步] 收到分块同步索引，共 ${data.keys.length} 个键 (房间: ${roomName})`);
        
        const state = getChunkSyncState(roomName);
        if (state) {
          state.keys = data.keys;
          state.expected = data.keys.length;
          state.data = {};
        }
        break;
      
      case 'sync_chunk':
        // 接收数据块
        if (!data.key) {
          console.warn(`[思源同步] 数据块缺少键 (房间: ${roomName})`);
          return;
        }
        
        handleSyncChunk(data, roomName);
        break;
      
      case 'sync_end':
        // 结束分块同步
        console.log(`[思源同步] 分块同步完成通知 (房间: ${roomName})`);
        finalizeChunkSync(roomName);
        break;
      
      case 'sync_error':
        // 同步错误
        console.error(`[思源同步] 同步错误 (房间: ${roomName}): ${data.message || '未知错误'}`);
        cleanupChunkSync(roomName);
        break;
      
      case 'custom':
        // 自定义消息
        handleCustomMessage(data, roomName);
        break;
      
      default:
        console.warn(`[思源同步] 未知消息类型: ${data.type} (房间: ${roomName})`);
    }
  } catch (err) {
    console.error(`[思源同步] 处理消息错误:`, err, message);
  }
}

/**
 * 初始化分块同步状态
 * @param {string} roomName - 房间名称
 */
function initChunkSyncState(roomName) {
  chunkSyncStates.set(roomName, {
    startTime: Date.now(),
    keys: [],
    expected: 0,
    received: 0,
    data: {},
    complete: false
  });
}

/**
 * 获取分块同步状态
 * @param {string} roomName - 房间名称
 * @returns {Object|null} 同步状态对象
 */
function getChunkSyncState(roomName) {
  const state = chunkSyncStates.get(roomName);
  if (!state) {
    console.warn(`[思源同步] 没有为房间 ${roomName} 初始化分块同步状态`);
    return null;
  }
  return state;
}

/**
 * 处理单个同步数据块
 * @param {Object} data - 数据块对象
 * @param {string} roomName - 房间名称
 */
function handleSyncChunk(data, roomName) {
  const state = getChunkSyncState(roomName);
  if (!state) return;
  
  // 保存数据块
  state.data[data.key] = data.value;
  state.received++;
  
  // 记录进度
  if (state.received % 5 === 0 || state.received === state.expected) {
    const progress = Math.round((state.received / state.expected) * 100);
    console.log(`[思源同步] 分块同步进度: ${progress}% (${state.received}/${state.expected}) (房间: ${roomName})`);
  }
}

/**
 * 完成分块同步并应用状态
 * @param {string} roomName - 房间名称
 */
function finalizeChunkSync(roomName) {
  const state = getChunkSyncState(roomName);
  if (!state) return;
  
  // 检查是否收到所有数据
  if (state.received < state.expected) {
    console.warn(`[思源同步] 分块同步不完整: 期望 ${state.expected}，实际接收 ${state.received} (房间: ${roomName})`);
  }
  
  // 计算耗时
  const duration = Date.now() - state.startTime;
  console.log(`[思源同步] 分块同步完成: ${state.received} 块，耗时 ${duration}ms (房间: ${roomName})`);
  
  // 应用状态
  const store = storeMap.get(roomName);
  if (store && Object.keys(state.data).length > 0) {
    console.log(`[思源同步] 正在应用分块同步数据到存储 (房间: ${roomName})`);
    applyStateToStore(state.data, roomName, store);
  }
  
  // 标记完成并清理
  state.complete = true;
  
  // 延迟清理状态
  setTimeout(() => {
    cleanupChunkSync(roomName);
  }, 5000);
}

/**
 * 清理分块同步状态
 * @param {string} roomName - 房间名称
 */
function cleanupChunkSync(roomName) {
  if (chunkSyncStates.has(roomName)) {
    chunkSyncStates.delete(roomName);
    console.log(`[思源同步] 已清理分块同步状态 (房间: ${roomName})`);
  }
}

/**
 * 处理自定义消息
 * @param {Object} data - 消息数据
 * @param {string} roomName - 房间名称
 */
function handleCustomMessage(data, roomName) {
  console.log(`[思源同步] 收到自定义消息 (房间: ${roomName}):`, data.action || '未指定操作');
  
  // 在这里可以添加对各种自定义消息的处理
  if (data.action === 'ping') {
    // 响应ping请求
    sendCustomMessage({
      action: 'pong',
      timestamp: Date.now()
    }, roomName);
  }
}

/**
 * 发送自定义消息到思源
 * @param {Object} data - 要发送的数据
 * @param {string} roomName - 房间名称
 */
function sendCustomMessage(data, roomName) {
  const connection = connections.get(roomName);
  if (!connection || !connection.socket || connection.socket.readyState !== WebSocket.OPEN) {
    console.warn(`[思源同步] 无法发送自定义消息: WebSocket未连接 (房间: ${roomName})`);
    return;
  }
  
  try {
    connection.socket.send(JSON.stringify({
      type: 'custom',
      room: roomName,
      ...data,
      timestamp: Date.now()
    }));
  } catch (err) {
    console.error(`[思源同步] 发送自定义消息失败:`, err);
  }
}

/**
 * 应用状态到存储
 * @param {Object} newState - 新状态
 * @param {string} roomName - 房间名称
 * @param {Object} store - 存储对象
 */
function applyStateToStore(newState, roomName, store) {
  if (!store) {
    console.warn(`[思源同步] 无法应用状态: 未提供存储对象 (房间: ${roomName})`);
    return;
  }
  
  try {
    console.log(`[思源同步] 开始应用状态 (房间: ${roomName})`);
    
    // 遍历并应用每个顶级键
    for (const key in newState) {
      if (Object.prototype.hasOwnProperty.call(newState, key)) {
        if (typeof store[key] !== 'undefined') {
          // 更新现有键
          const oldValue = store[key];
          const newValue = newState[key];
          
          // 根据不同类型进行更新
          if (Array.isArray(oldValue) && Array.isArray(newValue)) {
            // 数组 - 替换整个数组
            store[key] = [...newValue];
          } else if (typeof oldValue === 'object' && oldValue !== null && 
                     typeof newValue === 'object' && newValue !== null) {
            // 对象 - 深度合并
            mergeObjects(store[key], newValue);
          } else {
            // 基本类型 - 直接替换
            store[key] = newValue;
          }
        } else {
          // 添加新键
          store[key] = newState[key];
        }
      }
    }
    
    console.log(`[思源同步] 状态应用完成 (房间: ${roomName})`);
  } catch (err) {
    console.error(`[思源同步] 应用状态失败:`, err);
  }
}

/**
 * 深度合并对象
 * @param {Object} target - 目标对象
 * @param {Object} source - 源对象
 */
function mergeObjects(target, source) {
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (typeof source[key] === 'object' && source[key] !== null && 
          typeof target[key] === 'object' && target[key] !== null) {
        // 递归合并对象
        mergeObjects(target[key], source[key]);
      } else {
        // 替换或添加属性
        target[key] = source[key];
      }
    }
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
 * 向思源WebSocket发送数据
 * @param {WebSocket} socket - WebSocket实例
 * @param {string} roomName - 房间名称
 * @param {Object} store - 数据存储
 * @param {string} [propertyName] - 可选的指定属性名，只同步特定属性
 * @param {Object} [propertyValue] - 可选的指定属性值，与propertyName一起使用
 */
function sendDataToSiyuan(socket, roomName, store, propertyName, propertyValue) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  
  try {
    let stateToSend;
    let size = 0;
    
    // 如果指定了属性，只发送特定属性
    if (propertyName && propertyValue !== undefined) {
      stateToSend = {
        [propertyName]: propertyValue
      };
    } else {
      // 否则发送完整状态，但先进行深度过滤
      stateToSend = filterStateForSync(store.state);
    }
    
    // 创建同步消息
    const data = {
      type: 'sync',
      room: roomName,
      state: stateToSend,
      timestamp: Date.now(),
      partial: !!propertyName // 标记是否为部分更新
    };
    
    // 计算消息大小
    const jsonData = JSON.stringify(data);
    size = jsonData.length;
    
    // 如果消息过大，则尝试更进一步压缩
    if (size > 1024 * 1024) { // 超过1MB
      console.warn(`[思源同步] 消息过大 (${Math.round(size/1024)}KB)，进行进一步压缩`);
      
      // 进一步压缩大型状态
      if (!propertyName) {
        const compressedState = compressLargeState(stateToSend);
        
        // 重新计算大小
        const compressedData = {
          type: 'sync',
          room: roomName,
          state: compressedState,
          timestamp: Date.now(),
          compressed: true
        };
        
        const compressedJson = JSON.stringify(compressedData);
        const compressedSize = compressedJson.length;
        
        if (compressedSize < size) {
          // 使用压缩后的数据
          socket.send(compressedJson);
          console.log(`[思源同步] 房间 ${roomName} 向思源发送压缩同步数据 (${Math.round(compressedSize/1024)}KB，原始：${Math.round(size/1024)}KB)`);
          return;
        }
      }
      
      // 如果压缩效果不佳或是部分同步，则发送同步信息
      console.warn(`[思源同步] 同步消息过大 (${Math.round(size/1024)}KB)，请使用部分同步`);
      socket.send(JSON.stringify({
        type: 'sync_info',
        room: roomName,
        message: `数据过大 (${Math.round(size/1024)}KB)，请使用部分同步或优化数据结构`,
        timestamp: Date.now()
      }));
      
      return; // 不发送完整数据
    }
    
    // 发送数据
    socket.send(jsonData);
    
    // 记录同步信息
    if (size > 50 * 1024) { // 超过50KB才记录
      console.log(`[思源同步] 房间 ${roomName} 向思源发送同步数据 (${Math.round(size/1024)}KB)`);
    } else {
      console.log(`[思源同步] 房间 ${roomName} 向思源发送同步数据成功`);
    }
  } catch (error) {
    console.error(`[思源同步] 发送数据到思源WebSocket出错:`, error);
  }
}

/**
 * 过滤状态对象，移除不必要的大型数据
 * @param {Object} state - 原始状态对象
 * @returns {Object} 过滤后的状态对象
 */
function filterStateForSync(state) {
  if (!state || typeof state !== 'object') return state;
  
  // 创建过滤后的状态对象
  const filteredState = Array.isArray(state) ? [] : {};
  
  // 记录已处理的对象，防止循环引用
  const seen = new WeakMap();
  
  function filter(obj, target) {
    // 处理基本类型
    if (obj === null || typeof obj !== 'object') return obj;
    
    // 处理循环引用
    if (seen.has(obj)) return '[循环引用]';
    seen.set(obj, true);
    
    // 处理数组
    if (Array.isArray(obj)) {
      // 对于大型数组，只保留部分数据
      if (obj.length > 100) {
        return {
          __array_placeholder: true,
          length: obj.length,
          sample: obj.slice(0, 3) // 只保留前3个元素作为示例
        };
      }
      
      // 处理正常大小的数组
      const result = [];
      for (let i = 0; i < obj.length; i++) {
        result[i] = filter(obj[i], result);
      }
      return result;
    }
    
    // 处理对象
    const result = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        
        // 跳过函数和系统属性
        if (typeof value === 'function' || key.startsWith('__')) continue;
        
        // 处理大型对象或数组
        if (value && typeof value === 'object') {
          // 估算对象大小
          const objSize = JSON.stringify(value).length;
          
          // 大型对象处理
          if (objSize > 1024 * 50) { // 超过50KB
            if (Array.isArray(value)) {
              result[key] = {
                __array_placeholder: true,
                length: value.length,
                sample: value.slice(0, 3)
              };
            } else {
              result[key] = {
                __object_placeholder: true,
                keys: Object.keys(value),
                size: objSize
              };
            }
            continue;
          }
        }
        
        // 常规处理
        result[key] = filter(value, result);
      }
    }
    
    return result;
  }
  
  return filter(state, filteredState);
}

/**
 * 进一步压缩大型状态对象，移除或简化大型数据
 * @param {Object} state - 状态对象
 * @returns {Object} 压缩后的状态对象
 */
function compressLargeState(state) {
  if (!state || typeof state !== 'object') return state;
  
  const compressedState = Array.isArray(state) ? [] : {};
  
  // 记录已处理的对象，防止循环引用
  const seen = new WeakMap();
  
  function compress(obj, target) {
    // 处理基本类型
    if (obj === null || typeof obj !== 'object') return obj;
    
    // 处理循环引用
    if (seen.has(obj)) return '[循环引用]';
    seen.set(obj, true);
    
    // 处理数组
    if (Array.isArray(obj)) {
      // 对于任何数组，只保留长度信息
      if (obj.length > 10) {
        return {
          __array_info: true,
          length: obj.length
        };
      }
      
      // 处理小型数组
      const result = [];
      for (let i = 0; i < obj.length; i++) {
        result[i] = compress(obj[i], result);
      }
      return result;
    }
    
    // 处理对象
    const result = {};
    
    // 如果对象已经是占位符，直接返回
    if (obj.__array_placeholder || obj.__object_placeholder || obj.__array_info) {
      return obj;
    }
    
    // 处理普通对象
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        
        // 跳过函数和系统属性
        if (typeof value === 'function' || key.startsWith('__')) continue;
        
        // 如果是复杂对象，仅保留基本信息
        if (value && typeof value === 'object') {
          if (Array.isArray(value)) {
            result[key] = {
              __array_info: true,
              length: value.length
            };
          } else {
            // 检查对象大小
            const valueSize = JSON.stringify(value).length;
            if (valueSize > 1024) { // 大于1KB的对象简化处理
              result[key] = {
                __object_info: true,
                keys: Object.keys(value),
                size: valueSize
              };
            } else {
              // 小型对象正常处理
              result[key] = compress(value, {});
            }
          }
        } else {
          // 基本类型直接赋值
          result[key] = value;
        }
      }
    }
    
    return result;
  }
  
  return compress(state, compressedState);
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

/**
 * 安全深度拷贝对象，处理循环引用
 * @param {any} obj - 需要复制的对象
 * @returns {any} 复制后的对象
 */
function safeDeepCopy(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (err) {
    console.warn('[思源同步] 深度拷贝对象失败，尝试浅拷贝');
    
    // 回退到安全的浅拷贝
    if (Array.isArray(obj)) {
      return [...obj];
    } else {
      return {...obj};
    }
  }
}

/**
 * 关联存储对象与房间
 * @param {string} roomName - 房间名称
 * @param {Object} store - 存储对象
 */
export function registerStore(roomName, store) {
  if (!roomName || !store) {
    console.warn(`[思源同步] 无法注册存储: 参数无效`);
    return false;
  }
  
  storeMap.set(roomName, store);
  console.log(`[思源同步] 已为房间 ${roomName} 注册存储对象`);
  return true;
}

/**
 * 移除房间的存储对象关联
 * @param {string} roomName - 房间名称
 */
export function unregisterStore(roomName) {
  if (storeMap.has(roomName)) {
    storeMap.delete(roomName);
    console.log(`[思源同步] 已移除房间 ${roomName} 的存储对象关联`);
    return true;
  }
  return false;
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
  connections,
  registerStore,
  unregisterStore,
  get client() {
    return clientApi;
  },
  syncProperty(roomName, store, propName, propValue) {
    const connectionStatus = getConnectionStatus(roomName);
    if (!connectionStatus || !connectionStatus.socket) {
      return false;
    }
    
    try {
      // 使用现有的sendDataToSiyuan函数发送单个属性
      sendDataToSiyuan(connectionStatus.socket, roomName, store, propName, propValue);
      return true;
    } catch (err) {
      console.error(`[思源同步] 同步属性失败 (${propName}):`, err);
      return false;
    }
  }
} 