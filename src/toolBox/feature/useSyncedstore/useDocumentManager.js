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
  // 存储连接实例
  connections: new Map(), // roomName -> { provider, refCount, status }
  
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
    let conn = this.connections.get(roomName)
    
    if (conn) {
      return this.useExistingConnection(conn)
    }

    // 检查是否使用思源同步
    if (options.useSiyuan || options.forceSiyuan) {
      return this.createSiyuanConnection(roomName, ydoc, options)
    }

    return this.createNewConnection(roomName, ydoc, options)
  },

  /**
   * 使用现有连接
   * @param {Object} conn - 连接条目
   * @returns {Object} WebRTC提供者或思源提供者
   */
  useExistingConnection(conn) {
    // 如果连接已存在，增加引用计数并返回现有连接
    conn.refCount++
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
    console.log(`[连接管理器] 为房间 ${roomName} 创建思源WebSocket连接`);
    
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
    console.log(`[连接管理器] 为房间 ${roomName} 创建新连接, 选项:`, {...options, signaling: options.signaling ? '已设置' : '未设置'});
    
    try {
      // 先检查是否有WebrtcProvider类
      if (typeof WebrtcProvider !== 'function') {
        throw new Error('WebrtcProvider 未定义，请确保正确导入');
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
      const provider = new WebrtcProvider(roomName,  ydoc);
      
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
      
      this.connections.set(roomName, {
        provider,
        refCount: 1,
        status: 'initialized'
      });
      
      console.log(`[连接管理器] 房间 ${roomName} 连接创建成功`);
      return provider;
    } catch (err) {
      console.error(`[连接管理器] 为房间 ${roomName} 创建连接失败:`, err);
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
   */
  cleanupConnection(roomName) {
    // 清理连接引用
    const conn = this.connections.get(roomName)
    if (!conn) return
    
    conn.refCount--
    if (conn.refCount <= 0) {
      this.destroyConnection(conn, roomName)
    }
  },

  /**
   * 销毁连接
   * @param {Object} conn - 连接条目
   * @param {string} roomName - 房间名称
   */
  destroyConnection(conn, roomName) {
    try {
      const provider = conn.provider
      if (!provider) return
      
      // 根据提供者类型执行不同的清理
      if (conn.type === 'siyuan') {
        // 思源提供者清理
        console.log(`[连接管理器] 销毁思源连接 (${roomName})`)
        
        if (typeof provider.destroy === 'function') {
          provider.destroy()
        } else {
          // 如果没有destroy方法，至少尝试断开连接
          if (typeof provider.disconnect === 'function') {
            provider.disconnect()
          }
        }
      } else {
        // WebRTC提供者清理
        console.log(`[连接管理器] 销毁WebRTC连接 (${roomName})`)
        
        if (provider.awareness) {
          try {
            provider.awareness.destroy()
          } catch (e) {
            console.warn(`[连接管理器] 清理awareness失败:`, e)
          }
        }
        
        try {
          provider.disconnect()
        } catch (e) {
          console.warn(`[连接管理器] 断开WebRTC连接失败:`, e)
        }
        
        try {
          provider.destroy()
        } catch (e) {
          console.warn(`[连接管理器] 销毁WebRTC提供者失败:`, e)
        }
      }
      
      // 删除连接记录
      this.connections.delete(roomName)
    } catch (err) {
      console.error(`[连接管理器] 销毁连接出错 (${roomName}):`, err)
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
    
    const connectionInfo = this.connections.get(roomName);
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
 * @returns {Promise<void>}
 */
export async function resetRoomConnection(roomName) {
  const connection = documentManager.connections.get(roomName)
  if (connection) {
    try {
      connection.provider.disconnect()
    } catch (e) {
      console.warn(`断开房间 ${roomName} 连接时出错:`, e)
    }
    documentManager.connections.delete(roomName)
    // 等待资源清理
    await new Promise(resolve => setTimeout(resolve, CLEANUP_DELAY))
  }
  await documentManager.cleanupRoom(roomName)
}

// 导出模块
export default documentManager 