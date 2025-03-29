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

import * as Y from '../../../../static/yjs.js'
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
   * @returns {Promise<Object>} WebRTC提供者
   */
  async getConnection(roomName, ydoc, options = {}) {
    let conn = this.connections.get(roomName)
    
    if (conn) {
      return this.useExistingConnection(conn)
    }

    return this.createNewConnection(roomName, ydoc, options)
  },

  /**
   * 使用现有连接
   * @param {Object} conn - 连接条目
   * @returns {Object} WebRTC提供者
   */
  useExistingConnection(conn) {
    // 如果连接已存在，增加引用计数并返回现有连接
    conn.refCount++
    return conn.provider
  },

  /**
   * 创建新连接
   * @param {string} roomName - 房间名称
   * @param {Object} ydoc - Y.Doc实例
   * @param {Object} options - 配置选项
   * @returns {Object} WebRTC提供者
   */
  createNewConnection(roomName, ydoc, options) {
    // 创建新连接
    const provider = new WebrtcProvider(roomName, ydoc, {
      ...options,
      connect: false // 确保初始化时不自动连接
    })
    
    this.connections.set(roomName, {
      provider,
      refCount: 1,
      status: 'initialized'
    })

    return provider
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
    // 只有当没有其他引用时才断开连接
    try {
      conn.provider.disconnect()
      if (conn.provider.statusInterval) {
        clearInterval(conn.provider.statusInterval)
      }
    } catch (e) {
      console.warn('清理连接时出错:', e)
    }
    this.connections.delete(roomName)
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
  }
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