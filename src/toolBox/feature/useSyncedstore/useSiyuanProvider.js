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

// 导入辅助工具
import { toUint8Array, decodeBase64, isValidDecoder, processMessageData } from './utils/binaryUtils.js'
import * as messageHandlers from './utils/messageHandlers.js'

// 初始化同步函数
syncProtocol.initSyncFunctions(Y);

// 从消息处理器中导入消息类型常量
const {
  MESSAGE_SYNC,
  MESSAGE_AWARENESS,
  MESSAGE_AUTH,
  MESSAGE_QUERY_AWARENESS
} = messageHandlers;

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
    
    // 基本属性
    this.roomName = roomName;
    this.doc = doc; // 直接使用原始doc，不再适配
    this.Y = actualY;
    
    // 如果awareness未提供，创建awareness实例
    if (!awareness && awarenessProtocol && awarenessProtocol.Awareness) {
      try {
        // 确保文档有clientID，如果没有则生成一个
        if (!doc.clientID) {
          doc.clientID = Math.floor(Math.random() * 1000000);
          console.warn('[思源Provider] 文档缺少clientID，已自动生成随机ID:', doc.clientID);
        }
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
      channel: 'sync', // 信道前缀，最终信道名为 {channel}-{roomName}
      autoReconnect: true,
      reconnectInterval: 1000,
      maxReconnectAttempts: 10,
      ...siyuanConfig
    };
    
    // 安全检查：在非本地环境中使用默认token进行警告
    if (this.siyuanConfig.host !== '127.0.0.1' && this.siyuanConfig.host !== 'localhost') {
      if (this.siyuanConfig.token === '6806' || !this.siyuanConfig.token) {
        console.warn(`[思源Provider] 安全警告: 在非本地环境 (${this.siyuanConfig.host}) 使用默认token。公网环境下应使用强密码作为token。`);
      } else if (this.siyuanConfig.token && this.siyuanConfig.token.length < 12) {
        console.warn(`[思源Provider] 安全警告: 在非本地环境中使用的token过短。建议使用至少12位的随机字符作为token。`);
      }
      
      // 检查是否使用HTTPS
      if (location.protocol !== 'https:') {
        console.warn('[思源Provider] 安全警告: 在非本地环境中未使用HTTPS连接。Token将以明文形式传输，存在安全风险。');
      }
    }
    
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
      // 思源广播API直接接收原始消息
      // 思源WebSocket广播通道直接发送内容，不需要额外处理
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
      // 使用智能处理函数处理各种类型的消息数据
      const { type, content } = processMessageData(event.data);
      
      switch (type) {
        case 'binary':
          // 直接处理二进制数据
          if (content && content.length > 0) {
            this._processYjsBinaryMessage(content);
          } else {
            console.log('[思源Provider] 收到空的二进制数据，跳过处理');
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
                this._processYjsBinaryMessage(binaryData);
              } else {
                console.log('[思源Provider] 从JSON中提取的二进制数据为空，跳过处理');
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
      // 仅记录警告，而非错误，以避免过多错误日志
      console.warn('[思源Provider] 处理消息时出现问题:', err);
      
      // 尝试使用原始数据（作为后备）
      try {
        const rawData = event.data;
        if (rawData instanceof ArrayBuffer || rawData instanceof Uint8Array) {
          // 直接以二进制方式处理
          const bytes = rawData instanceof ArrayBuffer ? new Uint8Array(rawData) : rawData;
          if (bytes && bytes.length > 0) {
            this._processYjsBinaryMessage(bytes);
          }
        }
      } catch (fallbackErr) {
        // 后备处理也失败，记录但不再尝试
        console.log('[思源Provider] 后备处理也失败，消息将被丢弃');
      }
    }
  }
  
  /**
   * 处理Yjs二进制消息
   * @param {Uint8Array} data - 二进制数据
   * @private
   */
  _processYjsBinaryMessage(data) {
    try {
      // 检查数据有效性
      if (!data || data.length === 0) {
        console.log('[思源Provider] 收到空的二进制消息，跳过处理');
        return;
      }
      
      // 创建解码器
      const decoder = decoding.createDecoder(data);
      
      // 空数据检查
      if (!decoder || !decoder.arr || decoder.arr.length === 0) {
        console.log('[思源Provider] 创建解码器失败或数据为空');
        return;
      }
      
      // 读取消息类型
      try {
        const messageType = decoding.readVarUint(decoder);
        this._handleYjsMessage(messageType, decoder);
      } catch (decodeErr) {
        // 如果读取消息类型失败，可能是数据格式不正确或已损坏
        // 这种情况下静默失败，否则会显示太多错误消息
        console.log('[思源Provider] 读取消息类型时出错，可能是无效数据');
      }
    } catch (err) {
      // 降级错误级别为warning，避免误报过多error
      console.warn('[思源Provider] 处理Yjs二进制消息时出现问题:', err);
    }
  }
  
  /**
   * 发送同步步骤1消息
   * @private
   */
  _sendSyncStep1() {
    if (!this.doc) {
      console.error('[思源Provider] 文档实例不可用');
      return;
    }
    
    messageHandlers.sendSyncStep1(this.doc, (data) => this._send(data));
  }
  
  /**
   * 发送查询感知状态消息
   * @private
   */
  _sendQueryAwareness() {
    messageHandlers.sendQueryAwareness((data) => this._send(data));
  }
  
  /**
   * 清理WebSocket连接
   * @private
   */
  _clearWebsocketConnection() {
    try {
      // 清理WebSocket链接
      if (this.ws) {
        // 先移除所有事件监听器，防止回调执行
        this.ws.onopen = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.onmessage = null;
        
        // 尝试关闭（如果还未关闭）
        try {
          if (this.ws.readyState === WebSocket.OPEN || 
              this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.close();
          }
        } catch (e) {
          console.warn('[思源Provider] 关闭WebSocket时出错 (忽略):', e);
        }
        
        // 置空引用
        this.ws = null;
      }
      
      // 重置状态
      this.wsconnected = false;
      this.wsconnecting = false;
      this.synced = false;
      
      // 触发状态更新事件
      this.emit('status', [{ status: 'disconnected' }]);
    } catch (err) {
      console.error('[思源Provider] 清理WebSocket资源时出错:', err);
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
    
    // 按照思源广播API的格式构建URL
    // 思源广播API: /ws/broadcast?channel={channel}&token={token}
    
    // 使用配置的channel作为前缀，加上房间名称构造完整的信道名
    // 格式为: {channel前缀}-{房间名}
    const channelPrefix = channel || 'sync';
    const channelName = `${channelPrefix}-${this.roomName}`;
    
    // 通过查询参数进行鉴权
    // 公网环境下，确保使用HTTPS连接以加密传输token
    // 使用encodeURIComponent确保token被正确编码
    const queryParams = new URLSearchParams();
    queryParams.set('channel', channelName);
    
    // 只有当token存在时才添加到URL中
    if (token) {
      queryParams.set('token', encodeURIComponent(token));
    }
    
    // 不在日志中显示token信息，避免泄露
    console.log(`[思源Provider] 房间 "${this.roomName}" 正在连接到信道: ${channelName}`);
    
    return `${protocol}//${host}:${port}/ws/broadcast?${queryParams.toString()}`;
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

    // 修复：如果正在连接中，防止重复调用
    if (this.wsconnecting) {
      console.warn('[思源Provider] 已经在连接过程中，跳过重复连接');
      return;
    }

    // 修复：检查连接状态更明确，避免重连引起问题
    if (this.ws) {
      // 如果已经有活跃连接，先清理WebSocket但不要递归调用_closeWebsocketConnection
      console.log('[思源Provider] 清理现有连接...');
      
      // 直接清理WebSocket资源
      // 先移除所有事件处理
      if (this.ws) {
        this.ws.onopen = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.onmessage = null;
        
        // 尝试关闭连接
        try {
          if (this.ws.readyState === WebSocket.OPEN || 
              this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.close();
          }
        } catch (err) {
          console.warn('[思源Provider] 关闭现有WebSocket连接时出错:', err);
        }
        
        // 重置WebSocket引用
        this.ws = null;
      }
      
      // 重置状态
      this.wsconnected = false;
      this.wsconnecting = false;
    }

    try {
      const url = this._buildWebSocketUrl();
      console.log(`[思源Provider] 房间 "${this.roomName}" 正在连接到: ${url}`);
      
      this.wsconnecting = true;
      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';
      
      // 设置连接超时
      const connectionTimeout = setTimeout(() => {
        if (this.wsconnecting && !this.wsconnected) {
          console.error(`[思源Provider] 房间 "${this.roomName}" 连接超时`);
          this._closeWebsocketConnection(new Error('连接超时'));
          
          // 如果应该重连，尝试重连
          if (this.shouldConnect && !this.reconnecting) {
            this.reconnecting = true;
            setTimeout(() => {
              this.reconnecting = false;
              this._setupWebsocketConnection();
            }, this.siyuanConfig.reconnectInterval || RECONNECTION_DELAY);
          }
        }
      }, 10000); // 10秒连接超时
      
      this.ws.onopen = () => {
        clearTimeout(connectionTimeout);
        this.failedConnections = 0;
        this.wsconnected = true;
        this.wsconnecting = false;
        console.log(`[思源Provider] 房间 "${this.roomName}" WebSocket连接已建立`);
        
        // 立即通知状态变化
        this.emit('status', [{ status: 'connected', room: this.roomName }]);
        
        // 延迟通知状态，确保其他组件已准备好接收
        // 发送多次状态事件，确保响应式系统能够捕捉
        const sendStatusEvent = () => {
          if (this.wsconnected) {
            console.log(`[思源Provider] 房间 "${this.roomName}" 发送定时状态事件确认已连接`);
            this.emit('status', [{ status: 'connected', room: this.roomName }]);
          }
        };
        
        // 500ms后再次发送
        setTimeout(sendStatusEvent, 500);
        
        // 1000ms后再次发送
        setTimeout(sendStatusEvent, 1000);
        
        // 2000ms后再次发送
        setTimeout(sendStatusEvent, 2000);
        
        // 发送身份验证消息
        const authSuccess = this._sendAuthMessage();
        if (authSuccess) {
          // 初始连接成功后发送同步请求
          this._sendSyncStep1();
          this._sendQueryAwareness();
        }
      };
      
      this.ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        
        // 检查关闭码，处理鉴权失败的情况
        if (event.code === 1000 || event.code === 1001) {
          // 正常关闭或前往其他页面，不显示警告
          this.wsconnected = false;
          this.wsconnecting = false;
          this.synced = false;
          this.ws = null;
          console.log(`[思源Provider] 房间 "${this.roomName}" 正常断开连接`);
        } else if (event.code === 1008) {
          // 1008 是策略违规，可能是鉴权失败
          const authError = new Error(`WebSocket鉴权失败: ${event.reason}`);
          // 移除递归调用，直接更新状态
          this.wsconnected = false;
          this.wsconnecting = false;
          this.synced = false;
          this.ws = null;
          console.error(`[思源Provider] 房间 "${this.roomName}" 鉴权失败: ${event.reason}`);
          this.emit('connection-error', [authError]);
          this.emit('status', [{ 
            status: 'auth_failed', 
            code: event.code, 
            reason: event.reason,
            room: this.roomName
          }]);
          
          // 鉴权失败情况下，增加重连延迟，避免频繁重试
          if (this.shouldConnect && !this.reconnecting) {
            this.failedConnections++;
            if (this.failedConnections < MAX_RECONNECTION_ATTEMPTS) {
              const delay = Math.min(30000, RECONNECTION_DELAY * Math.pow(2, this.failedConnections));
              console.log(`[思源Provider] 房间 "${this.roomName}" 鉴权失败，将在 ${delay}ms 后尝试重新连接 (${this.failedConnections}/${MAX_RECONNECTION_ATTEMPTS})`);
              this.reconnecting = true;
              setTimeout(() => {
                this.reconnecting = false;
                this._setupWebsocketConnection();
              }, delay);
            } else {
              console.error(`[思源Provider] 房间 "${this.roomName}" 鉴权失败次数已达上限，停止尝试`);
              this.emit('status', [{ status: 'auth_failed_max', room: this.roomName }]);
            }
          }
        } else {
          // 其他关闭情况
          // 移除递归调用，直接更新状态
          this.wsconnected = false;
          this.wsconnecting = false;
          this.synced = false;
          this.ws = null;
          
          console.warn(`[思源Provider] 房间 "${this.roomName}" WebSocket连接已关闭: ${event.code} ${event.reason}`);
          this.emit('status', [{ 
            status: 'disconnected', 
            code: event.code, 
            reason: event.reason,
            room: this.roomName
          }]);
          
          // 如果应该保持连接，尝试重新连接
          if (this.shouldConnect && !this.reconnecting) {
            this.failedConnections++;
            if (this.failedConnections < MAX_RECONNECTION_ATTEMPTS) {
              console.log(`[思源Provider] 房间 "${this.roomName}" 将在 ${RECONNECTION_DELAY}ms 后尝试重新连接 (${this.failedConnections}/${MAX_RECONNECTION_ATTEMPTS})`);
              this.reconnecting = true;
              setTimeout(() => {
                this.reconnecting = false;
                this._setupWebsocketConnection();
              }, RECONNECTION_DELAY);
            } else {
              console.error(`[思源Provider] 房间 "${this.roomName}" 重连次数已达上限，停止尝试`);
              this.emit('status', [{ status: 'failed', room: this.roomName }]);
            }
          }
        }
      };
      
      this.ws.onerror = (event) => {
        // 移除递归调用，直接更新状态
        this.wsconnected = false;
        this.wsconnecting = false;
        this.synced = false;
        
        const error = new Error(`房间 "${this.roomName}" WebSocket连接错误`);
        console.error(`[思源Provider] 房间 "${this.roomName}" WebSocket错误:`, event);
        
        // 如果WebSocket实例还存在，清理它
        if (this.ws) {
          this.ws.onopen = null;
          this.ws.onclose = null;
          this.ws.onerror = null;
          this.ws.onmessage = null;
          
          try {
            if (this.ws.readyState === WebSocket.OPEN || 
                this.ws.readyState === WebSocket.CONNECTING) {
              this.ws.close();
            }
          } catch (closeErr) {
            console.warn('[思源Provider] 在错误处理中关闭WebSocket时出错:', closeErr);
          }
          
          this.ws = null;
        }
        
        this.emit('connection-error', [error]);
        this.emit('status', [{ status: 'error', event, room: this.roomName }]);
      };
      
      this.ws.onmessage = (event) => {
        this._onMessage(event);
      };
      
    } catch (err) {
      this._closeWebsocketConnection(err);
      this.failedConnections++;
      console.error(`[思源Provider] 房间 "${this.roomName}" 创建WebSocket连接失败:`, err);
      this.emit('status', [{ status: 'error', error: err, room: this.roomName }]);
      
      // 尝试重新连接
      if (this.shouldConnect && this.failedConnections < MAX_RECONNECTION_ATTEMPTS) {
        console.log(`[思源Provider] 房间 "${this.roomName}" 将在 ${RECONNECTION_DELAY}ms 后尝试重新连接 (${this.failedConnections}/${MAX_RECONNECTION_ATTEMPTS})`);
        this.reconnecting = true;
        setTimeout(() => {
          this.reconnecting = false;
          this._setupWebsocketConnection();
        }, RECONNECTION_DELAY);
      } else if (this.failedConnections >= MAX_RECONNECTION_ATTEMPTS) {
        console.error(`[思源Provider] 房间 "${this.roomName}" 重连次数已达上限，停止尝试`);
        this.emit('status', [{ status: 'failed', room: this.roomName }]);
      }
    }
  }
  
  /**
   * 连接WebSocket
   * @returns {Promise<boolean>} 是否连接成功
   */
  connect() {
    // 如果已连接，直接返回成功
    if (this.wsconnected) {
      console.log(`[思源Provider] 房间 "${this.roomName}" 已连接，无需重复连接`);
      return Promise.resolve(true);
    }
    
    // 如果正在连接中，返回Promise稍后解析
    if (this.wsconnecting) {
      console.log(`[思源Provider] 房间 "${this.roomName}" 正在连接中，等待连接完成`);
      return new Promise((resolve) => {
        // 设置一个临时监听器，连接成功时解析
        const tempListener = (statusEvent) => {
          if (statusEvent[0]?.status === 'connected') {
            this.off('status', tempListener);
            resolve(true);
          }
        };
        
        // 设置超时，避免永久等待
        const timeout = setTimeout(() => {
          this.off('status', tempListener);
          resolve(this.wsconnected); // 返回当前连接状态
        }, 10000);
        
        // 监听状态变更
        this.on('status', tempListener);
      });
    }
    
    this.shouldConnect = true;
    this._setupWebsocketConnection();
    
    return new Promise((resolve) => {
      // 设置一个临时监听器，连接成功时解析
      const tempListener = (statusEvent) => {
        if (statusEvent[0]?.status === 'connected') {
          this.off('status', tempListener);
          clearTimeout(timeout);
          resolve(true);
        }
      };
      
      // 设置超时，避免永久等待
      const timeout = setTimeout(() => {
        this.off('status', tempListener);
        resolve(this.wsconnected); // 返回当前连接状态
      }, 10000);
      
      // 监听状态变更
      this.on('status', tempListener);
    });
  }
  
  /**
   * 断开WebSocket连接
   * @returns {Promise<boolean>} 操作是否成功
   */
  disconnect() {
    // 如果已经断开连接，直接返回
    if (!this.wsconnected && !this.wsconnecting) {
      console.log(`[思源Provider] 房间 "${this.roomName}" 已断开连接，无需重复断开`);
      return Promise.resolve(true);
    }
    
    // 设置不应该连接标志
    this.shouldConnect = false;
    
    // 添加安全超时，确保即使出现问题也能在合理时间内返回
    return new Promise((resolve) => {
      try {
        // 先更新状态
        this.emit('status', [{ status: 'disconnecting', room: this.roomName }]);
        
        // 重置同步状态
        this.synced = false;
        
        // 清除定时器
        if (this._checkInterval) {
          clearInterval(this._checkInterval);
          this._checkInterval = null;
        }
        
        if (this._resyncInterval) {
          clearInterval(this._resyncInterval);
          this._resyncInterval = null;
        }
        
        // 最多等待1秒后返回，避免永久阻塞
        const safetyTimeout = setTimeout(() => {
          console.warn('[思源Provider] 断开连接操作超时，强制完成');
          
          // 直接清理WebSocket而不调用_closeWebsocketConnection
          if (this.ws) {
            this.ws.onopen = null;
            this.ws.onclose = null;
            this.ws.onerror = null;
            this.ws.onmessage = null;
            
            try {
              if (this.ws.readyState === WebSocket.OPEN || 
                  this.ws.readyState === WebSocket.CONNECTING) {
                this.ws.close();
              }
            } catch (e) {
              console.warn('[思源Provider] 强制关闭WebSocket时出错:', e);
            }
            
            this.ws = null;
          }
          
          this.wsconnected = false;
          this.wsconnecting = false;
          this.synced = false;
          
          // 确保发送断开连接状态
          this.emit('status', [{ status: 'disconnected', room: this.roomName }]);
          resolve(true);
        }, 1000);
        
        // 如果没有活跃连接，无需执行关闭操作
        if (!this.ws) {
          clearTimeout(safetyTimeout);
          this.wsconnected = false;
          this.wsconnecting = false;
          resolve(true);
          return;
        }
        
        // 直接关闭WebSocket而不调用_closeWebsocketConnection
        const close = () => {
          if (this.ws) {
            // 移除所有事件处理
            const originalOnClose = this.ws.onclose;
            this.ws.onopen = null;
            this.ws.onerror = null;
            this.ws.onmessage = null;
            
            // 设置一个一次性onclose处理器
            this.ws.onclose = (e) => {
              clearTimeout(safetyTimeout);
              this.wsconnected = false;
              this.wsconnecting = false;
              this.synced = false;
              this.ws = null;
              
              // 通知状态更新
              this.emit('status', [{ status: 'disconnected', room: this.roomName }]);
              resolve(true);
            };
            
            // 关闭连接
            if (this.ws.readyState === WebSocket.OPEN || 
                this.ws.readyState === WebSocket.CONNECTING) {
              this.ws.close();
            } else {
              // 连接不处于可关闭状态
              clearTimeout(safetyTimeout);
              this.ws = null;
              this.wsconnected = false;
              this.wsconnecting = false;
              this.emit('status', [{ status: 'disconnected', room: this.roomName }]);
              resolve(true);
            }
          } else {
            // 没有WebSocket连接
            clearTimeout(safetyTimeout);
            this.wsconnected = false;
            this.wsconnecting = false;
            this.emit('status', [{ status: 'disconnected', room: this.roomName }]);
            resolve(true);
          }
        };
        
        // 立即执行关闭
        close();
      } catch (err) {
        console.error('[思源Provider] 断开连接时发生错误:', err);
        
        // 强制更新状态确保一致性
        this.wsconnected = false;
        this.wsconnecting = false;
        this.synced = false;
        this.ws = null;
        
        this.emit('status', [{ status: 'disconnected', error: err, room: this.roomName }]);
        resolve(false);
      }
    });
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
   * @returns {Promise<boolean>} 关闭状态
   */
  _closeWebsocketConnection(error = null) {
    return new Promise((resolve) => {
      // 如果存在错误，触发连接错误事件
      if (error) {
        this.emit('connection-error', [error]);
      }
      
      // 安全超时，确保即使出现问题也能返回
      const safetyTimeout = setTimeout(() => {
        console.warn('[思源Provider] 关闭WebSocket操作超时，强制完成');
        this.wsconnected = false;
        this.wsconnecting = false;
        this.synced = false;
        
        // 确保WebSocket资源被清理
        this._clearWebsocketConnection();
        resolve(true);
      }, 500);
      
      try {
        if (this.ws) {
          // 先移除所有事件处理，防止事件回调执行导致的死锁
          const originalOnClose = this.ws.onclose;
          
          // 移除所有可能导致问题的事件处理器
          this.ws.onopen = null;
          this.ws.onerror = null;
          this.ws.onmessage = null;
          
          // 设置一个安全的onclose处理器
          this.ws.onclose = () => {
            clearTimeout(safetyTimeout);
            this.wsconnected = false;
            this.wsconnecting = false;
            this.synced = false;
            this.ws = null;
            
            // 触发状态更新
            this.emit('status', [{ status: 'disconnected' }]);
            resolve(true);
          };
          
          // 检查WebSocket状态
          if (this.ws.readyState === WebSocket.OPEN || 
              this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.close();
          } else {
            // WebSocket已经关闭
            clearTimeout(safetyTimeout);
            this.ws = null;
            this.wsconnected = false;
            this.wsconnecting = false;
            this.synced = false;
            resolve(true);
          }
        } else {
          // 没有WebSocket连接
          clearTimeout(safetyTimeout);
          this.wsconnected = false;
          this.wsconnecting = false;
          this.synced = false;
          resolve(true);
        }
      } catch (err) {
        console.error(`[思源Provider] 关闭WebSocket连接时出错:`, err);
        clearTimeout(safetyTimeout);
        
        // 确保状态一致
        this.ws = null;
        this.wsconnected = false;
        this.wsconnecting = false;
        this.synced = false;
        
        resolve(false);
      }
    });
  }

  /**
   * 处理Yjs二进制消息
   * @param {number} messageType - 消息类型
   * @param {Object} decoder - 解码器
   * @private
   */
  _handleYjsMessage(messageType, decoder) {
    // 基本检查
    if (!decoder || !decoder.arr) {
      console.log('[思源Provider] 无效的解码器，跳过消息处理');
      return;
    }

    // 数据已读完的处理
    if (decoder.pos >= decoder.arr.length) {
      // 这可能是正常的情况 - 如果已经读取了所有必要的数据
      console.log(`[思源Provider] 解码器位置已到达数据末尾，消息类型: ${messageType}`);
      // 某些消息类型可能不需要额外数据，如认证消息
      if (messageType === MESSAGE_AUTH) {
        this.emit('auth', [{type: 'auth'}]);
      }
      return;
    }

    try {
      switch (messageType) {
        case MESSAGE_SYNC:
          // 处理同步消息
          if (!this.doc) {
            console.log('[思源Provider] 文档实例不可用，跳过同步消息处理');
            return;
          }
          
          const syncSuccess = messageHandlers.handleSyncMessage(decoder, this.doc, this);
          if (syncSuccess && !this.synced) {
            this.synced = true;
          }
          break;
          
        case MESSAGE_AWARENESS:
          // 处理感知状态消息
          if (!this.awareness) {
            console.log('[思源Provider] 感知状态实例不可用，跳过感知状态消息处理');
            return;
          }
          
          messageHandlers.handleAwarenessMessage(decoder, this.awareness, this);
          break;
          
        case MESSAGE_AUTH:
          // 处理认证消息 - 简单发射事件
          this.emit('auth', [{type: 'auth'}]);
          break;
          
        case MESSAGE_QUERY_AWARENESS:
          // 处理查询感知状态消息
          if (!this.awareness) {
            console.log('[思源Provider] 感知状态实例不可用，跳过查询感知状态消息处理');
            return;
          }
          
          const clientID = this.doc ? this.doc.clientID : null;
          messageHandlers.handleQueryAwarenessMessage(
            this.awareness,
            clientID,
            (data) => this._send(data)
          );
          break;
          
        default:
          console.log(`[思源Provider] 未知的消息类型: ${messageType}，跳过处理`);
      }
    } catch (err) {
      // 降级为警告级别，避免过多错误消息
      console.warn(`[思源Provider] 处理Yjs消息(类型${messageType})时出现问题:`, err);
      
      // 仅当真正发生错误且是同步消息时才尝试重新同步
      if (messageType === MESSAGE_SYNC) {
        setTimeout(() => {
          try {
            this._sendSyncStep1();
          } catch (retryErr) {
            console.log('[思源Provider] 重新同步尝试失败，将在下次消息时重试');
          }
        }, 2000);
      }
    }
  }

  /**
   * 发送身份验证消息
   * @private
   */
  _sendAuthMessage() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[思源Provider] 无法发送身份验证消息：WebSocket未连接');
      return false;
    }
    
    try {
      // 为了向后兼容，保持原有的鉴权方式
      // 在URL中已经传递了token参数
      // 此方法在将来可以用于增强型的鉴权（如JWT令牌刷新等）
      return true;
    } catch (err) {
      console.error('[思源Provider] 发送身份验证消息失败:', err);
      return false;
    }
  }
}

/**
 * 使用思源WebSocket Provider创建Yjs文档连接
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