/**
 * @fileoverview 提供基于Yjs的实时协作状态管理功能
 * 
 * 该模块实现了以下核心功能：
 * - 基于WebRTC的P2P实时数据同步
 * - 自适应的同步间隔调整
 * - 自动重连和故障恢复
 * - IndexedDB本地持久化
 * - 网络诊断和性能监控
 * 
 * @module createSyncStore
 * @requires vue
 * @requires @syncedstore/core
 * @requires y-webrtc
 * @requires y-indexeddb
 * @requires yjs
 */

import { ref, watch } from '../../../../static/vue.esm-browser.js'
import { selectBestServers } from './useYjsSignalServers.js'
import { createDefaultAutoSyncConfig } from './forAutoSync.js'
import {
  diagnoseConnection,
  getConnectionQualityRating,
  generateDiagnosticMessage
} from './useNetworkDiagnostics.js'

// 导入管理器模块
import siyuanManager from './useSiyuanIntegration.js'
import documentManager, { resetRoomConnection } from './useDocumentManager.js'
import { createConnectionManager } from './useConnectionManager.js'
import { createPersistenceManager } from './usePersistenceManager.js'
import { createSyncManager } from './useSyncManager.js'

// 配置常量
const DEFAULT_ROOM_NAME = 'default-room'
const CONNECT_DELAY = 100
const DEFAULT_WEBRTC_CONFIG = {
  peerOpts: {
    config: {
      iceTransportPolicy: 'all',
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      sdpSemantics: 'unified-plan'
    },
    trickle: true
  },
  pingInterval: 3000,
  maxConns: 20,
  connect: false,
  filterBcConns: true,
  maxRetries: 10
}

/**
 * 创建与Vue集成的同步状态管理器
 * @param {Object} options - 配置选项
 * @param {string} [options.roomName='default-room'] - 房间名称
 * @param {Object} [options.initialState={}] - 初始状态
 * @param {boolean} [options.persist=true] - 是否启用本地持久化
 * @param {Object} [options.webrtcOptions={}] - WebRTC连接配置
 * @param {boolean} [options.autoConnect=true] - 是否自动建立连接
 * @param {Object} [options.retryStrategy] - 重连策略
 * @param {number} [options.retryStrategy.maxRetries=5] - 最大重试次数
 * @param {number} [options.retryStrategy.initialDelay=1000] - 初始重试延迟(ms)
 * @param {number} [options.retryStrategy.maxDelay=30000] - 最大重试延迟(ms)
 * @param {Object} [options.autoSync] - 自动同步配置
 * @param {boolean} [options.forceNewDoc=false] - 是否强制创建新文档
 * @param {Object} [options.siyuan] - 思源同步配置
 * @param {boolean} [options.disableWebRTC=false] - 是否禁用WebRTC连接
 * @param {number} [options.loadTimeout=5000] - 本地数据加载超时时间(ms)
 * @returns {Promise<Object>} 同步状态管理器实例
 */
export async function createSyncStore(options = {}) {
  const {
    roomName = DEFAULT_ROOM_NAME,
    initialState = {},
    persist = true,
    webrtcOptions = {},
    autoConnect = true,
    retryStrategy = {
      maxRetries: 5,
      initialDelay: 1000,
      maxDelay: 30000
    },
    autoSync = {
      ...createDefaultAutoSyncConfig(),
      ...options.autoSync
    },
    forceNewDoc = false,
    // 思源相关配置
    siyuan = {
      enabled: false,
      ...siyuanManager.config,
      ...options.siyuan
    },
    // 新增：是否禁用WebRTC选项
    disableWebRTC = false,
    // 新增：本地数据加载超时
    loadTimeout = 5000
  } = options

  // 创建响应式状态
  const isConnected = ref(false)
  const status = ref('初始化中')
  const isLocalDataLoaded = ref(false)

  // 获取或创建文档
  const docState = await documentManager.getDocument(roomName, { forceNewDoc })
  const { doc: ydoc, store, isExisting } = docState

  // 初始化状态（如果是新文档）
  if (!isExisting && Object.keys(initialState).length > 0) {
    initializeState(store, initialState)
  }

  // 使用持久化管理器处理本地数据
  const persistenceManager = persist 
    ? await setupPersistence(roomName, ydoc, initialState, store, status, isLocalDataLoaded, { loadTimeout })
    : handleNoPersistence(initialState, store, isLocalDataLoaded);

  // 连接思源
  let siyuanSocket = null;
  
  // 判断是否应该启用思源WebSocket连接
  // 当明确启用思源连接或者禁用WebRTC时优先使用思源连接
  const shouldUseSiyuan = siyuan.enabled || disableWebRTC;
  
  if (shouldUseSiyuan) {
    try {
      console.log(`[同步存储] 房间 ${roomName} 启用思源WebSocket连接`);
      siyuanSocket = await connectToSiyuan(roomName, {
        ...siyuan,
        enabled: true  // 确保启用思源连接
      }, store);
      
      if (siyuanSocket) {
        isConnected.value = true;
        status.value = '已连接(思源)';
        console.log(`[同步存储] 房间 ${roomName} 思源WebSocket连接成功`);
      } else {
        console.warn(`[同步存储] 房间 ${roomName} 思源WebSocket连接失败`);
      }
    } catch (err) {
      console.error(`[同步存储] 房间 ${roomName} 思源WebSocket连接出错:`, err);
    }
  }

  // 判断是否使用WebRTC - 只有在未禁用WebRTC且非强制使用思源时才使用WebRTC
  const useWebRTC = !disableWebRTC && !(siyuanSocket && shouldUseSiyuan);
  
  // 只有在需要使用WebRTC时才选择服务器和创建连接
  let provider = null;
  let connectionManager = null;
  
  if (useWebRTC) {
    // 选择最佳服务器
    status.value = '正在选择最佳服务器...'
    const bestServers = await selectBestServers()
    
    // 合并WebRTC选项
    const mergedWebRtcOptions = mergeWebRtcOptions(webrtcOptions, bestServers)

    // 获取或创建连接
    provider = await documentManager.getConnection(
      roomName, 
      ydoc, 
      mergedWebRtcOptions
    )

    // 创建连接管理器
    connectionManager = createConnectionManager({
      provider,
      roomName,
      retryStrategy,
      documentManager,
      ydoc,
      webrtcOptions: mergedWebRtcOptions,
      status,
      isConnected
    })

    // 如果设置了自动连接，则立即连接
    if (autoConnect) {
      setTimeout(() => connectionManager.connect(), CONNECT_DELAY)
    }
  } else {
    // 使用思源WebSocket时，使用空的连接管理器
    status.value = shouldUseSiyuan ? '使用思源WebSocket同步' : '未启用同步'
    console.log(`[同步存储] 房间 ${roomName} ${shouldUseSiyuan ? '使用思源WebSocket同步' : '未启用同步'}`);
    
    // 为避免空值错误，创建一个空的连接管理器
    connectionManager = {
      connect: () => false,
      disconnect: () => false,
      reconnect: () => false,
      getProvider: () => null,
      isConnected: () => shouldUseSiyuan && siyuanSocket !== null
    }
    
    // 如果思源WebSocket连接成功，设置连接状态
    if (shouldUseSiyuan && siyuanSocket !== null) {
      isConnected.value = true;
    }
  }

  // 创建同步管理器
  const syncManager = createSyncManager({
    ydoc,
    store,
    roomName,
    autoSync,
    getProvider: connectionManager.getProvider,
    siyuanSocket
  })

  // 只有在使用WebRTC时才获取provider和设置事件监听
  if (useWebRTC) {
    // 获取连接管理器中的provider
    provider = connectionManager.getProvider()
    
    // 设置连接和同步事件监听
    setupEventListeners(provider, isConnected, syncManager)
  }
  
  // 创建断开连接函数
  const disconnect = createDisconnectFunction(
    connectionManager, 
    syncManager, 
    persistenceManager, 
    documentManager, 
    roomName, 
    siyuanManager, 
    siyuanSocket
  )
  
  // 添加诊断功能
  const getDiagnostics = createDiagnosticsFunction(
    connectionManager, 
    syncManager, 
    persistenceManager, 
    roomName, 
    store
  )

  // 添加清除本地数据的功能
  const clearLocalData = async () => {
    return persistenceManager ? await persistenceManager.clearLocalData() : false
  }

  // 使用独立的 Map 存储事件处理器，避免在 store 对象上添加属性
  const eventHandlers = new Map();
  
  // 创建结果对象
  const result = {
    // 存储和文档
    store,
    ydoc,
    
    // 状态
    status,
    isConnected,
    isLocalDataLoaded,
    
    // 连接方法
    connect: connectionManager.connect,
    disconnect,
    reconnect: connectionManager.reconnect,
    
    // 同步方法
    sync: () => syncManager.triggerSync(),
    
    // 持久化方法
    clearLocalData,
    
    // 诊断
    getDiagnostics,
    
    // 获取提供者和连接节点
    getProvider: connectionManager.getProvider,
    getPeers: () => {
      const provider = connectionManager.getProvider();
      
      // 思源WebSocket连接
      if (siyuanSocket) {
        return new Set(['siyuan-ws']);
      }
      
      // WebRTC连接
      if (provider && provider.connected) {
        // 如果provider提供了getPeers方法
        if (provider.getPeers) {
          return provider.getPeers();
        }
        
        // 旧版本兼容 - Y-WebRTC提供者
        if (provider.signalingConns) {
          return new Set(Object.keys(provider.signalingConns));
        }
      }
      
      return new Set();
    },
    
    // 部分状态更新 - 只更新状态树的指定属性，避免发送整个状态
    setPartialState: function(type, key, propName, propValue) {
      if (!store || !store.store || !store.store.state) return false;
      
      try {
        // 确保类型存在
        if (!store.store.state[type]) {
          store.store.state[type] = {};
        }
        
        // 确保key存在
        if (!store.store.state[type][key]) {
          store.store.state[type][key] = {};
        }
        
        // 安全克隆属性值
        let safeValue;
        if (propValue !== null && typeof propValue === 'object') {
          try {
            safeValue = JSON.parse(JSON.stringify(propValue));
          } catch (err) {
            console.error(`[SyncStore] 属性序列化失败:`, err);
            safeValue = propValue; // 降级使用原始值
          }
        } else {
          safeValue = propValue;
        }
        
        // 只更新指定属性 
        store.store.state[type][key][propName] = safeValue;
        
        // 如果有主动同步函数，则调用
        if (store.sync) {
          setTimeout(() => store.sync(), 0);
        }
        
        // 发送同步消息大小统计
        const dataSize = JSON.stringify(safeValue).length;
        if (dataSize > 1024 * 50) { // 超过50KB
          console.log(`[SyncStore] 同步数据大小: ${Math.round(dataSize/1024)}KB (${propName})`);
        }
        
        return true;
      } catch (err) {
        console.error(`[SyncStore] 部分状态更新失败:`, err);
        return false;
      }
    },
    
    // 事件处理器对象
    _eventHandlers: eventHandlers,
    
    // 事件处理 - 使用独立的 Map
    on(eventName, callback) {
      if (!eventHandlers.has(eventName)) {
        eventHandlers.set(eventName, []);
      }
      
      eventHandlers.get(eventName).push(callback);
      return this;
    },
    
    off(eventName, callback) {
      if (!eventHandlers.has(eventName)) return this;
      
      if (callback) {
        const handlers = eventHandlers.get(eventName);
        eventHandlers.set(eventName, handlers.filter(cb => cb !== callback));
      } else {
        eventHandlers.set(eventName, []);
      }
      
      return this;
    },
    
    emit(eventName, ...args) {
      if (!eventHandlers.has(eventName)) return this;
      
      const handlers = eventHandlers.get(eventName);
      for (const callback of handlers) {
        try {
          callback(...args);
        } catch (error) {
          console.error(`[SyncStore] 事件处理错误: ${eventName}`, error);
        }
      }
      
      return this;
    }
  };
  
  // 将连接存储在缓存中
  documentManager.connections.set(roomName, result)
  
  return result
}

/**
 * 初始化状态对象
 * @param {Object} store - 存储对象
 * @param {Object} initialState - 初始状态
 */
function initializeState(store, initialState) {
  Object.entries(initialState).forEach(([key, value]) => {
    if (!(key in store.state)) {
      store.state[key] = value
    }
  })
}

/**
 * 设置持久化管理器
 * @param {string} roomName - 房间名
 * @param {Object} ydoc - Y.Doc实例
 * @param {Object} initialState - 初始状态
 * @param {Object} store - 存储对象
 * @param {Object} status - 状态引用
 * @param {Object} isLocalDataLoaded - 本地数据加载状态引用
 * @param {Object} options - 额外选项
 * @param {number} [options.loadTimeout] - 加载超时时间(ms)
 * @returns {Object} 持久化管理器实例
 */
async function setupPersistence(roomName, ydoc, initialState, store, status, isLocalDataLoaded, options = {}) {
  // 创建持久化管理器
  const persistenceManager = await createPersistenceManager({
    roomName,
    ydoc,
    initialState,
    store,
    status,
    isLocalDataLoaded
  })
  
  // 初始化并加载本地数据，使用可选的超时时间
  await persistenceManager.initAndLoad(options.loadTimeout)
  
  return persistenceManager
}

/**
 * 处理无持久化情况
 * @param {Object} initialState - 初始状态
 * @param {Object} store - 存储对象
 * @param {Object} isLocalDataLoaded - 本地数据加载状态引用
 * @returns {Object} 空持久化管理器
 */
function handleNoPersistence(initialState, store, isLocalDataLoaded) {
  // 直接标记为已加载
  isLocalDataLoaded.value = true
  
  // 返回空管理器
  return {
    initialize: async () => true,
    saveData: async () => true,
    loadData: async () => true,
    clearLocalData: async () => true,
    destroy: () => true
  }
}

/**
 * 合并WebRTC选项
 * @param {Object} userOptions - 用户提供的选项
 * @param {Array} bestServers - 最佳服务器列表
 * @returns {Object} 合并后的选项
 */
function mergeWebRtcOptions(userOptions, bestServers) {
  // 合并默认配置与用户配置
  const mergedOptions = {
    ...DEFAULT_WEBRTC_CONFIG,
    ...userOptions
  }
  
  // 如果找到了服务器，则使用它们
  if (bestServers && bestServers.length > 0) {
    mergedOptions.signaling = bestServers
  }
  
  return mergedOptions
}

/**
 * 连接到思源WebSocket
 * @param {string} roomName - 房间名称
 * @param {Object} config - 思源配置
 * @param {Object} store - 数据存储
 * @returns {Promise<WebSocket|null>} WebSocket实例或null
 */
async function connectToSiyuan(roomName, config, store) {
  try {
    console.log(`[思源同步] 房间 ${roomName} 开始连接到思源WebSocket`);
    
    // 更新思源配置
    siyuanManager.updateConfig(config);
    
    // 连接到思源WebSocket
    const socket = await siyuanManager.connect(roomName, config);
    
    if (!socket) {
      console.error(`[思源同步] 房间 ${roomName} 连接到思源WebSocket失败`);
      return null;
    }
    
    // 添加消息处理程序
    siyuanManager.addMessageHandler(roomName, (message) => {
      try {
        if (message.type === 'sync' && message.state) {
          console.log(`[思源同步] 房间 ${roomName} 收到同步数据，正在合并...`);
          
          // 合并远程数据到本地状态
          mergeRemoteState(store.state, message.state);
          
          // 查找在文档管理器中注册的同步结果对象
          const syncResult = documentManager.connections.get(roomName);
          if (syncResult && syncResult._eventHandlers) {
            // 使用同步结果对象上的事件处理器，而不是store
            const eventHandlers = syncResult._eventHandlers;
            if (eventHandlers.has('sync')) {
              const syncHandlers = eventHandlers.get('sync');
              for (const handler of syncHandlers) {
                try {
                  handler(message.state);
                } catch (error) {
                  console.error(`[思源同步] 同步事件处理器执行出错:`, error);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`[思源同步] 处理消息出错:`, error);
      }
    });
    
    // 每10秒发送一次心跳保持连接
    const heartbeatInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(JSON.stringify({
            type: 'heartbeat',
            room: roomName,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.warn(`[思源同步] 发送心跳包失败:`, e);
        }
      }
    }, 10000);
    
    // 保存心跳定时器，以便在断开连接时清理
    const connState = siyuanManager.getConnectionStatus(roomName);
    if (connState) {
      connState.heartbeatInterval = heartbeatInterval;
    }
    
    // 初始化时发送一次完整数据
    setTimeout(() => {
      sendDataToSiyuan(socket, roomName, store);
    }, 500);
    
    console.log(`[思源同步] 房间 ${roomName} 连接到思源WebSocket成功`);
    return socket;
  } catch (error) {
    console.error(`[思源同步] 连接到思源WebSocket出错:`, error);
    return null;
  }
}

/**
 * 发送数据到思源笔记
 * @param {Object} state - 要发送的状态对象
 * @param {Object} connection - WebSocket连接对象
 * @param {boolean} [forceSplit=false] - 是否强制使用分块发送
 * @returns {boolean} 是否成功发送
 */
function sendDataToSiyuan(state, connection, forceSplit = false) {
  // 检查连接状态
  if (!connection || !connection.socket || connection.socket.readyState !== WebSocket.OPEN) {
    console.warn('[思源同步] 无法发送数据：WebSocket未连接');
    return false;
  }

  try {
    // 过滤和准备数据
    const filteredState = filterStateForSync(state);
    
    // 计算数据大小
    const jsonData = JSON.stringify(filteredState);
    const dataSize = new Blob([jsonData]).size;
    const dataSizeKB = Math.round(dataSize / 1024);
    
    console.log(`[思源同步] 准备发送数据，大小: ${dataSizeKB}KB`);
    
    // 如果数据大于500KB或强制分块，则使用分块发送
    if (forceSplit || dataSize > 500 * 1024) {
      console.log(`[思源同步] 数据大小(${dataSizeKB}KB)超过阈值，使用分块发送`);
      return sendSplitData(filteredState, connection);
    }
    
    // 否则使用普通发送
    console.log(`[思源同步] 使用普通方式发送数据(${dataSizeKB}KB)`);
    connection.socket.send(JSON.stringify({
      type: 'sync',
      room: connection.room,
      state: filteredState,
      timestamp: Date.now()
    }));
    
    return true;
  } catch (err) {
    console.error('[思源同步] 发送数据失败:', err);
    return false;
  }
}

/**
 * 将状态对象过滤和准备用于同步
 * @param {Object} state - 原始状态对象
 * @param {Object} [options] - 过滤选项
 * @param {number} [options.maxDepth=20] - 最大递归深度
 * @returns {Object} 过滤后的状态对象
 */
function filterStateForSync(state, options = {}) {
  const { maxDepth = 20 } = options;
  
  // 用于记录已处理对象，避免循环引用
  const processedObjects = new WeakMap();
  
  // 过滤函数
  function filter(obj, depth = 0) {
    // 处理基本类型
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    
    // 检查深度限制
    if (depth > maxDepth) {
      console.warn('[思源同步] 达到最大递归深度，截断对象');
      return '[过深对象已截断]';
    }
    
    // 处理数组
    if (Array.isArray(obj)) {
      // 检查数组长度
      if (obj.length > 10000) {
        console.warn('[思源同步] 数组过长，截断到10000项');
        const truncated = obj.slice(0, 10000);
        truncated.push('[数组已截断]');
        return truncated.map(item => filter(item, depth + 1));
      }
      return obj.map(item => filter(item, depth + 1));
    }
    
    // 处理循环引用
    if (processedObjects.has(obj)) {
      return '[循环引用已移除]';
    }
    
    // 记录当前对象
    processedObjects.set(obj, true);
    
    // 过滤对象属性
    const result = {};
    for (const key in obj) {
      // 跳过私有属性和函数
      if (key.startsWith('_') || key.startsWith('$') || typeof obj[key] === 'function') {
        continue;
      }
      
      // 处理长字符串
      if (typeof obj[key] === 'string' && obj[key].length > 10000) {
        result[key] = obj[key].substring(0, 10000) + '...[字符串已截断]';
        continue;
      }
      
      // 递归处理对象属性
      result[key] = filter(obj[key], depth + 1);
    }
    
    return result;
  }
  
  // 开始过滤
  return filter(state);
}

/**
 * 使用分块方式发送大型数据
 * @param {Object} data - 要发送的数据对象
 * @param {Object} connection - WebSocket连接对象
 * @returns {boolean} 是否成功发送
 */
function sendSplitData(data, connection) {
  if (!connection || !connection.socket || connection.socket.readyState !== WebSocket.OPEN) {
    console.warn('[思源同步] 无法使用分块发送：WebSocket未连接');
    return false;
  }
  
  try {
    const keys = Object.keys(data);
    if (keys.length === 0) {
      console.warn('[思源同步] 没有数据可发送');
      return false;
    }
    
    // 发送开始消息
    connection.socket.send(JSON.stringify({
      type: 'sync_start',
      room: connection.room,
      timestamp: Date.now()
    }));
    
    // 发送索引（键列表）
    connection.socket.send(JSON.stringify({
      type: 'sync_index',
      room: connection.room,
      keys: keys,
      timestamp: Date.now()
    }));
    
    // 记录开始时间
    const startTime = Date.now();
    
    // 发送每个键值对作为单独的块
    let sentCount = 0;
    let errorCount = 0;
    
    for (const key of keys) {
      try {
        connection.socket.send(JSON.stringify({
          type: 'sync_chunk',
          room: connection.room,
          key: key,
          value: data[key],
          index: sentCount,
          total: keys.length,
          timestamp: Date.now()
        }));
        
        sentCount++;
        
        // 每5个块记录一次进度
        if (sentCount % 5 === 0 || sentCount === keys.length) {
          const progress = Math.round((sentCount / keys.length) * 100);
          console.log(`[思源同步] 分块发送进度: ${progress}%（${sentCount}/${keys.length}）`);
        }
      } catch (chunkErr) {
        console.error(`[思源同步] 发送数据块 "${key}" 失败:`, chunkErr);
        errorCount++;
      }
    }
    
    // 发送结束消息
    const duration = Date.now() - startTime;
    
    if (errorCount > 0) {
      // 发送错误消息
      connection.socket.send(JSON.stringify({
        type: 'sync_error',
        room: connection.room,
        message: `部分数据块发送失败(${errorCount}/${keys.length})`,
        timestamp: Date.now()
      }));
      
      console.warn(`[思源同步] 分块发送部分失败: ${errorCount}/${keys.length} 块出错，用时 ${duration}ms`);
      return false;
    }
    
    // 发送完成消息
    connection.socket.send(JSON.stringify({
      type: 'sync_end',
      room: connection.room,
      stats: {
        chunks: sentCount,
        duration: duration
      },
      timestamp: Date.now()
    }));
    
    console.log(`[思源同步] 分块发送完成: ${sentCount} 块，用时 ${duration}ms`);
    return true;
  } catch (err) {
    console.error('[思源同步] 分块发送过程中出错:', err);
    
    try {
      // 尝试发送错误消息
      connection.socket.send(JSON.stringify({
        type: 'sync_error',
        room: connection.room,
        message: err.message || '未知错误',
        timestamp: Date.now()
      }));
    } catch (sendErr) {
      console.error('[思源同步] 无法发送错误消息:', sendErr);
    }
    
    return false;
  }
}

/**
 * 合并远程状态到本地状态
 * @param {Object} localState - 本地状态
 * @param {Object} remoteState - 远程状态
 * @param {number} depth - 递归深度
 */
function mergeRemoteState(localState, remoteState, depth = 0) {
  // 添加深度限制，防止无限递归
  const MAX_DEPTH = 5;
  if (depth > MAX_DEPTH) {
    console.warn('[思源同步] 达到最大递归深度，避免栈溢出');
    return;
  }
  
  // 基本检查
  if (!localState || !remoteState || typeof localState !== 'object' || typeof remoteState !== 'object') {
    return; // 确保两个参数都是对象
  }
  
  try {
    // 获取所有远程键
    const remoteKeys = Object.keys(remoteState);
    
    // 遍历远程状态的所有键
    for (let i = 0; i < remoteKeys.length; i++) {
      const key = remoteKeys[i];
      
      // 跳过心跳字段和内部字段
      if (key === '_heartbeat_' || key.startsWith('$')) continue;
      
      try {
        // 获取远程值
        const remoteValue = remoteState[key];
        
        // 如果远程值为null，直接同步
        if (remoteValue === null) {
          localState[key] = null;
          continue;
        }
        
        // 处理数组类型
        if (Array.isArray(remoteValue)) {
          // 数组需要安全处理，很多错误发生在这里
          handleArraySync(localState, key, remoteValue);
        }
        // 处理普通对象类型
        else if (typeof remoteValue === 'object' && remoteValue !== null) {
          // 对象需要安全处理
          handleObjectSync(localState, key, remoteValue, depth);
        } 
        // 处理基础类型
        else {
          // 只有在值不同时才更新，减少不必要的操作
          if (localState[key] !== remoteValue) {
            try {
              localState[key] = remoteValue;
            } catch (err) {
              console.error(`[思源同步] 设置基本属性出错 (${key}):`, err);
              // 尝试使用Vue的set方法作为备用
              if (window.Vue && window.Vue.set) {
                try {
                  window.Vue.set(localState, key, remoteValue);
                } catch (finalErr) {
                  // 放弃此属性的同步
                  console.error(`[思源同步] 最终设置失败 (${key}):`, finalErr);
                }
              }
            }
          }
        }
      } catch (keyError) {
        console.error(`[思源同步] 处理键 ${key} 时出错:`, keyError);
        // 继续处理下一个键，不要因为一个键的错误而中断整个过程
        continue;
      }
    }
  } catch (err) {
    console.error('[思源同步] 合并状态时出错:', err);
  }
}

/**
 * 安全地处理数组同步
 * @param {Object} localState - 本地状态对象
 * @param {string} key - 数组属性键名
 * @param {Array} remoteArray - 远程数组值
 */
function handleArraySync(localState, key, remoteArray) {
  try {
    // 如果本地不存在此属性或不是数组，创建一个新数组
    if (!localState[key] || !Array.isArray(localState[key])) {
      try {
        // 创建一个新的空数组
        localState[key] = [];
      } catch (err) {
        console.error(`[思源同步] 创建数组失败 (${key}):`, err);
        // 如果直接赋值失败，尝试使用Vue的set方法
        if (window.Vue && window.Vue.set) {
          window.Vue.set(localState, key, []);
        } else {
          // 无法处理，跳过
          return;
        }
      }
    }
    
    // 获取本地数组的引用
    const localArray = localState[key];
    
    // 检查是否为空数组，这是一种特殊情况
    if (remoteArray.length === 0) {
      safeEmptyArray(localArray);
      return;
    }
    
    // 检查是否为简单数组
    const isSimpleArray = remoteArray.every(item => 
      item === null || 
      item === undefined || 
      typeof item !== 'object'
    );
    
    // 使用不同的策略处理简单数组和复杂数组
    if (isSimpleArray) {
      // 简单数组可以直接替换
      safeReplaceSimpleArray(localArray, remoteArray);
    } else {
      // 复杂数组需要特殊处理
      safeReplaceComplexArray(localArray, remoteArray);
    }
  } catch (err) {
    console.error(`[思源同步] 处理数组出错 (${key}):`, err);
    // 在发生错误的情况下，尝试使用Vue的全局方法替换整个数组
    // 这不会保留原数组的响应式特性，但至少能更新数据
    try {
      if (window.Vue && window.Vue.set) {
        window.Vue.set(localState, key, [...remoteArray]);
      } else {
        // 最后的尝试 - 这可能会破坏响应式
        localState[key] = [...remoteArray];
      }
    } catch (finalErr) {
      console.error(`[思源同步] 无法更新数组 (${key}), 放弃同步此属性:`, finalErr);
    }
  }
}

/**
 * 安全地处理对象同步
 * @param {Object} localState - 本地状态对象
 * @param {string} key - 对象属性键名
 * @param {Object} remoteObj - 远程对象值
 * @param {number} depth - 递归深度
 */
function handleObjectSync(localState, key, remoteObj, depth) {
  try {
    // 如果本地不存在此属性或不是对象或是数组，创建新对象
    if (!localState[key] || typeof localState[key] !== 'object' || Array.isArray(localState[key])) {
      try {
        // 创建一个新的空对象
        localState[key] = {};
      } catch (err) {
        console.error(`[思源同步] 创建对象失败 (${key}):`, err);
        // 如果直接赋值失败，尝试使用Vue的set方法
        if (window.Vue && window.Vue.set) {
          window.Vue.set(localState, key, {});
        } else {
          // 无法处理，跳过
          return;
        }
      }
    }
    
    // 递归合并子对象 - 传递深度参数，避免无限递归
    mergeRemoteState(localState[key], remoteObj, depth + 1);
  } catch (err) {
    console.error(`[思源同步] 处理对象出错 (${key}):`, err);
    // 失败时尝试浅拷贝
    try {
      if (window.Vue && window.Vue.set) {
        window.Vue.set(localState, key, {...remoteObj});
      } else {
        // 这可能会破坏响应式
        localState[key] = {...remoteObj};
      }
    } catch (finalErr) {
      console.error(`[思源同步] 无法更新对象 (${key}), 放弃同步此属性:`, finalErr);
    }
  }
}

/**
 * 安全地清空数组
 * @param {Array} array - 要清空的数组
 */
function safeEmptyArray(array) {
  try {
    // 首选方法：设置长度为0
    array.length = 0;
  } catch (err) {
    console.warn(`[思源同步] 使用length=0清空数组失败，尝试备用方法:`, err);
    try {
      // 备用方法：使用splice
      array.splice(0, array.length);
    } catch (err2) {
      console.warn(`[思源同步] 使用splice清空数组也失败，尝试逐个移除:`, err2);
      // 最后尝试：逐个移除元素
      while (array.length > 0) {
        try {
          array.pop();
        } catch (e) {
          console.error(`[思源同步] 无法清空数组，放弃:`, e);
          break;
        }
      }
    }
  }
}

/**
 * 安全地替换简单数组内容
 * @param {Array} localArray - 本地数组
 * @param {Array} remoteArray - 远程数组
 */
function safeReplaceSimpleArray(localArray, remoteArray) {
  // 先清空本地数组
  safeEmptyArray(localArray);
  
  // 逐个添加元素
  for (let i = 0; i < remoteArray.length; i++) {
    try {
      localArray.push(remoteArray[i]);
    } catch (err) {
      console.warn(`[思源同步] 添加数组元素失败，索引 ${i}:`, err);
    }
  }
}

/**
 * 安全地替换复杂数组内容
 * @param {Array} localArray - 本地数组
 * @param {Array} remoteArray - 远程数组
 */
function safeReplaceComplexArray(localArray, remoteArray) {
  // 先清空本地数组
  safeEmptyArray(localArray);
  
  // 逐个处理元素
  for (let i = 0; i < remoteArray.length; i++) {
    try {
      const item = remoteArray[i];
      
      // null和undefined直接添加
      if (item === null || item === undefined) {
        localArray.push(item);
        continue;
      }
      
      // 基本类型直接添加
      if (typeof item !== 'object') {
        localArray.push(item);
        continue;
      }
      
      // 数组类型 - 浅拷贝
      if (Array.isArray(item)) {
        const newArray = item.map(elem => elem); // 简单浅拷贝
        localArray.push(newArray);
        continue;
      }
      
      // 对象类型 - 浅拷贝
      const newObj = {};
      const itemKeys = Object.keys(item);
      
      // 复制所有直接属性，不递归处理嵌套对象
      for (let j = 0; j < itemKeys.length; j++) {
        const propKey = itemKeys[j];
        // 跳过内部属性
        if (propKey.startsWith('$') || propKey.startsWith('_') || typeof item[propKey] === 'function') {
          continue;
        }
        
        try {
          newObj[propKey] = item[propKey];
        } catch (err) {
          console.warn(`[思源同步] 复制对象属性失败 (${propKey}):`, err);
        }
      }
      
      localArray.push(newObj);
    } catch (err) {
      console.warn(`[思源同步] 处理复杂数组元素失败，索引 ${i}:`, err);
      // 尝试添加一个空对象作为占位符
      try {
        localArray.push({});
      } catch (e) {
        console.error(`[思源同步] 无法添加占位符:`, e);
      }
    }
  }
}

/**
 * 设置连接事件监听
 * @param {Object} provider - WebRTC提供者实例
 * @param {Object} isConnected - 连接状态引用
 * @param {Object} syncManager - 同步管理器实例
 */
function setupEventListeners(provider, isConnected, syncManager) {
  if (!provider) return;

  provider.on('status', event => {
    if (event.status === 'connected') {
      isConnected.value = true
      
      // 连接成功，触发同步
      syncManager.triggerSync()
    } else if (event.status === 'disconnected') {
      isConnected.value = false
    }
  })
  
  provider.on('sync', isSynced => {
    if (isSynced) {
      syncManager.onSynced()
    }
  })
}

/**
 * 创建断开连接函数
 * @param {Object} connectionManager - 连接管理器实例
 * @param {Object} syncManager - 同步管理器实例
 * @param {Object} persistenceManager - 持久化管理器实例
 * @param {Object} documentManager - 文档管理器实例
 * @param {string} roomName - 房间名称
 * @param {Object} siyuanManager - 思源管理器实例
 * @param {Object} siyuanSocket - 思源WebSocket连接
 * @returns {Function} 断开连接函数
 */
function createDisconnectFunction(
  connectionManager, 
  syncManager, 
  persistenceManager, 
  documentManager, 
  roomName, 
  siyuanManager, 
  siyuanSocket
) {
  return async () => {
    try {
      // 停止同步
      syncManager.stopSync()
      
      // 断开WebRTC连接
      connectionManager.disconnect()
      
      // 断开思源WebSocket连接
      if (siyuanSocket) {
        siyuanManager.disconnect(roomName)
      }
      
      // 清理文档和连接
      await documentManager.cleanupRoom(roomName)
      
      // 清理持久化资源
      if (persistenceManager) {
        await persistenceManager.destroy()
      }
      
      return true
    } catch (error) {
      console.error(`[同步状态] 断开连接时出错:`, error)
      return false
    }
  }
}

/**
 * 创建诊断功能
 * @param {Object} connectionManager - 连接管理器实例
 * @param {Object} syncManager - 同步管理器实例
 * @param {Object} persistenceManager - 持久化管理器实例
 * @param {string} roomName - 房间名称
 * @param {Object} store - 存储对象
 * @returns {Function} 诊断函数
 */
function createDiagnosticsFunction(
  connectionManager, 
  syncManager, 
  persistenceManager, 
  roomName, 
  store
) {
  return async () => {
    const provider = connectionManager.getProvider()
    const peersCount = provider ? provider.awareness.getStates().size : 0
    
    const diagResult = await diagnoseConnection(
      provider,
      syncManager ? syncManager.getStatus() : null,
      persistenceManager ? { enabled: true, lastSave: persistenceManager.lastSave } : { enabled: false }
    )
    
    const storeSize = JSON.stringify(store.state).length
    
    return {
      roomName,
      connection: {
        type: provider ? 'webrtc' : 'siyuan',
        connected: provider ? provider.connected : !!siyuanManager.getConnectionStatus(roomName),
        peers: peersCount,
        ...diagResult
      },
      sync: syncManager ? syncManager.getStatus() : null,
      storage: {
        enabled: !!persistenceManager,
        size: storeSize,
        lastSave: persistenceManager ? persistenceManager.lastSave : null
      },
      quality: getConnectionQualityRating(diagResult),
      message: generateDiagnosticMessage(diagResult, !!persistenceManager, peersCount)
    }
  }
}

/**
 * 设置指定房间的同步配置
 * @param {string} roomName - 房间名称
 * @param {Object} config - 同步配置
 * @returns {boolean} 是否成功
 */
export function setSyncConfig(roomName, config) {
  const conn = documentManager.connections.get(roomName)
  if (conn) {
    const syncManager = conn._debug.getSyncManager()
    if (syncManager) {
      return syncManager.setConfig(config)
    }
  }
  return false
}

/**
 * 获取指定房间的同步状态
 * @param {string} roomName - 房间名称
 * @returns {Object|null} 同步状态
 */
export function getSyncStatus(roomName) {
  const conn = documentManager.connections.get(roomName)
  if (conn) {
    const syncManager = conn._debug.getSyncManager()
    if (syncManager) {
      return syncManager.getStatus()
    }
  }
  return null
}

/**
 * 更新思源配置
 * @param {Object} config - 思源配置
 * @returns {Object} 更新后的配置
 */
export function updateSiyuanConfig(config = {}) {
  return siyuanManager.updateConfig(config)
}

// 为向后兼容保留原函数名
export const useSyncStore = createSyncStore


// 为向后兼容保留原函数名
export const setRoomAutoSync = setSyncConfig

// 为向后兼容保留原函数名
export const getRoomAutoSyncStatus = getSyncStatus

// 重新导出resetRoomConnection函数，防止修改前后的接口变化
export { resetRoomConnection }

