/**
 * 协同编辑管理器
 * 提供实时协作编辑支持，基于CRDT实现无冲突的并发编辑
 */

/**
 * 操作类型
 * @enum {string}
 */
export const OperationType = {
  INSERT: 'insert',
  DELETE: 'delete',
  MARK: 'mark',
  METADATA: 'metadata'
};

/**
 * 创建协同编辑管理器
 * 
 * @param {Object} options - 配置选项
 * @param {string} options.userId - 当前用户的唯一ID
 * @param {Object} options.documentModel - 文档模型实例
 * @param {Object} options.eventManager - 事件管理器实例
 * @param {Function} options.syncFunction - 同步操作到远程的函数
 * @param {boolean} options.debugMode - 是否启用调试模式
 * @returns {Object} 协同编辑管理器API
 */
export const createCollaborationManager = (options = {}) => {
  const {
    userId = `user-${Math.random().toString(36).substr(2, 9)}`,
    documentModel = null,
    eventManager = null,
    syncFunction = null,
    debugMode = false
  } = options;
  
  if (!documentModel) {
    throw new Error('协同编辑管理器需要一个文档模型实例');
  }
  
  // 用于生成唯一时间戳的逻辑时钟
  let logicalClock = 0;
  
  // 本地状态
  const state = {
    isConnected: false,
    syncing: false,
    pendingOperations: [],
    remoteUsers: new Map(),
    lastSyncTime: 0,
    version: 0
  };
  
  // 受控操作队列，用于跟踪本地和远程操作
  const operationLog = [];
  
  /**
   * 生成操作ID
   * 包含用户ID、逻辑时钟和随机部分，确保全局唯一性
   * @returns {string} 唯一的操作ID
   */
  const generateOperationId = () => {
    logicalClock++;
    return `${userId}-${logicalClock}-${Math.random().toString(36).substr(2, 9)}`;
  };
  
  /**
   * 创建一个本地操作并添加到操作日志
   * @param {string} type - 操作类型
   * @param {Object} data - 操作数据
   * @returns {Object} 创建的操作对象
   */
  const createOperation = (type, data) => {
    const operation = {
      id: generateOperationId(),
      type,
      data,
      origin: userId,
      timestamp: Date.now(),
      logicalTime: logicalClock,
      version: state.version + 1
    };
    
    operationLog.push(operation);
    state.version = operation.version;
    
    if (debugMode) {
      console.log(`[协同] 创建操作:`, operation);
    }
    
    return operation;
  };
  
  /**
   * 将操作应用到文档模型
   * @param {Object} operation - 操作对象
   * @returns {boolean} 是否成功应用
   */
  const applyOperation = (operation) => {
    if (!operation || !operation.type) {
      return false;
    }
    
    try {
      documentModel.beginTransaction(`远程-${operation.type}`);
      
      switch (operation.type) {
        case OperationType.INSERT:
          // 在指定位置插入内容
          documentModel.updateContent(content => {
            // 假设内容是字符串或者有类似splice方法的数组
            if (typeof content === 'string') {
              return content.slice(0, operation.data.position) + 
                     operation.data.content + 
                     content.slice(operation.data.position);
            } else if (Array.isArray(content)) {
              return [
                ...content.slice(0, operation.data.position),
                operation.data.content,
                ...content.slice(operation.data.position)
              ];
            }
            return content;
          });
          break;
          
        case OperationType.DELETE:
          // 删除指定范围的内容
          documentModel.updateContent(content => {
            if (typeof content === 'string') {
              return content.slice(0, operation.data.start) + 
                     content.slice(operation.data.end);
            } else if (Array.isArray(content)) {
              return [
                ...content.slice(0, operation.data.start),
                ...content.slice(operation.data.end)
              ];
            }
            return content;
          });
          break;
          
        case OperationType.MARK:
          // 为内容添加标记（如格式化、注释等）
          documentModel.setMetadata(`mark-${operation.data.id}`, {
            range: operation.data.range,
            attributes: operation.data.attributes
          });
          break;
          
        case OperationType.METADATA:
          // 更新文档元数据
          documentModel.setMetadata(operation.data.key, operation.data.value);
          break;
          
        default:
          if (debugMode) {
            console.warn(`[协同] 未知的操作类型:`, operation.type);
          }
          documentModel.rollbackTransaction();
          return false;
      }
      
      documentModel.commitTransaction();
      return true;
    } catch (error) {
      if (debugMode) {
        console.error(`[协同] 应用操作失败:`, error, operation);
      }
      documentModel.rollbackTransaction();
      return false;
    }
  };
  
  /**
   * 处理远程操作
   * @param {Object} operation - 从远程接收的操作
   * @returns {boolean} 是否成功处理
   */
  const handleRemoteOperation = (operation) => {
    // 检查是否已经处理过此操作
    const isDuplicate = operationLog.some(op => op.id === operation.id);
    if (isDuplicate) {
      if (debugMode) {
        console.log(`[协同] 忽略重复操作:`, operation.id);
      }
      return false;
    }
    
    // 应用操作到文档
    const success = applyOperation(operation);
    
    if (success) {
      // 添加到操作日志
      operationLog.push(operation);
      
      // 更新版本号
      if (operation.version > state.version) {
        state.version = operation.version;
      }
      
      // 更新远程用户信息
      if (operation.origin && operation.origin !== userId) {
        state.remoteUsers.set(operation.origin, {
          lastActive: Date.now(),
          lastOperation: operation.id
        });
      }
      
      // 触发远程变更事件
      if (eventManager) {
        eventManager.core.dispatch('customRemoteChange', null, {
          operation,
          origin: operation.origin,
          timestamp: Date.now()
        });
      }
    }
    
    return success;
  };
  
  /**
   * 将本地操作同步到远程
   * @param {Object} operation - 本地操作
   * @returns {Promise<boolean>} 是否成功同步
   */
  const syncOperationToRemote = async (operation) => {
    if (!syncFunction || !state.isConnected) {
      // 如果未连接或没有同步函数，添加到待处理队列
      state.pendingOperations.push(operation);
      return false;
    }
    
    state.syncing = true;
    try {
      await syncFunction(operation);
      state.lastSyncTime = Date.now();
      state.syncing = false;
      return true;
    } catch (error) {
      if (debugMode) {
        console.error(`[协同] 同步操作失败:`, error, operation);
      }
      // 添加到待处理队列以便重试
      state.pendingOperations.push(operation);
      state.syncing = false;
      return false;
    }
  };
  
  /**
   * 处理文档模型变更，转换为协作操作
   * @param {Object} changeData - 文档模型变更数据
   */
  const handleDocumentChange = (changeData) => {
    if (changeData.type !== 'transaction') return;
    
    // 检查操作的来源，避免循环处理
    if (changeData.meta && changeData.meta.remoteOrigin) return;
    
    // 转换文档操作为协作操作
    changeData.operations.forEach(docOp => {
      let collaborationOp;
      
      switch (docOp.type) {
        case 'replace':
          // 全文档替换，转换为删除+插入
          collaborationOp = createOperation(OperationType.DELETE, {
            start: 0,
            end: Infinity // 表示删除全部
          });
          syncOperationToRemote(collaborationOp);
          
          collaborationOp = createOperation(OperationType.INSERT, {
            position: 0,
            content: docOp.content
          });
          break;
          
        case 'update':
          // 更新操作需要特殊处理，这里简化处理
          // 实际应用中应该分析updater函数或记录其执行结果的差异
          collaborationOp = createOperation(OperationType.METADATA, {
            key: 'update-op',
            value: { timestamp: Date.now() }
          });
          break;
          
        case 'set_meta':
          collaborationOp = createOperation(OperationType.METADATA, {
            key: docOp.key,
            value: docOp.value
          });
          break;
          
        default:
          if (debugMode) {
            console.warn(`[协同] 未处理的文档操作类型:`, docOp.type);
          }
          return;
      }
      
      if (collaborationOp) {
        syncOperationToRemote(collaborationOp);
      }
    });
  };
  
  /**
   * 建立连接到协作会话
   * @param {Object} sessionInfo - 会话信息
   * @returns {Promise<boolean>} 是否成功连接
   */
  const connect = async (sessionInfo = {}) => {
    if (state.isConnected) {
      return true;
    }
    
    try {
      // 设置连接状态
      state.isConnected = true;
      
      // 处理挂起的操作
      if (state.pendingOperations.length > 0) {
        const operations = [...state.pendingOperations];
        state.pendingOperations = [];
        
        for (const operation of operations) {
          await syncOperationToRemote(operation);
        }
      }
      
      // 如果提供了eventManager，监听文档变更
      if (documentModel && eventManager) {
        documentModel.addChangeListener(handleDocumentChange);
      }
      
      if (eventManager) {
        eventManager.core.dispatch('customCollaborationStateChange', null, {
          state: 'connected',
          timestamp: Date.now(),
          sessionInfo
        });
      }
      
      return true;
    } catch (error) {
      state.isConnected = false;
      if (debugMode) {
        console.error(`[协同] 连接失败:`, error);
      }
      return false;
    }
  };
  
  /**
   * 断开协作会话
   * @returns {Promise<boolean>} 是否成功断开
   */
  const disconnect = async () => {
    if (!state.isConnected) {
      return true;
    }
    
    try {
      // 设置连接状态
      state.isConnected = false;
      
      if (eventManager) {
        eventManager.core.dispatch('customCollaborationStateChange', null, {
          state: 'disconnected',
          timestamp: Date.now()
        });
      }
      
      return true;
    } catch (error) {
      if (debugMode) {
        console.error(`[协同] 断开失败:`, error);
      }
      return false;
    }
  };
  
  /**
   * 获取协作状态信息
   * @returns {Object} 状态信息
   */
  const getStatus = () => {
    return {
      userId,
      isConnected: state.isConnected,
      syncing: state.syncing,
      pendingOperations: state.pendingOperations.length,
      remoteUsers: Array.from(state.remoteUsers.entries()).map(([id, info]) => ({
        id,
        lastActive: info.lastActive
      })),
      lastSyncTime: state.lastSyncTime,
      version: state.version,
      operationCount: operationLog.length
    };
  };
  
  /**
   * 处理用户状态更新（如光标位置、选区等）
   * @param {string} userId - 用户ID
   * @param {Object} presenceData - 状态数据
   */
  const handleUserPresence = (userId, presenceData) => {
    if (!userId || !presenceData) return;
    
    // 更新远程用户信息
    const userInfo = state.remoteUsers.get(userId) || {};
    state.remoteUsers.set(userId, {
      ...userInfo,
      lastActive: Date.now(),
      presence: presenceData
    });
    
    // 触发用户状态更新事件
    if (eventManager) {
      eventManager.core.dispatch('customUserPresenceChange', null, {
        userId,
        presence: presenceData,
        timestamp: Date.now()
      });
    }
  };
  
  /**
   * 发送当前用户的状态（如光标位置）
   * @param {Object} presenceData - 状态数据
   */
  const updatePresence = (presenceData) => {
    if (!syncFunction || !state.isConnected) return;
    
    // 创建一个特殊的元数据操作
    const operation = createOperation(OperationType.METADATA, {
      key: `presence-${userId}`,
      value: {
        ...presenceData,
        timestamp: Date.now()
      }
    });
    
    // 同步到远程
    syncOperationToRemote(operation);
  };
  
  /**
   * 处理远程操作的批量接收
   * @param {Array} operations - 远程操作数组
   * @returns {number} 成功处理的操作数
   */
  const handleRemoteOperations = (operations) => {
    if (!Array.isArray(operations)) {
      return 0;
    }
    
    let successCount = 0;
    
    // 为提高效率，批量处理多个操作
    const batchTransaction = documentModel.beginTransaction('远程批量更新');
    
    try {
      // 先按逻辑时间排序
      operations.sort((a, b) => {
        // 先按版本号排序
        if (a.version !== b.version) {
          return a.version - b.version;
        }
        // 版本号相同，按逻辑时钟排序
        return a.logicalTime - b.logicalTime;
      });
      
      // 应用每个操作
      for (const operation of operations) {
        if (applyOperation(operation)) {
          successCount++;
          
          // 添加到操作日志
          operationLog.push(operation);
          
          // 更新版本号
          if (operation.version > state.version) {
            state.version = operation.version;
          }
        }
      }
      
      documentModel.commitTransaction();
      
      // 触发批量更新事件
      if (successCount > 0 && eventManager) {
        eventManager.core.dispatch('customRemoteBatchChange', null, {
          count: successCount,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      documentModel.rollbackTransaction();
      if (debugMode) {
        console.error(`[协同] 批量处理远程操作失败:`, error);
      }
    }
    
    return successCount;
  };
  
  /**
   * 获取自上次同步以来的所有本地操作
   * @param {number} sinceVersion - 起始版本号
   * @returns {Array} 操作数组
   */
  const getLocalOperationsSince = (sinceVersion = 0) => {
    return operationLog.filter(op => 
      op.origin === userId && op.version > sinceVersion
    );
  };
  
  return {
    // 连接管理
    connect,
    disconnect,
    getStatus,
    
    // 操作处理
    handleRemoteOperation,
    handleRemoteOperations,
    createOperation,
    
    // 用户状态同步
    updatePresence,
    handleUserPresence,
    
    // 查询方法
    getLocalOperationsSince,
    
    // 内部状态（供调试使用）
    debug: debugMode ? {
      getState: () => ({ ...state }),
      getOperationLog: () => [...operationLog],
      getCurrentLogicalClock: () => logicalClock
    } : undefined
  };
};

/**
 * 创建集成到事件系统的协同编辑适配器
 * 
 * @param {Object} collaborationManager - 协同编辑管理器实例
 * @param {Object} eventManager - 事件管理器实例
 * @returns {Object} 协同编辑适配器API
 */
export const createCollaborationAdapter = (collaborationManager, eventManager) => {
  if (!collaborationManager || !eventManager) {
    throw new Error('协同编辑适配器需要协同管理器和事件管理器实例');
  }
  
  /**
   * 处理本地光标位置变化
   * @param {Object} selectionData - 选择数据
   */
  const handleSelectionChange = (selectionData) => {
    if (!selectionData) return;
    
    // 更新协作状态中的光标位置
    collaborationManager.updatePresence({
      type: 'selection',
      selection: selectionData,
      timestamp: Date.now()
    });
  };
  
  /**
   * 处理用户焦点状态变化
   * @param {boolean} isFocused - 是否聚焦
   */
  const handleFocusChange = (isFocused) => {
    // 更新协作状态中的焦点状态
    collaborationManager.updatePresence({
      type: 'focus',
      focused: isFocused,
      timestamp: Date.now()
    });
  };
  
  /**
   * 绑定事件监听
   */
  const bindEvents = () => {
    // 监听选区变化
    eventManager.core.onCustomEvent('customSelectionChange', (e) => {
      if (e && e.selection) {
        handleSelectionChange(e.selection);
      }
    });
    
    // 监听焦点变化
    eventManager.core.onCustomEvent('customFocusChange', (e) => {
      if (e && typeof e.focused !== 'undefined') {
        handleFocusChange(e.focused);
      }
    });
    
    // 监听远程用户状态变化
    eventManager.core.onCustomEvent('customUserPresenceChange', (e) => {
      if (e && e.userId && e.presence) {
        // 更新UI以显示远程用户光标/选区
        if (e.presence.type === 'selection' && e.presence.selection) {
          eventManager.core.dispatch('customRemoteCursorUpdate', null, {
            userId: e.userId,
            selection: e.presence.selection,
            timestamp: e.timestamp
          });
        }
      }
    });
  };
  
  /**
   * 解绑事件监听
   */
  const unbindEvents = () => {
    // 在需要时解除事件绑定
  };
  
  /**
   * 初始化适配器
   */
  const init = () => {
    bindEvents();
  };
  
  /**
   * 清理资源
   */
  const cleanup = () => {
    unbindEvents();
  };
  
  return {
    init,
    cleanup,
    handleSelectionChange,
    handleFocusChange,
    collaborationManager,
    eventManager
  };
}; 