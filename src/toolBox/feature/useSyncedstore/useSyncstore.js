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
      ...(documentManager.getSiyuanConfig ? documentManager.getSiyuanConfig() : {}),
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

  // 判断是否要使用思源同步
  const shouldUseSiyuan = siyuan.enabled;
  
  // 判断是否使用WebRTC - 仅当明确禁用时才不使用
  const useWebRTC = !disableWebRTC;
  
  // 记录是否要使用思源同步
  if (shouldUseSiyuan) {
    console.log(`[同步存储] 房间 ${roomName} 将使用思源WebSocket同步`);
  }
  
  if (useWebRTC) {
    console.log(`[同步存储] 房间 ${roomName} 将使用WebRTC同步`);
  }
  
  // 存储provider和siyuanProvider，以支持双重连接
  let webrtcProvider = null;
  let siyuanProvider = null;
  let connectionManager = null;
  
  // 存储连接实例ID，用于后续操作
  let webrtcInstanceId;
  let siyuanInstanceId;

  // 如果启用WebRTC，设置WebRTC连接
  if (useWebRTC) {
    // 选择最佳服务器
    status.value = '正在选择最佳服务器...'
    const bestServers = await selectBestServers()
    
    // 合并WebRTC选项
    const mergedWebRtcOptions = mergeWebRtcOptions(webrtcOptions, bestServers)
    
    // 生成唯一实例ID
    webrtcInstanceId = `webrtc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // 添加实例ID到WebRTC选项
    mergedWebRtcOptions.instanceId = webrtcInstanceId;

    try {
      // 获取或创建连接 - 注意这是一个异步操作
      webrtcProvider = await documentManager.getConnection(
        roomName, 
        ydoc, 
        mergedWebRtcOptions
      )

      // 检查provider是否已连接，如果已连接则直接更新状态
      if (webrtcProvider && webrtcProvider.connected) {
        isConnected.value = true;
        status.value = '已连接';
        console.log(`[同步存储] 房间 ${roomName} 使用已连接的WebRTC提供者`);
        
        // 立即触发一次同步 - 对于已有连接场景是很重要的
        setTimeout(() => {
          try {
            if (typeof webrtcProvider.sync === 'function') {
              webrtcProvider.sync();
              console.log(`[同步存储] 房间 ${roomName} 触发现有WebRTC连接的同步`);
            }
          } catch (e) {
            console.warn(`[同步存储] 房间 ${roomName} 触发同步失败:`, e);
          }
        }, 100);
      }

      // 创建连接管理器 - 先基于WebRTC
      connectionManager = createConnectionManager({
        provider: webrtcProvider,
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
    } catch (err) {
      console.error(`[同步存储] 房间 ${roomName} WebRTC连接创建失败:`, err)
      webrtcProvider = null;
      
      if (!shouldUseSiyuan) {
        status.value = 'WebRTC连接创建失败'
        
        // 创建一个空的连接管理器作为后备
        connectionManager = {
          connect: () => false,
          disconnect: () => false,
          reconnect: () => false,
          getProvider: () => null,
          isConnected: () => false
        }
      }
    }
  }

  // 如果启用思源同步，设置思源连接
  if (shouldUseSiyuan) {
    try {
      // 创建思源Provider连接选项
      siyuanInstanceId = `siyuan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const siyuanProviderOptions = {
        useSiyuan: true,
        port: siyuan.port || 6806,
        host: siyuan.host || '127.0.0.1',
        token: siyuan.token || '6806',
        channel: siyuan.channel || 'sync',
        autoReconnect: siyuan.autoReconnect !== false,
        reconnectInterval: siyuan.reconnectInterval || 1000,
        maxReconnectAttempts: siyuan.maxReconnectAttempts || 10,
        // 确保传递Y实例以避免多实例问题
        Y: null, // 让documentManager使用统一实例
        // 为每个实例生成唯一ID，确保连接独立
        instanceId: siyuanInstanceId
      };
      
      console.log(`[同步存储] 房间 ${roomName} 尝试创建思源Provider`);
      
      // 通过documentManager获取provider - 这是异步操作
      siyuanProvider = await documentManager.getConnection(
        roomName,
        ydoc,
        siyuanProviderOptions
      );
      
      // 如果没有WebRTC连接管理器或者强制使用思源，则基于思源创建连接管理器
      if (!connectionManager || siyuan.forceSiyuan) {
        if (siyuanProvider) {
          console.log(`[同步存储] 房间 ${roomName} 思源Provider创建成功，将作为主连接`);
          isConnected.value = true;
          status.value = '已连接(思源)';
          
          // 创建一个与WebRTC provider兼容的连接管理器
          connectionManager = {
            connect: () => {
              if (siyuanProvider && typeof siyuanProvider.connect === 'function') {
                siyuanProvider.connect();
                return true;
              }
              return false;
            },
            disconnect: () => {
              if (siyuanProvider && typeof siyuanProvider.disconnect === 'function') {
                siyuanProvider.disconnect();
                return true;
              }
              return false;
            },
            reconnect: () => {
              if (siyuanProvider) {
                if (typeof siyuanProvider.disconnect === 'function') {
                  siyuanProvider.disconnect();
                }
                if (typeof siyuanProvider.connect === 'function') {
                  setTimeout(() => siyuanProvider.connect(), 100);
                  return true;
                }
              }
              return false;
            },
            getProvider: () => siyuanProvider,
            isConnected: () => siyuanProvider && siyuanProvider.wsconnected
          };
          
          // 如果设置了自动连接，则立即连接
          if (autoConnect) {
            setTimeout(() => connectionManager.connect(), CONNECT_DELAY);
          }
        } else {
          console.warn(`[同步存储] 房间 ${roomName} 思源Provider创建失败`);
          
          // 如果没有WebRTC连接，才创建空的连接管理器
          if (!connectionManager) {
            connectionManager = {
              connect: () => false,
              disconnect: () => false,
              reconnect: () => false,
              getProvider: () => null,
              isConnected: () => false
            };
          }
        }
      } else if (siyuanProvider) {
        // WebRTC已经创建了连接管理器，但我们仍然连接思源作为辅助
        console.log(`[同步存储] 房间 ${roomName} 思源Provider创建成功，将作为辅助连接`);
        if (autoConnect) {
          setTimeout(() => {
            if (siyuanProvider && typeof siyuanProvider.connect === 'function') {
              siyuanProvider.connect();
            }
          }, CONNECT_DELAY);
        }
      }
    } catch (err) {
      console.error(`[同步存储] 房间 ${roomName} 创建思源Provider出错:`, err);
      siyuanProvider = null;
      
      // 如果没有WebRTC连接，才创建空的连接管理器
      if (!connectionManager) {
        connectionManager = {
          connect: () => false,
          disconnect: () => false,
          reconnect: () => false,
          getProvider: () => null,
          isConnected: () => false
        };
      }
    }
  } else if (!useWebRTC) {
    // 既不使用WebRTC也不使用思源的情况
    console.log(`[同步存储] 房间 ${roomName} 未启用任何同步方式`);
    connectionManager = {
      connect: () => false,
      disconnect: () => false,
      reconnect: () => false,
      getProvider: () => null,
      isConnected: () => false
    };
  }

  // 创建同步管理器，同时传递WebRTC和思源Provider
  const syncManager = createSyncManager({
    ydoc,
    store,
    roomName,
    autoSync,
    getProvider: connectionManager.getProvider,
    // 如果有思源Provider，传入作为辅助同步
    siyuanProvider: siyuanProvider
  })

  // 只有在使用WebRTC且成功创建provider时才设置事件监听
  if (useWebRTC && webrtcProvider) {
    // 获取连接管理器中的provider
    webrtcProvider = connectionManager.getProvider()
    
    // 设置连接和同步事件监听
    setupEventListeners(webrtcProvider, isConnected, syncManager)
  }
  
  // 创建断开连接函数
  const disconnect = createDisconnectFunction(
    connectionManager, 
    syncManager, 
    persistenceManager, 
    documentManager, 
    roomName, 
    { 
      rtcInstanceId: webrtcInstanceId,
      siyuanInstanceId: siyuanInstanceId
    }
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
      
      // 没有provider的情况
      if (!provider) {
        return new Set();
      }
      
      // 思源WebSocket连接 - 检查provider类型
      if (provider.constructor && provider.constructor.name === 'SiyuanProvider') {
        return provider.getPeers ? provider.getPeers() : new Set(['siyuan-ws']);
      }
      
      // WebRTC连接
      if (provider.connected) {
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
 * 检测一个对象是否是Yjs文档或包含Yjs文档
 * @param {Object} obj - 要检测的对象
 * @returns {boolean} 是否是Yjs文档
 */
function isYjsDocument(obj) {
  // 检查基本类型
  if (!obj || typeof obj !== 'object') return false;
  
  try {
    // 安全地检查属性
    const safeHasProperty = (obj, prop) => {
      try {
        return prop in obj;
      } catch (e) {
        return false;
      }
    };
    
    const safeCheckMethod = (obj, methodName) => {
      try {
        return typeof obj[methodName] === 'function';
      } catch (e) {
        return false;
      }
    };
    
    // 检查常见的Yjs方法
    if (safeCheckMethod(obj, 'transact')) return true;
    if (safeCheckMethod(obj, 'getArray')) return true;
    if (safeCheckMethod(obj, 'getMap')) return true;
    if (safeCheckMethod(obj, 'getText')) return true;
    if (safeCheckMethod(obj, 'getXmlFragment')) return true;
    
    // 检查直接属性（不输出错误）
    if (safeHasProperty(obj, '_yjs') && obj._yjs) return true;
    if (safeHasProperty(obj, 'ydoc') && obj.ydoc) return true;
    if (safeHasProperty(obj, 'doc') && obj.doc) return true;
    if (safeHasProperty(obj, '_prelimState') && obj._prelimState) return true;
    
    // 检查state属性
    if (safeHasProperty(obj, 'state') && obj.state && typeof obj.state === 'object') {
      // 检查state的属性
      if (safeHasProperty(obj.state, '_yjs') && obj.state._yjs) return true;
      if (safeHasProperty(obj.state, 'ydoc') && obj.state.ydoc) return true;
      if (safeHasProperty(obj.state, 'doc') && obj.state.doc) return true;
      if (safeHasProperty(obj.state, '_prelimState') && obj.state._prelimState) return true;
    }
    
    // 检查store属性
    if (safeHasProperty(obj, 'store') && obj.store && typeof obj.store === 'object') {
      // 递归检查store（但避免无限递归）
      if (obj.store !== obj) {
        try {
          // 使用简单检查避免深度递归
          if (safeHasProperty(obj.store, '_yjs') && obj.store._yjs) return true;
          if (safeHasProperty(obj.store, 'ydoc') && obj.store.ydoc) return true;
          if (safeHasProperty(obj.store, 'doc') && obj.store.doc) return true;
        } catch (e) {
          // 忽略内部检查错误
        }
      }
    }
    
    // 检查其他特殊属性
    if (safeCheckMethod(obj, 'createRelativePositionFromTypeIndex')) return true;
    
    // 检查内部结构（但不输出错误）
    if (safeHasProperty(obj, '_item') && safeHasProperty(obj, '_parent') && obj._item && obj._parent) return true;
    if (safeHasProperty(obj, '_map') && safeHasProperty(obj, '_transaction') && obj._map && obj._transaction) return true;
    
  } catch (e) {
    // 捕获任何未预期的错误，但不输出
    return false;
  }
  
  return false;
}

/**
 * 合并远程状态到本地状态
 * @param {Object} localState - 本地状态
 * @param {Object} remoteState - 远程状态
 * @param {number} depth - 递归深度
 */
function mergeRemoteState(localState, remoteState, depth = 0) {
  // 增加最大递归深度，原来是5
  const MAX_DEPTH = 15;
  if (depth > MAX_DEPTH) {
    console.warn('[思源同步] 达到最大递归深度，避免栈溢出');
    return;
  }
  
  // 基本检查
  if (!localState || !remoteState || typeof localState !== 'object' || typeof remoteState !== 'object') {
    return; // 确保两个参数都是对象
  }
  
  // 检查是否为Yjs文档
  if (isYjsDocument(localState)) {
    console.log('[思源同步] 检测到Yjs文档，使用特殊合并策略');
    try {
      // 直接使用常规合并方式，不调用特殊函数
      console.log('[思源同步] 检测到Yjs文档，但使用常规合并策略以避免错误');
      // 不再调用特殊处理函数
      // applyRemoteStateToYjsDocument(localState, remoteState);
      // 继续执行常规合并逻辑，不返回
    } catch (yjsErr) {
      console.error('[思源同步] 应用数据到Yjs文档失败:', yjsErr);
      // 发生错误时继续尝试常规合并
    }
  }
  
  // 防止循环引用的处理
  // 使用WeakMap记录已处理过的对象对
  const processedPairs = new WeakMap();
  function checkAndMarkProcessed(local, remote) {
    if (!local || !remote || typeof local !== 'object' || typeof remote !== 'object') {
      return false;
    }
    
    if (!processedPairs.has(local)) {
      processedPairs.set(local, new WeakSet());
    }
    
    const remoteSet = processedPairs.get(local);
    if (remoteSet.has(remote)) {
      return true; // 已处理过这对对象
    }
    
    remoteSet.add(remote);
    return false;
  }
  
  try {
    // 检查是否已处理过这对对象，避免循环引用
    if (checkAndMarkProcessed(localState, remoteState)) {
      console.warn('[思源同步] 检测到可能的循环引用，跳过处理');
      return;
    }
    
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
        
        // 本地不存在此属性，检查是否可以添加
        if (!(key in localState)) {
          if (!Object.isExtensible(localState)) {
            console.warn(`[思源同步] 无法添加新属性 "${key}": 对象不可扩展`);
            continue;
          }
          
          try {
            if (Array.isArray(remoteValue)) {
              localState[key] = [...remoteValue];
            } else if (typeof remoteValue === 'object') {
              localState[key] = {...remoteValue};
            } else {
              localState[key] = remoteValue;
            }
          } catch (err) {
            console.warn(`[思源同步] 添加新属性 "${key}" 失败: ${err.message}`);
          }
          continue;
        }
        
        // 处理数组类型
        if (Array.isArray(remoteValue)) {
          // 数组需要安全处理，很多错误发生在这里
          handleArraySync(localState, key, remoteValue);
        }
        // 处理普通对象类型
        else if (typeof remoteValue === 'object' && remoteValue !== null) {
          // 判断本地对应的值是否也是对象
          if (typeof localState[key] === 'object' && !Array.isArray(localState[key])) {
            // 对象需要安全处理
            handleObjectSync(localState, key, remoteValue, depth);
          } else {
            // 类型不匹配，直接替换
            try {
              localState[key] = {...remoteValue};
            } catch (err) {
              console.warn(`[思源同步] 替换对象属性 "${key}" 失败: ${err.message}`);
            }
          }
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
    
    // 检查合并对象的大小，避免合并非常大的对象导致性能问题
    const remoteKeyCount = Object.keys(remoteObj).length;
    if (remoteKeyCount > 1000) {
      console.warn(`[思源同步] 远程对象过大 (${key}, ${remoteKeyCount}个键), 执行浅合并`);
      // 对于非常大的对象，执行浅合并
      Object.assign(localState[key], remoteObj);
      return;
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
  if (!Array.isArray(array)) {
    console.warn(`[思源同步] 尝试清空非数组对象`);
    return;
  }
  
  try {
    // 避免使用 length = 0，改用 splice 方法
    array.splice(0, array.length);
  } catch (err) {
    console.warn(`[思源同步] 使用splice清空数组失败，尝试备用方法:`, err);
    try {
      // 备用方法：逐个移除元素
      while (array.length > 0) {
        try {
          array.pop();
        } catch (e) {
          // 如果连pop都失败了，只能跳出循环了
          console.error(`[思源同步] 无法清空数组，放弃:`, e);
          break;
        }
      }
    } catch (finalErr) {
      console.error(`[思源同步] 所有清空数组的方法都失败:`, finalErr);
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
 * @param {Object} connectionManager - 连接管理器
 * @param {Object} syncManager - 同步管理器
 * @param {Object} persistenceManager - 持久化管理器 
 * @param {Object} documentManager - 文档管理器
 * @param {string} roomName - 房间名称
 * @param {Object} options - 选项
 * @returns {Function} 断开连接函数
 */
function createDisconnectFunction(
  connectionManager, 
  syncManager, 
  persistenceManager, 
  documentManager, 
  roomName, 
  options = {}
) {
  return async () => {
    try {
      console.log(`[同步存储] 断开房间 ${roomName} 的连接`)
      
      // 停止同步
      if (syncManager && syncManager.stopAutoSync) {
        syncManager.stopAutoSync()
      }
      
      // 获取主连接提供者
      const mainProvider = connectionManager ? connectionManager.getProvider() : null;
      
      // 获取思源提供者（如果不同于主连接）
      const siyuanProvider = syncManager && syncManager.getSiyuanProvider ? 
        syncManager.getSiyuanProvider() : null;
      
      // 标记正在断开连接，用于防止在断开过程中进行其他操作
      const disconnectingKey = `disconnecting_${roomName}`;
      window[disconnectingKey] = true;
      
      // 添加超时保护
      const disconnectTimeout = setTimeout(() => {
        window[disconnectingKey] = false;
      }, 5000); // 5秒后自动解除标记
      
      // 断开主连接
      if (connectionManager && connectionManager.disconnect) {
        await Promise.resolve(connectionManager.disconnect());
      }
      
      // 如果有独立的思源Provider，也断开它
      if (siyuanProvider && siyuanProvider !== mainProvider && 
          typeof siyuanProvider.disconnect === 'function') {
        try {
          // 使用Promise包装思源断开操作，并添加超时
          await Promise.race([
            new Promise(resolve => {
              siyuanProvider.disconnect();
              setTimeout(resolve, 100); // 给操作100ms完成
            }),
            new Promise(resolve => setTimeout(resolve, 1000)) // 最多等待1秒
          ]);
          console.log(`[同步存储] 已断开思源Provider连接`);
        } catch (err) {
          console.error(`[同步存储] 断开思源Provider连接失败:`, err);
        }
      }
      
      // 等待一小段时间，让资源有时间释放
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 清理文档和连接
      if (documentManager) {
        // 获取实例信息
        const rtcInstanceId = options.rtcInstanceId;
        const siyuanInstanceId = options.siyuanInstanceId;
        
        // 清理所有相关连接
        try {
          await documentManager.cleanupRoom(roomName);
          
          // 使用documentManager断开思源房间连接（如果方法存在）
          if (documentManager.disconnectSiyuanRoom) {
            await documentManager.disconnectSiyuanRoom(roomName, {
              siyuanInstanceId: siyuanInstanceId
            });
          }
        } catch (err) {
          console.warn(`[同步存储] 清理房间 ${roomName} 连接时出错:`, err);
        }
      }
      
      // 清理持久化资源
      if (persistenceManager) {
        await persistenceManager.destroy();
      }
      
      // 清除断开连接标记
      clearTimeout(disconnectTimeout);
      window[disconnectingKey] = false;
      
      return true;
    } catch (error) {
      console.error(`[同步状态] 断开连接时出错:`, error);
      
      // 确保清除断开连接标记
      window[`disconnecting_${roomName}`] = false;
      
      return false;
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
        connected: provider ? provider.connected : !!documentManager.getConnectionStatus(roomName),
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
  // 通过documentManager更新配置
  if (documentManager.updateSiyuanConfig) {
    return documentManager.updateSiyuanConfig(config);
  }
  console.warn('[同步存储] documentManager未实现updateSiyuanConfig方法');
  return config;
}

// 为向后兼容保留原函数名
export const useSyncStore = createSyncStore

// 为向后兼容保留原函数名
export const setRoomAutoSync = setSyncConfig

// 为向后兼容保留原函数名
export const getRoomAutoSyncStatus = getSyncStatus

// 重新导出resetRoomConnection函数，防止修改前后的接口变化
export { resetRoomConnection }
