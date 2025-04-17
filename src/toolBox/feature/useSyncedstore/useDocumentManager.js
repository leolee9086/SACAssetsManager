/**
 * @fileoverview 文档管理器模块 - 管理YJS文档和房间连接
 * 
 * 该模块负责创建和管理YJS文档实例、房间连接和映射关系。
 * 提供文档和连接的复用机制，优化资源利用并简化状态管理。
 * 
 * @module documentManager
 * @requires yjs
 * @requires y-webrtc
 * @requires @syncedstore/core
 */

// 使用统一的Yjs实例入口
import Y from './yjsInstance.js'
import { WebrtcProvider } from '../../../../static/y-webrtc.js'
import { syncedStore } from '../../../../static/@syncedstore/core.js'

// 常量配置
const CLEANUP_DELAY = 100

/**
 * @typedef {Object} DocState
 * @property {Y.Doc} doc - Yjs文档实例
 * @property {Object} store - 同步存储实例
 * @property {Set<string>} activeRooms - 活跃房间集合
 * @property {number} lastAccess - 最后访问时间
 * @property {Object} metadata - 文档元数据
 */

/**
 * @typedef {Object} DocIdentifier
 * @property {string} projectId - 项目ID
 * @property {string} docType - 文档类型
 * @property {string} docId - 文档ID
 * @property {string} [viewId] - 视图ID
 */

// 文档和连接管理器
const documentManager = {
  // 存储文档实例
  docs: new Map(), // docId -> { ydoc, store, refCount, lastAccess }
  // 存储房间到文档的映射
  roomToDoc: new Map(), // roomName -> docId
  // 存储文档到房间的映射  
  docToRooms: new Map(), // docId -> Set<roomName>
  // 存储连接实例 - 键名改为组合键 "roomName:type:instanceId"
  connections: new Map(), // connectionKey -> { provider, refCount, status, type, options }
  
  /**
   * 生成连接键
   * @param {string} roomName - 房间名称
   * @param {Object} options - 连接配置
   * @param {string} [instanceId] - 实例ID
   * @returns {string} 连接键
   */
  generateConnectionKey(roomName, options, instanceId = '') {
    // 确定连接类型
    const type = this.getConnectionType(options);
    // 生成唯一标识符
    return `${roomName}:${type}${instanceId ? `:${instanceId}` : ''}`;
  },
  
  /**
   * 获取连接类型
   * @param {Object} options - 连接配置
   * @returns {string} 连接类型 'siyuan' 或 'webrtc'
   */
  getConnectionType(options) {
    return (options.useSiyuan || options.forceSiyuan) ? 'siyuan' : 'webrtc';
  },
  
  /**
   * 生成实例ID
   * @returns {string} 实例ID
   */
  generateInstanceId() {
    return `instance_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  },

  /**
   * 生成文档ID
   * @param {string} roomName - 房间名称
   * @returns {string} 文档ID
   */
  generateDocId(roomName) {
    // 可以根据需要自定义文档ID生成规则
    return roomName.split('/')[0]
  },

  /**
   * 获取或创建文档
   * @param {string} roomName - 房间名称
   * @param {Object} options - 配置选项
   * @returns {Promise<Object>} 文档状态
   */
  async getDocument(roomName, options = {}) {
    const docId = this.generateDocId(roomName)
    let docEntry = this.docs.get(docId)
    
    if (docEntry && !options.forceNewDoc) {
      return this.useExistingDocument(docEntry, docId, roomName)
    }

    return this.createNewDocument(docId, roomName)
  },

  /**
   * 使用现有文档
   * @param {Object} docEntry - 文档条目
   * @param {string} docId - 文档ID
   * @param {string} roomName - 房间名称
   * @returns {Object} 文档状态
   */
  useExistingDocument(docEntry, docId, roomName) {
    // 如果文档已存在，直接复用
    docEntry.refCount++
    docEntry.lastAccess = Date.now()
    
    // 添加房间映射
    this.addRoomMapping(docId, roomName)
    
    return {
      doc: docEntry.ydoc,
      store: docEntry.store,
      isExisting: true
    }
  },

  /**
   * 创建新文档
   * @param {string} docId - 文档ID
   * @param {string} roomName - 房间名称
   * @returns {Object} 文档状态
   */
  createNewDocument(docId, roomName) {
    // 创建新文档
    const ydoc = new Y.Doc()
    const store = syncedStore({ state: {} }, ydoc)
    
    const docEntry = {
      ydoc,
      store,
      refCount: 1,
      lastAccess: Date.now()
    }
    
    this.docs.set(docId, docEntry)
    this.addRoomMapping(docId, roomName)
    
    return {
      doc: ydoc,
      store,
      isExisting: false
    }
  },

  /**
   * 添加房间映射关系
   * @param {string} docId - 文档ID
   * @param {string} roomName - 房间名称
   */
  addRoomMapping(docId, roomName) {
    // 建立双向映射
    this.roomToDoc.set(roomName, docId)
    
    if (!this.docToRooms.has(docId)) {
      this.docToRooms.set(docId, new Set())
    }
    this.docToRooms.get(docId).add(roomName)
  },

  /**
   * 获取或创建连接
   * @param {string} roomName - 房间名称
   * @param {Object} ydoc - Y.Doc实例
   * @param {Object} options - 配置选项
   * @returns {Promise<Object>} WebRTC提供者或思源提供者
   */
  async getConnection(roomName, ydoc, options = {}) {
    // 如果options中没有instanceId，生成一个新的
    if (!options.instanceId) {
      options.instanceId = this.generateInstanceId();
    }
    
    // 确定连接类型
    const connectionType = this.getConnectionType(options);
    
    // 生成唯一连接键 - 包含实例ID确保每个面板使用独立连接
    const connectionKey = this.generateConnectionKey(roomName, options, options.instanceId);
    
    // 首先尝试查找完全匹配的连接（包括实例ID）
    let conn = this.connections.get(connectionKey);
    if (conn) {
      console.log(`[连接管理器] 精确复用房间 ${roomName} 的现有${connectionType}连接 (实例ID: ${options.instanceId})`);
      return this.useExistingConnection(conn);
    }
    
    // 如果找不到精确匹配的，尝试查找同一房间同类型的任何连接
    // 这样可以确保同一个房间的连接被复用，避免重复创建连接
    const existingConnection = this.findExistingRoomConnection(roomName, connectionType);
    if (existingConnection) {
      console.log(`[连接管理器] 房间复用 ${roomName} 的现有${connectionType}连接 (找到实例ID: ${existingConnection.instanceId})`);
      
      // 将当前实例ID对应到现有连接 - 创建一个引用
      this.connections.set(connectionKey, existingConnection);
      
      return this.useExistingConnection(existingConnection);
    }
    
    // 为该实例创建新连接
    console.log(`[连接管理器] 为房间 ${roomName} 创建新的${connectionType}连接 (实例ID: ${options.instanceId})`);
    
    // 根据连接类型创建对应提供者
    if (options.useSiyuan || options.forceSiyuan) {
      return this.createSiyuanConnection(roomName, ydoc, options);
    } else {
      return this.createNewConnection(roomName, ydoc, options);
    }
  },
  
  /**
   * 查找同一房间同类型的现有连接
   * @param {string} roomName - 房间名称
   * @param {string} connectionType - 连接类型
   * @returns {Object|null} 连接条目或空
   */
  findExistingRoomConnection(roomName, connectionType) {
    // 遍历所有连接，寻找匹配的
    for (const [key, conn] of this.connections.entries()) {
      // 检查连接键是否匹配格式 "roomName:type:instanceId"
      const parts = key.split(':');
      
      // 确保至少有房间名和类型
      if (parts.length >= 2) {
        const keyRoomName = parts[0];
        const keyType = parts[1];
        
        // 如果房间名和类型都匹配，返回这个连接
        if (keyRoomName === roomName && keyType === connectionType) {
          return conn;
        }
      }
    }
    
    // 没有找到匹配的
    return null;
  },

  /**
   * 使用现有连接
   * @param {Object} conn - 连接条目
   * @returns {Object} WebRTC提供者或思源提供者
   */
  useExistingConnection(conn) {
    // 如果连接已存在，增加引用计数并返回现有连接
    conn.refCount++
    
    // 更新连接状态为活跃状态
    if (conn.provider.connected) {
      conn.status = 'connected';
    }
    
    return conn.provider
  },

  /**
   * 创建思源WebSocket连接
   * @param {string} roomName - 房间名称
   * @param {Object} ydoc - Y.Doc实例
   * @param {Object} options - 配置选项
   * @returns {Object} 思源WebSocket提供者
   */
  async createSiyuanConnection(roomName, ydoc, options) {
    console.log(`[连接管理器] 为房间 ${roomName} 创建思源WebSocket连接 (实例ID: ${options.instanceId})`);
    
    try {
      // 动态导入思源Provider
      const { SiyuanProvider } = await import('./useSiyuanProvider.js');
      
      // 配置思源提供者
      const siyuanOptions = {
        connect: false, // 确保初始化时不自动连接
        // 传入Y引用以避免多实例问题
        Y: Y, // 使用统一的Yjs实例
        siyuanConfig: {
          port: options.port || 6806,
          host: options.host || '127.0.0.1',
          token: options.token || '6806',
          channel: options.channel || 'sync',
          autoReconnect: options.autoReconnect !== false,
          reconnectInterval: options.reconnectInterval || 1000,
          maxReconnectAttempts: options.maxReconnectAttempts || 10
        }
      };
      
      console.log(`[连接管理器] 房间 ${roomName} 尝试创建思源Provider`);
      
      // 创建思源Provider实例 - 直接传递ydoc，不再需要适配
      const provider = new SiyuanProvider(roomName, ydoc, siyuanOptions);
      
      // 生成连接键并存储连接
      const connectionKey = this.generateConnectionKey(roomName, options, options.instanceId);
      this.connections.set(connectionKey, {
        provider,
        refCount: 1,
        status: 'initialized',
        type: 'siyuan',
        options: {...options},
        instanceId: options.instanceId
      });
      
      console.log(`[连接管理器] 房间 ${roomName} 思源Provider创建成功`);
      return provider;
    } catch (err) {
      console.error(`[连接管理器] 为房间 ${roomName} 创建思源Provider失败:`, err);
      return null;
    }
  },

  /**
   * 创建新连接
   * @param {string} roomName - 房间名称
   * @param {Object} ydoc - Y.Doc实例
   * @param {Object} options - 配置选项
   * @returns {Object} WebRTC提供者
   */
  async createNewConnection(roomName, ydoc, options) {
    console.log(`[连接管理器] 为房间 ${roomName} 创建WebRTC连接 (实例ID: ${options.instanceId}), 选项:`, 
      {...options, signaling: options.signaling ? '已设置' : '未设置'});
    
    try {
      // 先检查是否有WebrtcProvider类
      if (typeof WebrtcProvider !== 'function') {
        throw new Error('WebrtcProvider 未定义，请确保正确导入');
      }
      
      // 全局检查是否已存在此房间的连接 - WebRTC连接可能存在于全局变量中
      if (typeof window !== 'undefined' && window._webrtcProviders) {
        const existingGlobalProvider = window._webrtcProviders[roomName];
        if (existingGlobalProvider) {
          console.log(`[连接管理器] 发现全局已存在房间 ${roomName} 的WebRTC连接，将复用`);
          
          // 存储连接并返回现有的
          const connectionKey = this.generateConnectionKey(roomName, options, options.instanceId);
          this.connections.set(connectionKey, {
            provider: existingGlobalProvider,
            refCount: 1,
            status: existingGlobalProvider.connected ? 'connected' : 'initialized',
            type: 'webrtc',
            options: {...options},
            instanceId: options.instanceId
          });
          
          return existingGlobalProvider;
        }
      }
      
      // 确保启用awareness，这对跨窗口通信很重要
      const finalOptions = {
        ...options,
        connect: false, // 确保初始化时不自动连接
        maxConns: options.maxConns || 20
      };
      
      // 如果options.awareness不存在，则需要创建一个awareness实例
      if (!finalOptions.awareness) {
        try {
          // 尝试导入awareness
          const { Awareness } = await import('./impl/awareness.js');
          // 创建awareness实例
          finalOptions.awareness = new Awareness(ydoc);
          console.log(`[WebRTC] 房间 ${roomName} 创建了新的awareness实例`);
        } catch (err) {
          console.error(`[WebRTC] 房间 ${roomName} 无法创建awareness实例:`, err);
          // 使用y-webrtc的原生实现来创建新的awareness
          if (typeof WebrtcProvider.awareness === 'function') {
            finalOptions.awareness = new WebrtcProvider.awareness(ydoc);
            console.log(`[WebRTC] 房间 ${roomName} 使用原生awareness实例`);
          } else {
            console.warn(`[WebRTC] 房间 ${roomName} 无法创建awareness实例，将依赖WebrtcProvider自动创建`);
          }
        }
      }
      
      // 创建新连接
      const provider = new WebrtcProvider(roomName, ydoc);
      
      // 存储到全局以便复用
      if (typeof window !== 'undefined') {
        if (!window._webrtcProviders) {
          window._webrtcProviders = {};
        }
        window._webrtcProviders[roomName] = provider;
      }
      
      // 确保awareness已设置并可用
      if (!provider.awareness) {
        throw new Error('Provider缺少awareness属性');
      }
      
      // 监听连接事件
      provider.on('status', (event) => {
        console.log(`[WebRTC] 房间 ${roomName} 连接状态改变:`, event);
      });
      
      provider.on('peers', (event) => {
        console.log(`[WebRTC] 房间 ${roomName} 对等节点变化, 当前节点数:`, event ? Object.keys(event).length : 0);
      });
      
      // 添加自定义sync方法
      provider.sync = () => {
        try {
          // 触发awareness更新
          if (provider.awareness) {
            provider.awareness.setLocalState({
              ...provider.awareness.getLocalState() || {},
              lastSync: Date.now()
            });
          }
          
          // 如果有原生sync方法则调用
          if (typeof provider._sync === 'function') {
            provider._sync();
          }
          
          console.log(`[WebRTC] 房间 ${roomName} 手动触发同步`);
          return true;
        } catch (err) {
          console.error(`[WebRTC] 房间 ${roomName} 手动触发同步失败:`, err);
          return false;
        }
      };
      
      // 生成连接键并存储连接
      const connectionKey = this.generateConnectionKey(roomName, options, options.instanceId);
      this.connections.set(connectionKey, {
        provider,
        refCount: 1,
        status: 'initialized',
        type: 'webrtc',
        options: {...options},
        instanceId: options.instanceId
      });
      
      console.log(`[连接管理器] 房间 ${roomName} WebRTC连接创建成功`);
      return provider;
    } catch (err) {
      console.error(`[连接管理器] 为房间 ${roomName} 创建WebRTC连接失败:`, err);
      throw err;
    }
  },

  /**
   * 清理房间资源
   * @param {string} roomName - 房间名称
   * @returns {Promise<void>}
   */
  async cleanupRoom(roomName) {
    const docId = this.roomToDoc.get(roomName)
    if (!docId) return

    this.cleanupConnection(roomName)
    this.cleanupDocument(docId, roomName)
  },

  /**
   * 清理连接资源
   * @param {string} roomName - 房间名称
   * @param {Object} options - 可选的连接选项 
   * @param {string} instanceId - 可选的实例ID
   */
  cleanupConnection(roomName, options = {}, instanceId = '') {
    // 确定要清理的连接键
    let connectionKey;
    
    if (instanceId) {
      // 如果提供了实例ID，则可以精确定位连接
      connectionKey = this.generateConnectionKey(roomName, options, instanceId);
      console.log(`[连接管理器] 清理房间 ${roomName} 的特定连接 (实例ID: ${instanceId})`);
    } else {
      // 如果没有提供实例ID，则需要遍历所有连接寻找匹配的
      console.log(`[连接管理器] 清理房间 ${roomName} 的所有连接`);
      
      // 查找所有与该房间相关的连接
      [...this.connections.entries()].forEach(([key, conn]) => {
        if (key.startsWith(`${roomName}:`)) {
          this.decrementConnectionRefCount(key, conn);
        }
      });
      
      return; // 已处理完所有连接，直接返回
    }
    
    // 获取特定的连接
    const conn = this.connections.get(connectionKey);
    if (!conn) {
      console.log(`[连接管理器] 未找到需要清理的连接: ${connectionKey}`);
      return;
    }
    
    this.decrementConnectionRefCount(connectionKey, conn);
  },
  
  /**
   * 减少连接引用计数并在必要时销毁连接
   * @param {string} connectionKey - 连接键
   * @param {Object} conn - 连接信息
   */
  decrementConnectionRefCount(connectionKey, conn) {
    conn.refCount--;
    console.log(`[连接管理器] 连接 ${connectionKey} 引用计数减少为 ${conn.refCount}`);
    
    if (conn.refCount <= 0) {
      this.destroyConnection(conn, connectionKey);
    }
  },

  /**
   * 销毁连接
   * @param {Object} conn - 连接条目
   * @param {string} connectionKey - 连接键
   */
  destroyConnection(conn, connectionKey) {
    try {
      const provider = conn.provider
      if (!provider) return
      
      // 获取房间名称 - 从连接键解析
      const roomName = connectionKey.split(':')[0]
      
      console.log(`[连接管理器] 销毁房间 ${roomName} 的连接`)
      
      // 清理provider
      try {
        // 清理status检查定时器
        if (provider.statusInterval) {
          clearInterval(provider.statusInterval)
          delete provider.statusInterval
        }
        
        // 断开WebRTC连接
        if (typeof provider.disconnect === 'function') {
          provider.disconnect()
        }
        
        // 销毁provider
        if (typeof provider.destroy === 'function') {
          provider.destroy()
        }
      } catch (err) {
        console.warn(`[连接管理器] 销毁Provider时出错:`, err)
      }
      
      // 删除连接记录
      this.connections.delete(connectionKey)
    } catch (err) {
      console.error(`[连接管理器] 销毁连接出错 (${connectionKey}):`, err)
    }
  },

  /**
   * 清理文档资源
   * @param {string} docId - 文档ID
   * @param {string} roomName - 房间名称
   */
  cleanupDocument(docId, roomName) {
    // 清理文档引用
    const docEntry = this.docs.get(docId)
    if (!docEntry) return
    
    docEntry.refCount--
    
    // 从房间映射中移除当前房间
    const roomSet = this.docToRooms.get(docId)
    if (roomSet) {
      roomSet.delete(roomName)
    }
    this.roomToDoc.delete(roomName)
    
    // 只有当没有任何房间使用此文档时才清理
    if (docEntry.refCount <= 0) {
      this.docs.delete(docId)
      this.docToRooms.delete(docId)
    }
  },

  /**
   * 获取文档的所有房间
   * @param {string} docId - 文档ID
   * @returns {Set<string>} 房间集合
   */
  getDocumentRooms(docId) {
    return this.docToRooms.get(docId) || new Set()
  },

  /**
   * 获取房间对应的文档
   * @param {string} roomName - 房间名称
   * @returns {Object|null} 文档条目
   */
  getRoomDocument(roomName) {
    const docId = this.roomToDoc.get(roomName)
    if (!docId) return null
    return this.docs.get(docId)
  },

  /**
   * 断开所有连接
   */
  disconnectAll() {
    // 创建一个房间名称的副本，避免在遍历过程中修改原集合
    const roomNames = [...this.connections.keys()]
    roomNames.forEach(roomName => this.cleanupRoom(roomName))
  },

  /**
   * 获取连接统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      documentCount: this.docs.size,
      connectionCount: this.connections.size,
      roomMappingCount: this.roomToDoc.size
    }
  },

  /**
   * 连接到思源WebSocket服务器
   * @param {string} roomName - 房间名称
   * @returns {Promise<boolean>} 连接是否成功
   */
  async connectSiyuan(roomName) {
    console.log(`[连接管理器] 尝试连接思源WebSocket, 房间: ${roomName}`);
    
    const connectionInfo = this.connections.get(this.generateConnectionKey(roomName, { useSiyuan: true }));
    if (!connectionInfo) {
      console.error(`[连接管理器] 找不到房间 ${roomName} 的连接信息`);
      return false;
    }
    
    if (connectionInfo.status === 'connected') {
      console.log(`[连接管理器] 房间 ${roomName} 已连接`);
      return true;
    }

    try {
      const provider = connectionInfo.provider;
      
      // 确保Provider已完成初始化
      if (provider._initializing) {
        try {
          await provider._initializing;
        } catch (err) {
          console.error(`[连接管理器] 房间 ${roomName} Provider初始化失败:`, err);
          return false;
        }
      }
      
      // 尝试连接
      const connected = await provider.connect();
      
      if (connected) {
        connectionInfo.status = 'connected';
        console.log(`[连接管理器] 房间 ${roomName} 成功连接到思源WebSocket`);
        return true;
      } else {
        connectionInfo.status = 'disconnected';
        console.error(`[连接管理器] 房间 ${roomName} 连接思源WebSocket失败`);
        return false;
      }
    } catch (err) {
      console.error(`[连接管理器] 连接思源WebSocket失败, 房间: ${roomName}`, err);
      return false;
    }
  },
}

/**
 * 重置指定房间的连接状态
 * @param {string} roomName - 需要重置的房间名称
 * @returns {Promise<boolean>} 操作是否成功
 */
export async function resetRoomConnection(roomName) {
  console.log(`[连接管理器] 重置房间 ${roomName} 的所有连接`);
  
  let success = true;
  
  try {
    // 找到所有与该房间相关的连接
    const connectionsToReset = [...documentManager.connections.entries()]
      .filter(([key]) => key.startsWith(`${roomName}:`));
    
    if (connectionsToReset.length === 0) {
      console.log(`[连接管理器] 未找到房间 ${roomName} 的连接`);
      return true;
    }
    
    // 断开所有连接 - 使用Promise.all确保所有断开操作都完成
    const disconnectPromises = connectionsToReset.map(async ([key, connection]) => {
      try {
        console.log(`[连接管理器] 断开连接: ${key}`);
        
        const provider = connection.provider;
        if (provider) {
          // 先记录连接类型
          const isSiyuanProvider = provider.constructor && 
                                  provider.constructor.name === 'SiyuanProvider';
          
          // 安全断开连接
          if (typeof provider.disconnect === 'function') {
            // 为断开操作设置超时，防止永久阻塞
            const disconnectPromise = provider.disconnect();
            
            // 如果是Promise则等待完成，否则创建已解决的Promise
            if (disconnectPromise instanceof Promise) {
              const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => {
                  console.warn(`[连接管理器] 断开连接 ${key} 操作超时`);
                  resolve(false);
                }, 2000); // 2秒超时
              });
              
              // 竞争Promise，谁先完成就返回谁的结果
              const result = await Promise.race([disconnectPromise, timeoutPromise]);
              console.log(`[连接管理器] 断开连接 ${key} 结果: ${result ? '成功' : '超时'}`);
            }
          }
          
          // 针对思源Provider的特殊处理
          if (isSiyuanProvider) {
            // 额外等待一些时间，确保资源被释放
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 强制清理WebSocket
            if (typeof provider._clearWebsocketConnection === 'function') {
              provider._clearWebsocketConnection();
            }
          }
        }
        
        // 无论结果如何，从管理器中移除连接
        documentManager.connections.delete(key);
        return true;
      } catch (e) {
        console.warn(`[连接管理器] 断开房间 ${roomName} 连接 ${key} 时出错:`, e);
        // 出错也要删除连接记录
        documentManager.connections.delete(key);
        return false;
      }
    });
    
    // 等待所有断开操作完成
    const results = await Promise.allSettled(disconnectPromises);
    success = results.every(r => r.status === 'fulfilled' && r.value === true);
    
    // 记录断开结果
    console.log(`[连接管理器] 房间 ${roomName} 所有连接断开结果: ${success ? '全部成功' : '部分失败'}`);
    
    // 无论断开结果如何，都等待资源清理
    await new Promise(resolve => setTimeout(resolve, CLEANUP_DELAY * 2));
    
    // 清理房间相关资源
    await documentManager.cleanupRoom(roomName);
    
    // 等待垃圾回收
    await new Promise(resolve => setTimeout(resolve, CLEANUP_DELAY));
    
    return success;
  } catch (error) {
    console.error(`[连接管理器] 重置房间 ${roomName} 连接时发生错误:`, error);
    // 尝试最终的清理
    try {
      await documentManager.cleanupRoom(roomName);
    } catch (e) {
      console.warn(`[连接管理器] 清理房间 ${roomName} 资源时出错:`, e);
    }
    return false;
  }
}

// 导出模块
export default documentManager 