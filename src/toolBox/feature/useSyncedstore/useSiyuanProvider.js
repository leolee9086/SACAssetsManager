/**
 * @fileoverview 思源笔记 WebSocket Provider
 * 
 * 该模块提供思源笔记的WebSocket同步Provider实现，
 * 用于Yjs文档的实时协作同步。
 * 
 * @requires yjs
 * @requires y-protocols
 */

// 使用统一的Yjs实例入口
import { default as Y } from './yjsInstance.js'

// 从CDN导入协议库
import siyuanManager from './useSiyuanIntegration.js'

// 直接静态导入所需模块
import * as awarenessProtocol from './impl/awareness.js'
import * as syncProtocol from './impl/sync.js'
import * as encoding from './impl/encoding.js'
import * as decoding from './impl/decoding.js'
import { Observable } from './impl/observable.js'

// 初始化同步函数
syncProtocol.initSyncFunctions(Y);

// 消息类型常量
const MESSAGE_SYNC = 0
const MESSAGE_AWARENESS = 1
const MESSAGE_AUTH = 2
const MESSAGE_QUERY_AWARENESS = 3

// 常量定义
const RECONNECTION_DELAY = 5000; // 重连延迟时间（毫秒）
const MAX_RECONNECTION_ATTEMPTS = 5; // 最大重连尝试次数

// 记录模块加载状态
const moduleStatus = {
  isLoading: false,
  isLoaded: true,
  error: null,
  startTime: Date.now(),
  loadTime: 0,
  usingLocalImpl: false
};

// 基本的Observable实现作为降级
class BasicObservable {
  constructor() {
    this._handlers = new Map();
  }
  
  on(name, handler) {
    if (!this._handlers.has(name)) {
      this._handlers.set(name, new Set());
    }
    this._handlers.get(name).add(handler);
  }
  
  off(name, handler) {
    if (this._handlers.has(name)) {
      this._handlers.get(name).delete(handler);
    }
  }
  
  emit(name, args) {
    if (this._handlers.has(name)) {
      for (const handler of this._handlers.get(name)) {
        // 确保 args 是数组，如果不是则将其包装为数组
        const argsArray = Array.isArray(args) ? args : [args];
        handler(...argsArray);
      }
    }
  }
  
  removeAllEventListeners() {
    this._handlers.clear();
  }
}

// 检查模块是否有效，如果无效则使用本地实现
const checkAndInitModules = () => {
  let useLocalImpl = false;
  
  // 检查所有导入的模块是否有效
  if (!awarenessProtocol || !awarenessProtocol.Awareness || 
      !syncProtocol || !syncProtocol.readSyncMessage || 
      !encoding || !encoding.createEncoder ||
      !decoding || !decoding.createDecoder) {
    console.warn('[思源Provider] 部分模块无效，使用本地实现');
    useLocalImpl = true;
    useLocalImplementations();
  } else {
    console.log('[思源Provider] 所有模块已静态加载完成');
  }
  
  moduleStatus.isLoaded = true;
  moduleStatus.loadTime = Date.now() - moduleStatus.startTime;
  moduleStatus.usingLocalImpl = useLocalImpl;
  
  console.log('[思源Provider] 模块加载状态:', 
    awarenessProtocol ? '已加载' : '未加载',
    syncProtocol ? '已加载' : '未加载',
    encoding ? '已加载' : '未加载',
    decoding ? '已加载' : '未加载',
    Observable ? '已加载' : '使用基本实现',
    `加载用时: ${moduleStatus.loadTime}ms`
  );
  
  return moduleStatus.isLoaded;
};

/**
 * 检查协议库是否已加载完成
 * @returns {boolean} 是否已完全加载
 */
function areProtocolsLoaded() {
  return !!(awarenessProtocol && syncProtocol && encoding && decoding && Observable);
}

/**
 * 获取模块加载状态
 * @returns {Object} 模块加载状态信息
 */
export function getModuleStatus() {
  return {
    ...moduleStatus,
    protocols: {
      awarenessProtocol: !!awarenessProtocol,
      syncProtocol: !!syncProtocol,
      encoding: !!encoding,
      decoding: !!decoding,
      observable: !!Observable
    },
    allLoaded: areProtocolsLoaded()
  };
}

// 简单的本地实现功能，用于兼容代码中现有调用
function useLocalImplementations() {
  console.warn('[思源Provider] 使用本地实现无需启用，已静态导入所有模块');
  return true;
}

/**
 * 思源WebSocket Provider
 * 提供与思源笔记WebSocket连接的Yjs同步提供器
 */
export class SiyuanProvider extends BasicObservable {
  /**
   * 创建思源WebSocket Provider实例
   * @param {string} roomName - 房间名称，用于标识同步群组
   * @param {Y.Doc} doc - Yjs文档实例
   * @param {Object} options - 配置选项
   * @param {boolean} [options.connect=true] - 是否自动连接
   * @param {Object} [options.awareness] - 感知状态对象，用于用户在线状态等
   * @param {Object} [options.params={}] - 连接参数
   * @param {number} [options.resyncInterval=10000] - 重新同步间隔（毫秒）
   * @param {boolean} [options.disableBc=true] - 是否禁用广播通道
   * @param {number} [options.maxBackoffTime=10000] - 最大重连延迟（毫秒）
   */
  constructor(roomName, doc, {
    connect = true,
    awareness = null,
    params = {},
    resyncInterval = 10000,
    disableBc = true,
    maxBackoffTime = 10000,
    siyuanConfig = {},
    Y: providedY = null
  } = {}) {
    // 调用父类构造函数
    super();
    
    // 使用提供的Y或默认的统一实例
    const actualY = providedY || Y;
    
    // 基本属性
    this.roomName = roomName;
    this.doc = doc; // 直接使用原始doc，不再适配
    this.Y = actualY;
    
    // 如果awareness未提供，创建awareness实例
    if (!awareness && awarenessProtocol && awarenessProtocol.Awareness) {
      try {
        this.awareness = new awarenessProtocol.Awareness(doc);
        console.log('[思源Provider] 成功创建Awareness实例');
      } catch (err) {
        console.error('[思源Provider] 创建Awareness实例失败:', err);
        // 创建一个基本的替代实现
        this.awareness = {
          states: new Map(),
          meta: {},
          on: () => {},
          off: () => {},
          setLocalState: () => {},
          getLocalState: () => ({}),
          getStates: () => new Map()
        };
      }
    } else {
      this.awareness = awareness;
    }
    
    this.params = params;
    this.resyncInterval = resyncInterval;
    this.maxBackoffTime = maxBackoffTime;
    this.disableBc = disableBc;
    this.siyuanConfig = {
      port: 6806,
      host: '127.0.0.1',
      token: '6806',
      channel: 'sync',
      autoReconnect: true,
      reconnectInterval: 1000,
      maxReconnectAttempts: 10,
      ...siyuanConfig
    };
    
    // 连接状态
    this.wsconnected = false;
    this.wsconnecting = false;
    this.wsLastMessageReceived = 0;
    this.shouldConnect = connect;
    this.wsUnsuccessfulReconnects = 0;
    
    // WebSocket实例
    this.ws = null;
    
    // 同步状态
    this._synced = false;
    
    // 启用身份验证
    this.auth = {
      token: this.siyuanConfig.token || '6806'
    };
    
    // 连接重试计数
    this.failedConnections = 0;
    this.reconnecting = false;
    
    // 计时器
    this._resyncInterval = null;
    this._checkInterval = null;
    this._connectionTimeout = null;
    
    // 设置更新处理函数
    this._updateHandler = (update, origin) => {
      if (origin !== this && encoding && syncProtocol) {
        try {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, MESSAGE_SYNC);
          syncProtocol.writeUpdate(encoder, update);
          this._send(encoding.toUint8Array(encoder));
        } catch (err) {
          console.error('[思源Provider] 处理更新失败:', err);
        }
      }
    };
    
    // 设置感知状态更新处理函数
    this._awarenessUpdateHandler = ({ added, updated, removed }) => {
      if (!awarenessProtocol || !encoding) return;
      
      const changedClients = [...added, ...updated, ...removed];
      if (changedClients.length > 0) {
        try {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
          encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients));
          this._send(encoding.toUint8Array(encoder));
        } catch (err) {
          console.error('[思源Provider] 处理感知状态更新失败:', err);
        }
      }
    };
    
    // 设置文档销毁时的清理
    this._beforeUnloadHandler = () => {
      if (awarenessProtocol && this.awareness) {
        try {
          awarenessProtocol.removeAwarenessStates(
            this.awareness,
            [doc.clientID],
            'tab closing'
          );
        } catch (err) {
          console.error('[思源Provider] 清理感知状态失败:', err);
        }
      }
    };
    
    // 监听文档更新
    if (this.doc) {
      this.doc.on('update', this._updateHandler);
    }
    
    // 监听感知状态更新
    if (this.awareness) {
      this.awareness.on('update', this._awarenessUpdateHandler);
    }
    
    // 添加页面卸载监听
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this._beforeUnloadHandler);
    }
    
    // 设置检查间隔
    this._checkInterval = setInterval(() => {
      this._checkConnection();
    }, 3000);
    
    // 自动连接
    if (connect) {
      setTimeout(() => this.connect(), 0);
    }
    
    // 设置初始化完成的Promise
    this._initializing = Promise.resolve(this);
  }
  
  /**
   * 获取当前是否已同步
   */
  get synced() {
    return this._synced
  }
  
  /**
   * 设置同步状态并触发事件
   */
  set synced(state) {
    if (this._synced !== state) {
      this._synced = state
      this.emit('synced', [state])
      this.emit('sync', [state])
    }
  }
  
  /**
   * 发送消息
   * @param {Uint8Array} data - 要发送的二进制数据
   * @returns {boolean} - 是否发送成功
   * @private
   */
  _send(data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (this.failedConnections < MAX_RECONNECTION_ATTEMPTS) {
        // 如果WebSocket未连接，但我们应该连接，尝试重新建立连接
        if (this.shouldConnect && !this.reconnecting) {
          this.reconnecting = true;
          console.warn('[思源Provider] WebSocket未连接，尝试重新连接...');
          setTimeout(() => {
            this.reconnecting = false;
            this._setupWebsocketConnection();
          }, RECONNECTION_DELAY);
        }
      }
      return false;
    }

    try {
      this.ws.send(data);
      return true;
    } catch (err) {
      console.error('[思源Provider] 发送消息失败:', err);
      return false;
    }
  }
  
  /**
   * 处理接收到的消息
   * @private
   */
  _onMessage(event) {
    this.wsLastMessageReceived = Date.now()
    
    try {
      // 解析消息
      const message = JSON.parse(event.data)
      
      // 处理思源心跳消息
      if (message.type === 'heartbeat') {
        return
      }
      
      // 处理普通消息
      if (message.type === 'message' || message.type === 'custom') {
        this.emit('message', [message])
        return
      }
      
      // 处理Yjs同步消息
      if (message.type === 'y-sync' && message.binaryData) {
        try {
          // 确保binaryData存在且有效
          if (!message.binaryData || typeof message.binaryData !== 'string') {
            console.warn('[思源Provider] binaryData不是有效的字符串:', message.binaryData)
            return
          }
          
          // 将Base64转回二进制
          let binaryString;
          try {
            binaryString = atob(message.binaryData);
          } catch (base64Error) {
            console.error('[思源Provider] Base64解码失败:', base64Error);
            return;
          }
          
          if (!binaryString || binaryString.length === 0) {
            console.warn('[思源Provider] 解码Base64后得到空字符串')
            return
          }
          
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          
          // 使用解码器解析二进制消息
          const decoder = decoding.createDecoder(bytes);
          
          // 安全检查
          if (!decoder) {
            console.error('[思源Provider] 无法创建解码器')
            return
          }
          
          // 安全地读取消息类型
          let messageType;
          try {
            messageType = decoding.readVarUint(decoder);
          } catch (typeError) {
            console.error('[思源Provider] 读取消息类型失败:', typeError);
            return;
          }
          
          // 处理不同类型的消息
          if (messageType === MESSAGE_SYNC) {
            // 确保文档实例有效
            if (!this.doc) {
              console.error('[思源Provider] 文档实例不可用')
              return
            }
            
            // 创建响应编码器
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, MESSAGE_SYNC);
            
            // 应用同步消息 - 使用try-catch包装所有关键步骤
            try {
              // 确保文档具有必要的方法
              if (typeof this.doc.encodeStateVector !== 'function') {
                console.warn('[思源Provider] 文档缺少encodeStateVector方法，将使用静态方法');
                // 不阻止继续执行，让syncProtocol处理异常情况
              }
              
              // 读取同步消息
              const syncMessageType = syncProtocol.readSyncMessage(
                decoder, 
                encoder, 
                this.doc, 
                this
              );
              
              // 发送响应（如果有需要）
              if (encoding.length(encoder) > 1) {
                try {
                  this._send(encoding.toUint8Array(encoder));
                } catch (sendError) {
                  console.error('[思源Provider] 发送同步响应失败:', sendError);
                }
              }
              
              // 如果是第二步同步消息并且未同步状态，则设置同步状态
              if (syncMessageType === syncProtocol.messageYjsSyncStep2 && !this.synced) {
                this.synced = true;
              }
            } catch (syncError) {
              console.error('[思源Provider] 应用同步消息失败:', syncError);
              
              // 为避免卡死，强制触发同步重试，但使用更简单的重试策略
              setTimeout(() => {
                try {
                  // 使用简化的同步请求方式
                  const retryEncoder = encoding.createEncoder();
                  encoding.writeVarUint(retryEncoder, MESSAGE_SYNC);
                  encoding.writeVarUint(retryEncoder, messageSync.STEP1);
                  // 发送空状态向量
                  encoding.writeVarUint(retryEncoder, 0);
                  this._send(encoding.toUint8Array(retryEncoder));
                  
                  console.log('[思源Provider] 使用简化方式自动触发同步重试');
                } catch (retryErr) {
                  console.warn('[思源Provider] 同步重试失败:', retryErr);
                }
              }, 1000);
            }
          } else if (messageType === MESSAGE_AWARENESS) {
            try {
              // 读取感知状态更新数据
              const update = decoding.readVarUint8Array(decoder);
              
              if (update && update.length > 0 && this.awareness) {
                // 安全地应用感知状态更新
                try {
                  awarenessProtocol.applyAwarenessUpdate(this.awareness, update, this);
                } catch (applyError) {
                  console.error('[思源Provider] 应用感知状态更新出错:', applyError);
                }
              } else {
                console.warn('[思源Provider] 无法应用感知状态更新');
              }
            } catch (awareError) {
              console.error('[思源Provider] 解析感知状态更新失败:', awareError);
            }
          } else if (messageType === MESSAGE_AUTH) {
            // 处理认证消息（如需要）
            this.emit('auth', [message]);
          } else if (messageType === MESSAGE_QUERY_AWARENESS) {
            // 处理查询感知状态消息 - 发送当前客户端的感知状态
            try {
              if (this.awareness && awarenessProtocol && encoding) {
                const encoder = encoding.createEncoder();
                encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
                encoding.writeVarUint8Array(
                  encoder,
                  awarenessProtocol.encodeAwarenessUpdate(
                    this.awareness,
                    [this.doc.clientID]
                  )
                );
                this._send(encoding.toUint8Array(encoder));
              }
            } catch (queryError) {
              console.error('[思源Provider] 处理查询感知状态消息失败:', queryError);
            }
          } else {
            console.warn(`[思源Provider] 未知的消息类型: ${messageType}`);
          }
        } catch (err) {
          console.error('[思源Provider] 解析二进制消息失败:', err);
        }
        return
      }
      
      // 处理新客户端加入
      if (message.type === 'join') {
        this.emit('peers', [{
          action: 'add',
          clientId: message.clientId
        }])
        
        // 发送查询感知状态消息
        try {
          this._sendQueryAwareness();
        } catch (queryError) {
          console.error('[思源Provider] 发送查询感知状态消息失败:', queryError);
        }
        return
      }
      
      // 处理客户端离开
      if (message.type === 'leave') {
        this.emit('peers', [{
          action: 'remove',
          clientId: message.clientId
        }])
        return
      }
      
      // 处理错误消息
      if (message.type === 'error') {
        this.emit('error', [message])
        console.error('[思源Provider] 服务器错误:', message.message || '未知错误')
        return
      }
    } catch (err) {
      console.error('[思源Provider] 处理消息失败:', err, event.data ? event.data.substring(0, 100) + '...' : '无数据')
    }
  }
  
  /**
   * 发送同步步骤1消息
   * @private
   */
  _sendSyncStep1() {
    try {
      if (!this.doc) {
        console.error('[思源Provider] 文档实例不可用');
        return;
      }
      
      // 检查文档对象是否有必要的方法
      if (typeof this.doc.encodeStateVector !== 'function') {
        console.warn('[思源Provider] 文档对象缺少 encodeStateVector 方法，将使用Y模块方法');
        
        // 使用Y模块提供的静态方法或从encoding模块获取帮助
        // 创建encoder
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        
        // 如果doc对象没有encodeStateVector方法，使用空的状态向量
        const emptyStateVector = new Uint8Array(0);
        encoding.writeVarUint8Array(encoder, emptyStateVector);
        
        // 发送消息
        this._send(encoding.toUint8Array(encoder));
        return;
      }
      
      // 使用标准方法
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeSyncStep1(encoder, this.doc);
      this._send(encoding.toUint8Array(encoder));
    } catch (err) {
      console.error('[思源Provider] 发送同步步骤1消息失败:', err);
    }
  }
  
  /**
   * 发送查询感知状态消息
   * @private
   */
  _sendQueryAwareness() {
    try {
      if (!encoding) {
        console.error('[思源Provider] 编码模块不可用');
        return;
      }
      
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_QUERY_AWARENESS);
      
      try {
        this._send(encoding.toUint8Array(encoder));
      } catch (sendError) {
        console.error('[思源Provider] 发送查询感知状态消息失败:', sendError);
      }
    } catch (err) {
      console.error('[思源Provider] 创建查询感知状态消息失败:', err);
    }
  }
  
  /**
   * 清理WebSocket连接
   * @private
   */
  _clearWebsocketConnection() {
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.onmessage = null;
        
        if (this.ws.readyState === WebSocket.OPEN || 
            this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
        }
        
        this.ws = null;
        console.log('[思源Provider] 已清理旧的WebSocket连接');
      } catch (err) {
        console.error('[思源Provider] 清理WebSocket连接出错:', err);
      }
    }
  }
  
  /**
   * 建立WebSocket连接URL
   * @private
   * @returns {string} WebSocket连接URL
   */
  _buildWebSocketUrl() {
    const { host, port, token, channel } = this.siyuanConfig;
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const queryParams = new URLSearchParams({
      channel: channel || 'sync',
      token: token || '',
      room: this.roomName
    }).toString();
    
    return `${protocol}//${host}:${port}/ws?${queryParams}`;
  }
  
  /**
   * 检查连接状态，如果需要则重连
   * @private
   */
  _checkConnection() {
    // 如果已经正在连接，不做任何处理
    if (this.wsconnecting) {
      return
    }
    
    // 如果应该连接但未连接，尝试重连
    if (this.shouldConnect && !this.wsconnected) {
      this._setupWebsocketConnection()
    }
    
    // 如果已连接，但超过重同步时间，触发重同步
    if (this.wsconnected) {
      const timesSinceLastMessage = Date.now() - this.wsLastMessageReceived
      if (timesSinceLastMessage > this.resyncInterval && this.resyncInterval > 0) {
        this._sendSyncStep1()
        this.wsLastMessageReceived = Date.now()
      }
    }
  }
  
  /**
   * 建立WebSocket连接
   * @private
   */
  _setupWebsocketConnection() {
    if (!this.shouldConnect) {
      console.warn('[思源Provider] 不应建立连接，跳过');
      return;
    }

    if (this.ws) {
      // 如果已经有活跃连接，先清理
      this._closeWebsocketConnection();
    }

    try {
      const url = this._buildWebSocketUrl();
      console.log(`[思源Provider] 正在连接到: ${url}`);
      
      this.wsconnecting = true;
      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';
      
      this.ws.onopen = () => {
        this.failedConnections = 0;
        this.wsconnected = true;
        this.wsconnecting = false;
        console.log('[思源Provider] WebSocket连接已建立');
        this.emit('status', [{ status: 'connected' }]);
        
        // 初始连接成功后发送同步请求
        this._sendSyncStep1();
        this._sendQueryAwareness();
      };
      
      this.ws.onclose = (event) => {
        const closeError = new Error(`WebSocket连接已关闭: ${event.code} ${event.reason}`);
        this._closeWebsocketConnection(closeError);
        
        console.warn(`[思源Provider] WebSocket连接已关闭: ${event.code} ${event.reason}`);
        this.emit('status', [{ 
          status: 'disconnected', 
          code: event.code, 
          reason: event.reason 
        }]);
        
        // 如果应该保持连接，尝试重新连接
        if (this.shouldConnect && !this.reconnecting) {
          this.failedConnections++;
          if (this.failedConnections < MAX_RECONNECTION_ATTEMPTS) {
            console.log(`[思源Provider] 将在 ${RECONNECTION_DELAY}ms 后尝试重新连接 (${this.failedConnections}/${MAX_RECONNECTION_ATTEMPTS})`);
            this.reconnecting = true;
            setTimeout(() => {
              this.reconnecting = false;
              this._setupWebsocketConnection();
            }, RECONNECTION_DELAY);
          } else {
            console.error('[思源Provider] 重连次数已达上限，停止尝试');
            this.emit('status', [{ status: 'failed' }]);
          }
        }
      };
      
      this.ws.onerror = (event) => {
        const error = new Error('WebSocket连接错误');
        this._closeWebsocketConnection(error);
        
        console.error('[思源Provider] WebSocket错误:', event);
        this.emit('status', [{ status: 'error', event }]);
      };
      
      this.ws.onmessage = (event) => {
        this._onMessage(event);
      };
      
    } catch (err) {
      this._closeWebsocketConnection(err);
      this.failedConnections++;
      console.error('[思源Provider] 创建WebSocket连接失败:', err);
      this.emit('status', [{ status: 'error', error: err }]);
      
      // 尝试重新连接
      if (this.shouldConnect && this.failedConnections < MAX_RECONNECTION_ATTEMPTS) {
        console.log(`[思源Provider] 将在 ${RECONNECTION_DELAY}ms 后尝试重新连接 (${this.failedConnections}/${MAX_RECONNECTION_ATTEMPTS})`);
        this.reconnecting = true;
        setTimeout(() => {
          this.reconnecting = false;
          this._setupWebsocketConnection();
        }, RECONNECTION_DELAY);
      } else if (this.failedConnections >= MAX_RECONNECTION_ATTEMPTS) {
        console.error('[思源Provider] 重连次数已达上限，停止尝试');
        this.emit('status', [{ status: 'failed' }]);
      }
    }
  }
  
  /**
   * 连接WebSocket
   * @returns {Promise<boolean>} 是否连接成功
   */
  connect() {
    this.shouldConnect = true;
    
    if (!this.wsconnected && !this.wsconnecting) {
      this._setupWebsocketConnection();
    }
    
    return Promise.resolve(true);
  }
  
  /**
   * 断开WebSocket连接
   */
  disconnect() {
    this.shouldConnect = false
    this._closeWebsocketConnection()
  }
  
  /**
   * 销毁Provider，清理所有资源
   */
  destroy() {
    // 移除所有监听器
    this.disconnect()
    
    // 清除定时器
    if (this._checkInterval) {
      clearInterval(this._checkInterval)
      this._checkInterval = null
    }
    
    if (this._resyncInterval) {
      clearInterval(this._resyncInterval)
      this._resyncInterval = null
    }
    
    if (this._connectionTimeout) {
      clearTimeout(this._connectionTimeout)
      this._connectionTimeout = null
    }
    
    // 移除文档更新监听
    if (this.doc && typeof this.doc.off === 'function') {
      try {
        this.doc.off('update', this._updateHandler)
      } catch (err) {
        console.warn('[思源Provider] 移除文档更新监听失败:', err)
      }
    }
    
    // 移除感知状态更新监听
    if (this.awareness && typeof this.awareness.off === 'function') {
      try {
        this.awareness.off('update', this._awarenessUpdateHandler)
      } catch (err) {
        console.warn('[思源Provider] 移除感知状态更新监听失败:', err)
      }
    }
    
    // 移除窗口卸载监听
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this._beforeUnloadHandler)
    }
    
    // 移除思源消息处理器
    try {
      siyuanManager.removeMessageHandler(this.roomName, null)
    } catch (err) {
      console.warn('[思源Provider] 移除思源消息处理器失败:', err)
    }
    
    // 取消注册存储
    try {
      siyuanManager.unregisterStore(this.roomName)
    } catch (err) {
      console.warn('[思源Provider] 取消注册存储失败:', err)
    }
    
    // 断开思源连接
    try {
      siyuanManager.disconnect(this.roomName)
    } catch (err) {
      console.warn('[思源Provider] 断开思源连接失败:', err)
    }
    
    // 清空所有事件监听器
    this.emit('destroyed', [true])
    this.removeAllEventListeners()
  }
  
  /**
   * 获取连接的节点信息
   * @returns {Set<string>} 连接节点的ID集合
   */
  getPeers() {
    return new Set(['siyuan-ws'])
  }

  /**
   * 关闭WebSocket连接
   * @private
   * @param {Error} [error=null] 可选的错误对象
   */
  _closeWebsocketConnection(error = null) {
    if (error) {
      this.emit('connection-error', [error]);
    }
    
    this._clearWebsocketConnection();
    
    this.wsconnected = false;
    this.wsconnecting = false;
    this.synced = false;
  }
}

/**
 * 使用思源WebSocket Provider创建Yjs文档连接
 * @param {string} roomName - 房间名称
 * @param {Y.Doc} doc - Yjs文档实例
 * @param {Object} options - 配置选项
 * @returns {SiyuanProvider} 思源Provider实例
 */
export function createSiyuanProvider(roomName, doc, options = {}) {
  // 使用统一的Yjs实例
  const siyuanOptions = {
    ...options,
    Y: options.Y || Y // 使用提供的Y或默认的统一实例
  };
  
  // 直接使用原始文档，不再适配
  return new SiyuanProvider(roomName, doc, siyuanOptions);
}

export default SiyuanProvider 