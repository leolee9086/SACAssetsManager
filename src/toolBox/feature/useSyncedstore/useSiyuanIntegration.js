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
 * 安全地检测对象是否为Yjs类型
 * 使用特征检测而非instanceof检查，避免多实例问题
 * @param {Object} obj - 待检测对象
 * @returns {boolean} 是否为Yjs类型
 */
function isYjsLikeObject(obj) {
  if (!obj || typeof obj !== 'object') return false;
  
  // 检查是否有Yjs文档的特征属性和方法
  const hasYjsFeatures = (
    // 常见的Yjs文档属性
    (obj._item && obj._start !== undefined) ||
    (obj.gc !== undefined && obj.store !== undefined) ||
    (typeof obj.toJSON === 'function' && obj._map) ||
    (obj.share !== undefined && typeof obj.getArray === 'function') ||
    (obj.doc && typeof obj.doc.transact === 'function')
  );
  
  return hasYjsFeatures;
}

/**
 * 安全地处理数据用于同步，避免循环引用问题
 * @param {Object} data - 要处理的数据对象
 * @param {number} maxDepth - 最大递归深度
 * @returns {Object} 处理后的安全数据对象
 */
function safeProcessDataForSync(data, maxDepth = 20) {
  // 使用简单的JSON序列化和反序列化来克隆并移除循环引用
  try {
    return JSON.parse(JSON.stringify(data));
  } catch (error) {
    console.warn("[思源同步] 数据包含循环引用，使用安全处理模式");
    
    // 记录已处理对象
    const seen = new WeakMap();
    
    // 处理函数 - 处理循环引用和深度限制
    function process(obj, depth = 0) {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj !== 'object') return obj;
      if (depth >= maxDepth) return "[深度限制]";
      
      // 检查循环引用
      if (seen.has(obj)) return "[循环引用]";
      seen.set(obj, true);
      
      // 检查是否为Yjs类对象，如果是则直接返回标记
      if (isYjsLikeObject(obj)) {
        return "[Yjs对象]";
      }
      
      // 处理数组
      if (Array.isArray(obj)) {
        return obj.map(item => process(item, depth + 1));
      }
      
      // 处理对象
      const result = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          // 跳过函数和特殊字段
          if (typeof obj[key] === 'function' || key.startsWith('$') || key.startsWith('_')) continue;
          
          try {
            result[key] = process(obj[key], depth + 1);
          } catch (e) {
            result[key] = `[错误: ${e.message}]`;
          }
        }
      }
      
      return result;
    }
    
    return process(data);
  }
}

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
          const safeMessage = safeProcessDataForSync({
            type: 'connect',
            room: roomName,
            clientId: Date.now().toString(36) + Math.random().toString(36).substr(2)
          });
          
          socket.send(JSON.stringify(safeMessage));
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
  if (!connState) {
    console.warn(`[思源同步] 未找到房间 ${roomName} 的连接状态信息`);
    return;
  }
  
  // 设置消息处理函数
  socket.onmessage = (event) => {
    try {
      // 检查event.data是否有效
      if (!event || !event.data) {
        console.warn(`[思源同步] 房间 ${roomName} 收到无效消息数据`);
        return;
      }
      
      let message;
      try {
        message = JSON.parse(event.data);
      } catch (parseError) {
        console.warn(`[思源同步] 房间 ${roomName} 解析消息失败:`, parseError);
        // 尝试输出部分原始数据以便调试
        console.warn('原始数据开头:', typeof event.data === 'string' ? event.data.substring(0, 50) : '非字符串数据');
        return;
      }
      
      // 检查消息是否有效
      if (!message) {
        console.warn(`[思源同步] 房间 ${roomName} 收到空消息`);
        return;
      }
      
      console.log(`[思源同步] 房间 ${roomName} 收到消息:`, message.type || '未知类型');
      
      // 处理消息
      try {
        handleMessage(message, roomName);
      } catch (handleError) {
        console.error(`[思源同步] 房间 ${roomName} 处理消息时出错:`, handleError);
      }
      
      // 调用注册的消息处理器
      if (connState.messageHandlers && connState.messageHandlers.size > 0) {
        for (const handler of connState.messageHandlers) {
          if (typeof handler !== 'function') {
            continue; // 跳过非函数处理器
          }
          
          try {
            handler(message);
          } catch (handlerError) {
            console.error(`[思源同步] 消息处理器执行错误:`, handlerError);
          }
        }
      }
    } catch (error) {
      console.warn(`[思源同步] 处理WebSocket消息总体失败:`, error);
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
      case 'y-sync':
        // 处理Yjs二进制同步消息，直接透传给Provider
        // 这部分由Provider中的_onMessage方法直接处理
        // 这里只是记录日志，不做额外处理
        if (data.binaryData) {
          console.log(`[思源同步] 收到Yjs二进制消息 (房间: ${roomName}, 大小: ${data.size || '未知'}字节)`);
        } else {
          console.warn(`[思源同步] 收到Yjs消息但没有二进制数据 (房间: ${roomName})`);
        }
        break;
        
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
    
    // 检查是否是Yjs文档 - 使用新的安全检测方法
    const isYjsDocument = (
      // 尝试检测store本身
      isYjsLikeObject(store) || 
      // 检查常见的Yjs文档属性位置
      isYjsLikeObject(store.doc) || 
      isYjsLikeObject(store.ydoc) || 
      (store.state && isYjsLikeObject(store.state))
    );
    
    // 如果是Yjs文档，我们需要特殊处理
    if (isYjsDocument) {
      console.log(`[思源同步] 检测到Yjs文档，使用安全模式应用状态`);
      applyStateToYjsDocument(newState, store);
      return;
    }
    
    // 普通对象的处理逻辑
    // 遍历并应用每个顶级键
    for (const key in newState) {
      if (Object.prototype.hasOwnProperty.call(newState, key)) {
        try {
          if (typeof store[key] !== 'undefined') {
            // 更新现有键
            const oldValue = store[key];
            const newValue = newState[key];
            
            // 特殊情况：如果目标属性是Yjs对象，跳过更新
            if (isYjsLikeObject(oldValue)) {
              console.log(`[思源同步] 跳过Yjs类型属性: ${key}`);
              continue;
            }
            
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
            // 添加新键，但需要注意检查是否可以添加
            if (Object.isExtensible(store)) {
              store[key] = newState[key];
            } else {
              console.warn(`[思源同步] 无法添加新键 "${key}": 目标对象不可扩展`);
            }
          }
        } catch (keyError) {
          console.warn(`[思源同步] 应用属性 "${key}" 失败: ${keyError.message}`);
          // 继续处理其他属性
        }
      }
    }
    
    console.log(`[思源同步] 状态应用完成 (房间: ${roomName})`);
  } catch (err) {
    console.error(`[思源同步] 应用状态失败:`, err);
  }
}

/**
 * 将状态安全地应用到Yjs文档
 * @param {Object} newState - 新状态
 * @param {Object} store - Yjs文档存储
 */
function applyStateToYjsDocument(newState, store) {
  try {
    // 确定实际的状态对象，避免直接操作Yjs内部结构
    let actualState = null;
    
    // 尝试不同路径找到合适的状态对象
    if (store.state && typeof store.state === 'object' && !isYjsLikeObject(store.state)) {
      actualState = store.state;
    } else if (store._prelimState && typeof store._prelimState === 'object') {
      actualState = store._prelimState;
    } else if (store._state && typeof store._state === 'object') {
      actualState = store._state;
    } else if (!isYjsLikeObject(store)) {
      // 如果store本身不是Yjs对象，可以直接使用
      actualState = store;
    }
    
    if (!actualState) {
      console.warn('[思源同步] 无法安全确定Yjs状态对象，跳过应用');
      return;
    }
    
    // 获取已存在的键，过滤掉内部属性和Yjs对象
    const existingKeys = Object.keys(actualState).filter(key => {
      const value = actualState[key];
      return (
        !key.startsWith('_') && 
        !key.startsWith('$') && 
        typeof value !== 'function' &&
        !isYjsLikeObject(value)
      );
    });
    
    console.log(`[思源同步] Yjs文档可更新属性: ${existingKeys.join(', ')}`);
    
    let updatedCount = 0;
    // 只更新已存在的键，避免在根文档上添加新元素
    for (const key in newState) {
      if (!Object.prototype.hasOwnProperty.call(newState, key)) continue;
      
      // 跳过内部属性和不存在于目标对象的属性
      if (key.startsWith('_') || key.startsWith('$') || typeof newState[key] === 'function') {
        continue;
      }
      
      if (!existingKeys.includes(key)) {
        console.log(`[思源同步] 跳过不存在的属性: ${key}`);
        continue;
      }
      
      try {
        const newValue = newState[key];
        const currentValue = actualState[key];
        
        // 跳过Yjs类型的值
        if (isYjsLikeObject(currentValue)) {
          console.log(`[思源同步] 跳过Yjs类型的属性: ${key}`);
          continue;
        }
        
        // 只同步类型兼容的值，避免出现错误
        if (typeof currentValue !== typeof newValue && 
            !(Array.isArray(currentValue) && Array.isArray(newValue))) {
          console.warn(`[思源同步] 属性 "${key}" 类型不匹配，跳过 (${typeof currentValue} vs ${typeof newValue})`);
          continue;
        }
        
        // 根据类型分别处理
        if (typeof newValue !== 'object' || newValue === null) {
          // 简单类型直接替换
          actualState[key] = newValue;
          updatedCount++;
        } else if (Array.isArray(newValue)) {
          // 数组类型，安全替换
          try {
            if (Array.isArray(currentValue)) {
              // 清空后追加，而不是直接替换，避免可能的引用问题
              safeReplaceArray(currentValue, newValue);
              updatedCount++;
            } else {
              console.warn(`[思源同步] 无法将数组值应用到非数组属性: ${key}`);
            }
          } catch (err) {
            console.warn(`[思源同步] 替换数组属性 "${key}" 失败: ${err.message}`);
          }
        } else if (typeof currentValue === 'object' && !Array.isArray(currentValue) && currentValue !== null) {
          // 对象类型，安全合并
          try {
            // 使用浅合并避免递归太深
            Object.assign(currentValue, newValue);
            updatedCount++;
          } catch (err) {
            console.warn(`[思源同步] 合并对象属性 "${key}" 失败: ${err.message}`);
          }
        }
      } catch (keyError) {
        console.warn(`[思源同步] 应用Yjs属性 "${key}" 失败: ${keyError.message}`);
      }
    }
    
    console.log(`[思源同步] Yjs文档状态应用完成，成功更新${updatedCount}个属性`);
  } catch (err) {
    console.error(`[思源同步] 应用Yjs状态失败:`, err);
  }
}

/**
 * 安全地替换数组内容
 * @param {Array} target - 目标数组
 * @param {Array} source - 源数组
 */
function safeReplaceArray(target, source) {
  if (!Array.isArray(target) || !Array.isArray(source)) {
    throw new Error('目标和源必须都是数组');
  }
  
  try {
    // 方法1: 使用splice清空并添加
    target.splice(0, target.length, ...source);
    return;
  } catch (err1) {
    console.warn('[思源同步] 使用splice替换数组失败，尝试备用方法:', err1);
    
    try {
      // 方法2: 清空后逐个添加
      // 先清空数组
      while (target.length > 0) {
        target.pop();
      }
      
      // 再添加新元素
      for (let i = 0; i < source.length; i++) {
        target.push(source[i]);
      }
      return;
    } catch (err2) {
      console.warn('[思源同步] 使用pop/push替换数组也失败，使用最终备用方法:', err2);
      
      // 方法3: 使用数组索引直接赋值
      try {
        // 先设置长度
        target.length = source.length;
        
        // 再逐个赋值
        for (let i = 0; i < source.length; i++) {
          target[i] = source[i];
        }
      } catch (err3) {
        throw new Error(`无法替换数组: ${err3.message}`);
      }
    }
  }
}

/**
 * 深度合并对象
 * @param {Object} target - 目标对象
 * @param {Object} source - 源对象
 */
function mergeObjects(target, source) {
  // 目标对象类型检查
  if (!target || typeof target !== 'object') {
    console.warn('[思源同步] 合并目标不是对象，无法执行合并操作');
    return;
  }
  
  // 源对象类型检查
  if (!source || typeof source !== 'object') {
    console.warn('[思源同步] 合并源不是对象，无法执行合并操作');
    return;
  }
  
  // 防止数组被错误处理
  if (Array.isArray(target) !== Array.isArray(source)) {
    console.warn('[思源同步] 合并目标与源的类型不匹配(数组/对象)，执行替换');
    // 如果类型不一致，直接进行替换
    Object.keys(source).forEach(key => {
      target[key] = source[key];
    });
    return;
  }
  
  // 处理普通对象
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      
      // 如果源属性为null，直接赋值
      if (sourceValue === null) {
        target[key] = null;
        continue;
      }
      
      // 处理目标属性不存在的情况
      if (!(key in target)) {
        // 如果目标没有此属性，直接赋值
        if (typeof sourceValue === 'object') {
          // 对象需要深拷贝，避免引用问题
          target[key] = Array.isArray(sourceValue) ? [...sourceValue] : {...sourceValue};
        } else {
          target[key] = sourceValue;
        }
        continue;
      }
      
      // 目标也存在此属性
      const targetValue = target[key];
      
      // 如果两者都是对象，递归合并
      if (typeof sourceValue === 'object' && sourceValue !== null && 
          typeof targetValue === 'object' && targetValue !== null) {
        
        // 确保数组类型一致，避免将对象合并到数组
        if (Array.isArray(sourceValue) === Array.isArray(targetValue)) {
          // 递归合并对象或数组
          if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
            // 数组直接替换更安全
            target[key] = [...sourceValue];
          } else {
            // 对象正常合并
            mergeObjects(targetValue, sourceValue);
          }
        } else {
          // 类型不匹配时，直接替换
          target[key] = Array.isArray(sourceValue) ? [...sourceValue] : {...sourceValue};
        }
      } else {
        // 替换或添加属性
        target[key] = sourceValue;
      }
    }
  }
}

/**
 * 断开指定房间的思源 WebSocket 连接
 * @param {string} roomName - 房间名称
 * @returns {Promise<boolean>} 是否成功断开连接
 */
export function disconnect(roomName) {
  return new Promise((resolve) => {
    const conn = connections.get(roomName);
    if (!conn) {
      console.log(`[思源同步] 房间 ${roomName} 没有活跃连接，无需断开`);
      resolve(true);
      return;
    }
    
    // 清除重连定时器
    if (conn.reconnectTimer) {
      clearTimeout(conn.reconnectTimer);
      conn.reconnectTimer = null;
    }
    
    // 更新状态为正在断开连接
    conn.status = 'disconnecting';
    
    // 关闭WebSocket连接
    if (conn.socket) {
      try {
        // 临时保存连接处理函数，以便清理
        const originalHandlers = {
          onmessage: conn.socket.onmessage,
          onclose: conn.socket.onclose,
          onerror: conn.socket.onerror,
          onopen: conn.socket.onopen
        };
        
        // 先移除所有事件处理程序
        conn.socket.onmessage = null;
        conn.socket.onclose = null;
        conn.socket.onerror = null;
        conn.socket.onopen = null;
        
        // 设置一个新的onclose，仅用于跟踪关闭是否成功
        conn.socket.onclose = () => {
          console.log(`[思源同步] 房间 ${roomName} WebSocket连接已正常关闭`);
          conn.socket = null;
          conn.status = 'disconnected';
          resolve(true);
        };
        
        // 添加超时保护，避免长时间等待
        const closeTimeout = setTimeout(() => {
          console.warn(`[思源同步] 房间 ${roomName} WebSocket关闭超时，强制断开`);
          conn.socket = null;
          conn.status = 'disconnected';
          resolve(true);
        }, 2000); // 2秒超时
        
        // 尝试正常关闭连接
        if (conn.socket.readyState === WebSocket.OPEN || conn.socket.readyState === WebSocket.CONNECTING) {
          conn.socket.close();
        } else {
          // 连接已经不在开启状态，直接清理
          clearTimeout(closeTimeout);
          conn.socket = null;
          conn.status = 'disconnected';
          resolve(true);
        }
      } catch (err) {
        console.warn(`[思源同步] 关闭房间 ${roomName} WebSocket连接时出错:`, err);
        conn.socket = null;
        conn.status = 'disconnected';
        resolve(false);
      }
    } else {
      // 无活跃连接
      conn.status = 'disconnected';
      resolve(true);
    }
    
    // 清理分块同步状态
    cleanupChunkSync(roomName);
  });
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
 * 发送数据到思源笔记
 * @param {WebSocket} socket - WebSocket连接对象
 * @param {string} roomName - 房间名称
 * @param {Object} store - 存储对象
 * @param {string} [specificProp] - 可选，只同步特定属性
 * @param {any} [propValue] - 可选，特定属性的值
 * @returns {boolean} 是否成功发送
 */
function sendDataToSiyuan(socket, roomName, store, specificProp, propValue) {
  // 检查连接状态
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn('[思源同步] 无法发送数据：WebSocket未连接');
    return false;
  }

  try {
    // 准备要发送的数据
    let dataToSend;
    
    // 如果指定了特定属性和值，只发送这个属性
    if (specificProp !== undefined && propValue !== undefined) {
      dataToSend = { [specificProp]: propValue };
      console.log(`[思源同步] 准备发送单个属性: ${specificProp}`);
    } else {
      // 检查是否是Yjs文档
      const isYjsDocument = store._yjs || store.ydoc || store.doc || 
                          (store.state && (store.state._yjs || store.state.ydoc || store.state.doc));
      
      // 对Yjs文档进行特殊处理
      if (isYjsDocument) {
        console.log(`[思源同步] 检测到Yjs文档，执行安全提取`);
        dataToSend = extractSyncableDataFromYjs(store);
      } else if (store && store.state) {
        // 发送整个状态
        dataToSend = filterStateForSync(store.state);
      } else if (store) {
        // 直接发送store对象
        dataToSend = filterStateForSync(store);
      } else {
        console.warn('[思源同步] 没有有效数据可发送');
        return false;
      }
    }
    
    // 计算数据大小
    const jsonData = JSON.stringify(dataToSend);
    const dataSize = new Blob([jsonData]).size;
    const dataSizeKB = Math.round(dataSize / 1024);
    
    console.log(`[思源同步] 准备发送数据，大小: ${dataSizeKB}KB`);
    
    // 大型数据处理
    if (dataSize > 1024 * 1024) {  // 大于1MB
      console.warn(`[思源同步] 数据过大(${dataSizeKB}KB)，尝试压缩处理`);
      
      // 对大数据进行过滤压缩
      const compressedData = compressLargeState(dataToSend);
      const compressedJson = JSON.stringify(compressedData);
      const compressedSize = new Blob([compressedJson]).size;
      const compressedSizeKB = Math.round(compressedSize / 1024);
      
      console.log(`[思源同步] 压缩后数据大小: ${compressedSizeKB}KB`);
      
      // 如果压缩后仍然过大
      if (compressedSize > 1024 * 1024) {
        // 发送警告消息而不是完整数据
        socket.send(JSON.stringify({
          type: 'sync_warning',
          room: roomName,
          message: `数据过大(${dataSizeKB}KB)无法同步，请考虑减小数据量或分块同步`,
          timestamp: Date.now()
        }));
        console.error(`[思源同步] 数据过大无法同步，已发送警告消息`);
        return false;
      }
      
      // 使用压缩后的数据
      dataToSend = compressedData;
    }
    
    // 根据数据大小决定发送方式
    if (dataSize > 500 * 1024) {
      console.log(`[思源同步] 数据大小(${dataSizeKB}KB)超过阈值，使用分块发送`);
      return sendSplitData(dataToSend, { socket, room: roomName });
    }
    
    // 普通发送
    console.log(`[思源同步] 使用普通方式发送数据(${dataSizeKB}KB)`);
    socket.send(JSON.stringify({
      type: 'sync',
      room: roomName,
      state: dataToSend,
      timestamp: Date.now()
    }));
    
    return true;
  } catch (err) {
    console.error('[思源同步] 发送数据失败:', err);
    return false;
  }
}

/**
 * 从Yjs文档中安全提取可同步的数据
 * @param {Object} store - Yjs存储对象
 * @returns {Object} 可安全同步的数据
 */
function extractSyncableDataFromYjs(store) {
  try {
    // 确定实际状态对象位置
    let actualState = null;
    
    // 尝试不同路径找到合适的状态对象
    if (store.state && typeof store.state === 'object' && !isYjsLikeObject(store.state)) {
      actualState = store.state;
    } else if (store._prelimState && typeof store._prelimState === 'object') {
      actualState = store._prelimState;
    } else if (store._state && typeof store._state === 'object') {
      actualState = store._state;
    } else if (!isYjsLikeObject(store)) {
      // 如果store本身不是Yjs对象，可以直接使用
      actualState = store;
    }
    
    if (!actualState) {
      console.warn('[思源同步] 无法确定可同步的状态对象，返回空对象');
      return {};
    }
    
    // 创建新对象保存结果
    const result = {};
    
    // 获取所有可枚举属性
    const keys = Object.keys(actualState);
    
    // 遍历并安全提取数据
    for (const key of keys) {
      try {
        // 跳过内部属性和函数
        if (key.startsWith('$') || key.startsWith('_') || typeof actualState[key] === 'function') {
          continue;
        }
        
        // 提取数据
        const value = actualState[key];
        
        // 跳过Yjs类型的对象
        if (isYjsLikeObject(value)) {
          continue;
        }
        
        // 处理不同类型的数据
        if (value === null || value === undefined) {
          result[key] = value;
        } else if (typeof value !== 'object') {
          // 基本类型直接复制
          result[key] = value;
        } else if (Array.isArray(value)) {
          // 数组进行浅拷贝
          result[key] = [...value];
        } else {
          // 对象进行浅拷贝，避免循环引用
          try {
            result[key] = {...value};
          } catch (err) {
            console.warn(`[思源同步] 提取对象属性 "${key}" 失败，跳过此属性`);
          }
        }
      } catch (err) {
        console.warn(`[思源同步] 提取属性 "${key}" 时出错: ${err.message}`);
      }
    }
    
    console.log(`[思源同步] 从Yjs文档中提取了${Object.keys(result).length}个可同步属性`);
    return result;
  } catch (err) {
    console.error(`[思源同步] 从Yjs文档提取数据失败:`, err);
    return {}; // 返回空对象作为降级处理
  }
}

/**
 * 压缩大型状态对象，移除冗余数据
 * @param {Object} state - 原始状态对象
 * @returns {Object} 压缩后的状态对象
 */
function compressLargeState(state) {
  if (!state || typeof state !== 'object') return state;
  
  // 创建压缩后的结果
  const result = Array.isArray(state) ? [] : {};
  
  // 处理数组
  if (Array.isArray(state)) {
    // 限制数组长度
    const MAX_ARRAY_LENGTH = 1000;
    if (state.length > MAX_ARRAY_LENGTH) {
      console.warn(`[思源同步] 数组过长 (${state.length}项)，截断到${MAX_ARRAY_LENGTH}项`);
      for (let i = 0; i < MAX_ARRAY_LENGTH; i++) {
        result[i] = compressLargeState(state[i]);
      }
      return result;
    }
    
    // 正常处理数组
    for (let i = 0; i < state.length; i++) {
      result[i] = compressLargeState(state[i]);
    }
    return result;
  }
  
  // 处理对象
  const keys = Object.keys(state);
  
  // 限制对象属性数量
  const MAX_KEYS = 500;
  if (keys.length > MAX_KEYS) {
    console.warn(`[思源同步] 对象属性过多 (${keys.length}个)，限制到${MAX_KEYS}个`);
    // 只保留前MAX_KEYS个属性
    for (let i = 0; i < MAX_KEYS; i++) {
      const key = keys[i];
      result[key] = compressLargeState(state[key]);
    }
    return result;
  }
  
  // 正常处理对象
  for (const key of keys) {
    // 跳过以$开头的属性和函数
    if (key.startsWith('$') || typeof state[key] === 'function') {
      continue;
    }
    
    // 处理值
    const value = state[key];
    
    // 字符串截断
    if (typeof value === 'string' && value.length > 10000) {
      result[key] = value.substring(0, 10000) + '...[截断]';
      continue;
    }
    
    // 递归处理对象和数组
    if (value !== null && typeof value === 'object') {
      result[key] = compressLargeState(value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
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