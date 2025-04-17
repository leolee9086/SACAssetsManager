/**
 * @fileoverview 思源笔记 WebSocket Provider
 * 
 * 该模块提供思源笔记的WebSocket同步Provider实现，
 * 用于Yjs文档的实时协作同步。
 * 与标准y-websocket保持功能一致。
 * 
 * @requires yjs
 * @requires y-protocols
 */

// 使用统一的Yjs实例入口
import { default as Y } from './yjsInstance.js'

// 导入协议库
import * as awarenessProtocol from './impl/awareness.js'
import * as syncProtocol from './impl/sync.js'
// 移除auth协议，思源使用URL参数中的token进行鉴权
import * as encoding from './impl/encoding.js'
import * as decoding from './impl/decoding.js'
import { Observable } from './impl/observable.js'

// 导入思源集成管理器
import siyuanManager from './useSiyuanIntegration.js'

// 导入辅助工具
import { toUint8Array, decodeBase64, isValidDecoder, processMessageData } from './utils/binaryUtils.js'

// 消息类型常量
export const messageSync = 0
export const messageAwareness = 1
export const messageQueryAwareness = 3

// 重连配置常量
const RECONNECTION_DELAY = 5000 // 重连延迟时间（毫秒）
const MAX_RECONNECTION_ATTEMPTS = 5 // 最大重连尝试次数
const messageReconnectTimeout = 30000 // 消息重连超时时间

// 初始化同步函数
syncProtocol.initSyncFunctions(Y)

/**
 * 消息处理器数组
 * @type {Array<function(encoding.Encoder, decoding.Decoder, SiyuanProvider, boolean, number):void>}
 */
const messageHandlers = []

// 同步消息处理器
messageHandlers[messageSync] = (encoder, decoder, provider, emitSynced, _messageType) => {
  encoding.writeVarUint(encoder, messageSync)
  const syncMessageType = syncProtocol.readSyncMessage(
    decoder,
    encoder,
    provider.doc,
    provider
  )
  if (emitSynced && syncMessageType === syncProtocol.messageYjsSyncStep2 && !provider.synced) {
    provider.synced = true
  }
}

// 感知状态消息处理器
messageHandlers[messageQueryAwareness] = (encoder, _decoder, provider, _emitSynced, _messageType) => {
  encoding.writeVarUint(encoder, messageAwareness)
  encoding.writeVarUint8Array(
    encoder,
    awarenessProtocol.encodeAwarenessUpdate(
      provider.awareness,
      Array.from(provider.awareness.getStates().keys())
    )
  )
}

// 感知状态更新消息处理器
messageHandlers[messageAwareness] = (encoder, decoder, provider, _emitSynced, _messageType) => {
  awarenessProtocol.applyAwarenessUpdate(
    provider.awareness,
    decoding.readVarUint8Array(decoder),
    provider
  )
}

/**
 * 发送消息
 * @param {SiyuanProvider} provider Provider实例
 * @param {Uint8Array} data 二进制数据
 * @param {boolean} emitSynced 是否触发同步事件
 * @return {encoding.Encoder} 响应编码器
 */
const readMessage = (provider, data, emitSynced) => {
  const encoder = encoding.createEncoder()
  const decoder = decoding.createDecoder(data)
  const messageType = decoding.readVarUint(decoder)
  const handler = provider.messageHandlers[messageType]
  if (handler) {
    handler(encoder, decoder, provider, emitSynced, messageType)
  } else {
    console.error(`找不到消息处理器: ${messageType}`)
  }
  return encoder
}

/**
 * 发送消息
 * @param {SiyuanProvider} provider Provider实例
 * @param {Uint8Array} data 二进制数据
 */
const broadcastMessage = (provider, data) => {
  if (provider.wsconnected) {
    provider._send(data)
  }
}

// 记录模块加载状态
const moduleStatus = {
  isLoading: false,
  isLoaded: true,
  error: null,
  startTime: Date.now(),
  loadTime: 0,
  usingLocalImpl: false
}

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

/**
 * 思源WebSocket Provider
 * 提供与思源笔记WebSocket连接的Yjs同步提供器
 */
export class SiyuanProvider extends Observable {
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
   * @param {Object} [options.siyuanConfig] - 思源笔记配置
   * @param {string} [options.siyuanConfig.host='127.0.0.1'] - 思源笔记主机名
   * @param {number} [options.siyuanConfig.port=6806] - 思源笔记端口
   * @param {string} [options.siyuanConfig.token='6806'] - 思源笔记令牌，用于API鉴权，公网环境下应当使用强密码
   * @param {string} [options.siyuanConfig.channel='sync'] - 信道前缀，最终信道名为 {channel前缀}-{房间名}
   * @param {boolean} [options.siyuanConfig.autoReconnect=true] - 是否自动重连
   * @param {number} [options.siyuanConfig.reconnectInterval=1000] - 重连间隔（毫秒）
   * @param {number} [options.siyuanConfig.maxReconnectAttempts=10] - 最大重连尝试次数
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
    
    // 安全检查：确保思源配置和令牌
    siyuanConfig = {
      port: 6806,
      host: '127.0.0.1',
      token: '6806',
      channel: 'sync', // 信道前缀，最终信道名为 {channel}-{roomName}
      autoReconnect: true,
      reconnectInterval: 1000,
      maxReconnectAttempts: 10,
      ...siyuanConfig
    };
    
    // 基本属性
    this.roomName = roomName;
    this.doc = doc;
    this.Y = actualY;
    
    // 如果awareness未提供，创建awareness实例
    if (!awareness && awarenessProtocol && awarenessProtocol.Awareness) {
      try {
        this.awareness = new awarenessProtocol.Awareness(doc);
      } catch (err) {
        console.error('[思源Provider] 创建Awareness实例失败:', err);
        this.awareness = {
          states: new Map(),
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
    
    // 安全检查：在非本地环境中使用默认token进行警告
    if (siyuanConfig.host !== '127.0.0.1' && siyuanConfig.host !== 'localhost') {
      if (siyuanConfig.token === '6806' || !siyuanConfig.token) {
        console.warn(`[思源Provider] 安全警告: 在非本地环境 (${siyuanConfig.host}) 使用默认token。公网环境下应使用强密码作为token。`);
      }
    }
    
    // 配置属性
    this.params = params;
    this.maxBackoffTime = maxBackoffTime;
    this.disableBc = disableBc;
    this.resyncInterval = resyncInterval;
    this.messageHandlers = messageHandlers.slice();
    this.siyuanConfig = siyuanConfig;
    
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
    
    // 消息处理函数
    this._updateHandler = (update, origin) => {
      if (origin !== this) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.writeUpdate(encoder, update);
        broadcastMessage(this, encoding.toUint8Array(encoder));
      }
    };
    
    this._awarenessUpdateHandler = ({ added, updated, removed }) => {
      const changedClients = [...added, ...updated, ...removed];
      if (changedClients.length > 0) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageAwareness);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
        );
        broadcastMessage(this, encoding.toUint8Array(encoder));
      }
    };
    
    this._beforeUnloadHandler = () => {
      if (this.awareness) {
        awarenessProtocol.removeAwarenessStates(
          this.awareness,
          [doc.clientID],
          'tab closing'
        );
      }
    };
    
    // 监听事件
    this.doc.on('update', this._updateHandler);
    
    if (this.awareness) {
      this.awareness.on('update', this._awarenessUpdateHandler);
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this._beforeUnloadHandler);
    }
    
    // 设置重同步间隔
    if (resyncInterval > 0) {
      this._resyncInterval = setInterval(() => {
        if (this.wsconnected) {
          // 重新发送同步步骤1
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, messageSync);
          syncProtocol.writeSyncStep1(encoder, doc);
          this._send(encoding.toUint8Array(encoder));
        }
      }, resyncInterval);
    }
    
    // 设置连接状态检查
    this._checkInterval = setInterval(() => {
      if (
        this.wsconnected &&
        messageReconnectTimeout < Date.now() - this.wsLastMessageReceived
      ) {
        // 长时间未收到消息，关闭连接并重连
        this._closeWebsocketConnection();
      }
    }, messageReconnectTimeout / 10);
    
    // 自动连接
    if (connect) {
      this.connect();
    }
  }
  
  /**
   * 获取WebSocket URL
   */
  get url() {
    const { host, port, token, channel } = this.siyuanConfig;
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // 构建信道名
    const channelName = `${channel || 'sync'}-${this.roomName}`;
    
    // 构建查询参数
    const queryParams = new URLSearchParams();
    queryParams.set('channel', channelName);
    
    // 添加token
    if (token) {
      queryParams.set('token', encodeURIComponent(token));
    }
    
    // 添加用户参数
    for (const [key, value] of Object.entries(this.params)) {
      queryParams.set(key, value);
    }
    
    return `${protocol}//${host}:${port}/ws/broadcast?${queryParams.toString()}`;
  }
  
  /**
   * 获取当前是否已同步
   */
  get synced() {
    return this._synced;
  }
  
  /**
   * 设置同步状态并触发事件
   */
  set synced(state) {
    if (this._synced !== state) {
      this._synced = state;
      this.emit('synced', [state]);
      this.emit('sync', [state]);
    }
  }
  
  /**
   * 连接到思源WebSocket
   */
  connect() {
    this.shouldConnect = true;
    if (!this.wsconnected && this.ws === null) {
      this._setupWebsocketConnection();
      // 与y-websocket保持接口一致，增加BC支持
      if (!this.disableBc) {
        this.connectBc();
      }
    }
  }
  
  /**
   * 断开WebSocket连接
   */
  disconnect() {
    this.shouldConnect = false;
    
    // 断开BC连接
    if (!this.disableBc) {
      this.disconnectBc();
    }
    
    // 断开WebSocket连接
    if (this.ws !== null) {
      this._closeWebsocketConnection();
    }
  }
  
  /**
   * 销毁Provider，释放所有资源
   */
  destroy() {
    // 断开连接
    this.disconnect();
    
    // 清除定时器
    if (this._resyncInterval) {
      clearInterval(this._resyncInterval);
      this._resyncInterval = null;
    }
    
    if (this._checkInterval) {
      clearInterval(this._checkInterval);
      this._checkInterval = null;
    }
    
    // 移除事件监听
    this.doc.off('update', this._updateHandler);
    
    if (this.awareness) {
      this.awareness.off('update', this._awarenessUpdateHandler);
    }
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this._beforeUnloadHandler);
    }
    
    // 移除思源消息处理器
    try {
      siyuanManager.unregisterStore(this.roomName);
    } catch (err) {
      console.warn('[思源Provider] 取消注册存储失败:', err);
    }
    
    super.destroy();
  }
  
  /**
   * 连接广播通道（模仿y-websocket的BC功能）
   */
  connectBc() {
    // 思源适配器暂不支持BC，此处保留接口兼容性
    if (this.disableBc) {
      return;
    }
    
    this.bcconnected = true;
    console.log(`[思源Provider] 房间 "${this.roomName}" BC功能已连接（模拟）`);
    
    // 发送同步消息到BC
    // 实际不会广播，仅保持接口兼容
    const encoderSync = encoding.createEncoder();
    encoding.writeVarUint(encoderSync, messageSync);
    syncProtocol.writeSyncStep1(encoderSync, this.doc);
    
    // 发送状态
    const encoderState = encoding.createEncoder();
    encoding.writeVarUint(encoderState, messageSync);
    syncProtocol.writeSyncStep2(encoderState, this.doc);
    
    // 发送感知状态查询
    const encoderAwarenessQuery = encoding.createEncoder();
    encoding.writeVarUint(encoderAwarenessQuery, messageQueryAwareness);
    
    // 广播本地感知状态
    const encoderAwarenessState = encoding.createEncoder();
    encoding.writeVarUint(encoderAwarenessState, messageAwareness);
    encoding.writeVarUint8Array(
      encoderAwarenessState,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.doc.clientID])
    );
  }
  
  /**
   * A模拟断开广播通道（保持与y-websocket接口一致）
   */
  disconnectBc() {
    // 思源适配器暂不支持BC，此处保留接口兼容性
    if (this.disableBc || !this.bcconnected) {
      return;
    }
    
    // 广播带有null状态的消息（表示断开连接）
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageAwareness);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(
        this.awareness,
        [this.doc.clientID],
        new Map()
      )
    );
    
    this.bcconnected = false;
    console.log(`[思源Provider] 房间 "${this.roomName}" BC功能已断开（模拟）`);
  }
  
  /**
   * 发送消息
   * @param {Uint8Array} data - 要发送的二进制数据
   * @returns {boolean} - 是否发送成功
   * @private
   */
  _send(data) {
    if (!this.wsconnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (this.wsUnsuccessfulReconnects < this.siyuanConfig.maxReconnectAttempts) {
        // 未连接时尝试重连
        if (this.shouldConnect && !this.wsconnecting) {
          setTimeout(() => {
            this._setupWebsocketConnection();
          }, Math.min(this.maxBackoffTime, this.wsUnsuccessfulReconnects * 1000));
          this.wsUnsuccessfulReconnects++;
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
    this.wsLastMessageReceived = Date.now();
    
    try {
      // 处理各种类型的消息数据
      const { type, content } = processMessageData(event.data);
      
      switch (type) {
        case 'binary':
          // 直接处理二进制数据
          if (content && content.length > 0) {
            const encoder = readMessage(this, content, true);
            if (encoding.length(encoder) > 1) {
              this._send(encoding.toUint8Array(encoder));
            }
          }
          break;
          
        case 'json':
          // 处理JSON数据
          if (content && content.type === 'y-sync' && content.data) {
            // 处理封装的二进制数据
            try {
              const binaryData = typeof content.data === 'string' 
                ? decodeBase64(content.data) 
                : Array.isArray(content.data) 
                  ? new Uint8Array(content.data) 
                  : null;
                  
              if (binaryData && binaryData.length > 0) {
                const encoder = readMessage(this, binaryData, true);
                if (encoding.length(encoder) > 1) {
                  this._send(encoding.toUint8Array(encoder));
                }
              }
            } catch (extractErr) {
              console.warn('[思源Provider] 从JSON提取二进制数据失败:', extractErr);
            }
          } else {
            // 普通JSON消息
            this.emit('message', [content]);
          }
          break;
          
        case 'text':
          // 文本消息
          this.emit('message', [{ type: 'text', content }]);
          break;
          
        default:
          console.log('[思源Provider] 收到未知类型的消息:', type);
      }
    } catch (err) {
      console.warn('[思源Provider] 处理消息时出现问题:', err);
    }
  }
  
  /**
   * 清理WebSocket连接
   * @private
   */
  _closeWebsocketConnection() {
    try {
      // 重置状态
      this.wsconnected = false;
      this.wsconnecting = false;
      this.synced = false;
      
      // 清理WebSocket链接
      if (this.ws) {
        // 先移除所有事件监听器
        this.ws.onopen = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.onmessage = null;
        
        // 尝试关闭
        if (this.ws.readyState === WebSocket.OPEN || 
            this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
        }
        
        // 置空引用
        this.ws = null;
      }
      
      // 触发状态更新事件
      this.emit('status', [{ status: 'disconnected' }]);
    } catch (err) {
      console.error('[思源Provider] 清理WebSocket资源时出错:', err);
    }
  }
  
  /**
   * 建立WebSocket连接
   * @private
   */
  _setupWebsocketConnection() {
    if (this.wsconnecting || this.wsconnected) {
      return;
    }

    try {
      this.wsconnecting = true;
      this.ws = new WebSocket(this.url);
      this.ws.binaryType = 'arraybuffer';
      
      this.ws.onopen = () => {
        this.wsconnecting = false;
        this.wsconnected = true;
        this.wsUnsuccessfulReconnects = 0;
        
        // 触发状态事件
        this.emit('status', [{ status: 'connected', room: this.roomName }]);
        
        // 发送同步请求
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.writeSyncStep1(encoder, this.doc);
        this._send(encoding.toUint8Array(encoder));
      };
      
      this.ws.onmessage = (event) => {
        this._onMessage(event);
      };
      
      this.ws.onclose = (event) => {
        this.wsconnecting = false;
        this.wsconnected = false;
        this.synced = false;
        this.ws = null;
        
        // 尝试重连
        if (this.shouldConnect) {
          const reopenTimeout = setTimeout(() => {
            this._setupWebsocketConnection();
          }, Math.min(this.maxBackoffTime, this.wsUnsuccessfulReconnects * 1000));
          this.wsUnsuccessfulReconnects++;
        }
      };
      
      this.ws.onerror = (event) => {
        this.emit('connection-error', [event]);
      };
    } catch (err) {
      this.wsconnecting = false;
      console.error('[思源Provider] 创建WebSocket连接失败:', err);
    }
  }
  
  /**
   * 获取连接的节点信息
   * @returns {Set<string>} 连接节点的ID集合
   */
  getPeers() {
    return new Set(['siyuan-ws']);
  }
}

export default SiyuanProvider 