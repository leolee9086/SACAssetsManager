import * as Y from '../../../../static/yjs.js'
import { syncedStore } from '../../../../static/@syncedstore/core.js'

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

class DocumentManager {
  constructor() {
    this.docs = new Map() // docId -> DocState
    this.roomToDoc = new Map() // roomName -> docId
    this.cleanupTimer = null
    this.CLEANUP_INTERVAL = 30 * 60 * 1000 // 30分钟清理一次
    this.DOC_EXPIRE_TIME = 60 * 60 * 1000 // 1小时后过期
    
    this._startCleanupTimer()
  }

  /**
   * 解析房间名称获取文档标识符
   * @param {string} roomName - 房间名称
   * @returns {DocIdentifier}
   */
  parseRoomName(roomName) {
    const parts = roomName.split('/')
    return {
      projectId: parts[0] || 'default',
      docType: parts[1] || 'doc',
      docId: parts[2] || 'default',
      viewId: parts[3]
    }
  }

  /**
   * 生成文档ID
   * @param {DocIdentifier} identifier - 文档标识符
   * @returns {string}
   */
  generateDocId(identifier) {
    return `${identifier.projectId}/${identifier.docType}/${identifier.docId}`
  }

  /**
   * 获取或创建文档
   * @param {string} roomName - 房间名称
   * @param {Object} options - 配置选项
   * @returns {Promise<{doc: Y.Doc, store: Object, isExisting: boolean}>}
   */
  async getDocument(roomName, options = {}) {
    const identifier = this.parseRoomName(roomName)
    const docId = this.generateDocId(identifier)
    
    // 检查现有文档
    let docState = this.docs.get(docId)
    if (docState && !options.forceNewDoc) {
      docState.lastAccess = Date.now()
      docState.activeRooms.add(roomName)
      this.roomToDoc.set(roomName, docId)
      return {
        doc: docState.doc,
        store: docState.store,
        isExisting: true
      }
    }

    // 创建新文档
    const doc = new Y.Doc()
    const store = syncedStore({ state: {} }, doc)
    
    docState = {
      doc,
      store,
      activeRooms: new Set([roomName]),
      lastAccess: Date.now(),
      metadata: {
        createdAt: Date.now(),
        identifier,
        version: 1
      }
    }

    this.docs.set(docId, docState)
    this.roomToDoc.set(roomName, docId)

    return {
      doc: doc,
      store,
      isExisting: false
    }
  }

  /**
   * 清理房间连接
   * @param {string} roomName - 房间名称
   */
  cleanupRoom(roomName) {
    const docId = this.roomToDoc.get(roomName)
    if (!docId) return

    const docState = this.docs.get(docId)
    if (!docState) return

    docState.activeRooms.delete(roomName)
    this.roomToDoc.delete(roomName)

    // 如果没有活跃房间，标记最后访问时间
    if (docState.activeRooms.size === 0) {
      docState.lastAccess = Date.now()
    }
  }

  /**
   * 获取文档的所有活跃房间
   * @param {string} docId - 文档ID
   * @returns {Set<string>} 房间名称集合
   */
  getDocumentRooms(docId) {
    const docState = this.docs.get(docId)
    return docState ? docState.activeRooms : new Set()
  }

  /**
   * 获取房间对应的文档ID
   * @param {string} roomName - 房间名称
   * @returns {string|null} 文档ID
   */
  getRoomDocument(roomName) {
    return this.roomToDoc.get(roomName) || null
  }

  /**
   * 清理过期文档
   * @private
   */
  _cleanupExpiredDocs() {
    const now = Date.now()
    for (const [docId, docState] of this.docs.entries()) {
      if (docState.activeRooms.size === 0 && 
          now - docState.lastAccess > this.DOC_EXPIRE_TIME) {
        this.docs.delete(docId)
      }
    }
  }

  /**
   * 启动清理计时器
   * @private
   */
  _startCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.cleanupTimer = setInterval(() => {
      this._cleanupExpiredDocs()
    }, this.CLEANUP_INTERVAL)
  }

  /**
   * 销毁管理器
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.docs.clear()
    this.roomToDoc.clear()
  }
}

// 创建单例实例
const documentManager = new DocumentManager()
export default documentManager 