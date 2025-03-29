/**
 * 文档模型系统
 * 提供与事件系统集成的文档状态管理，基于事务的操作模型
 */

import { readonly } from './utilityFunctions.js';

/**
 * 创建文档模型
 * 
 * @param {Object} options - 配置选项
 * @param {Function} options.onChange - 文档变化回调
 * @param {any} options.initialContent - 初始内容
 * @param {boolean} options.historyEnabled - 是否启用历史记录
 * @param {number} options.historyLimit - 历史记录限制数量
 * @returns {Object} 文档模型API
 */
export const createDocumentModel = (options = {}) => {
  const {
    onChange = () => {},
    initialContent = null,
    historyEnabled = true,
    historyLimit = 100
  } = options;
  
  // 内部状态
  let content = initialContent;
  let currentTransaction = null;
  let isBatching = false;
  let pendingOperations = [];
  let history = [];
  let historyPointer = -1;
  let metaData = new Map();
  let changeListeners = new Set();
  
  // 添加变更监听器
  const addChangeListener = (listener) => {
    if (typeof listener === 'function') {
      changeListeners.add(listener);
      return () => changeListeners.delete(listener);
    }
    return () => {};
  };
  
  // 通知所有监听器
  const notifyChangeListeners = (data) => {
    changeListeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('文档监听器执行错误:', error);
      }
    });
    onChange(data);
  };
  
  /**
   * 开始一个事务
   * @param {string} name - 事务名称
   * @param {Object} meta - 事务元数据
   * @returns {Object} 事务对象
   */
  const beginTransaction = (name = 'untitled', meta = {}) => {
    if (currentTransaction) {
      throw new Error('已有未完成的事务，请先提交或回滚当前事务');
    }
    
    currentTransaction = {
      name,
      operations: [],
      timestamp: Date.now(),
      meta
    };
    
    return currentTransaction;
  };
  
  /**
   * 提交当前事务
   * @returns {boolean} 是否成功提交
   */
  const commitTransaction = () => {
    if (!currentTransaction) {
      return false;
    }
    
    // 如果事务中有操作，则应用并记录
    if (currentTransaction.operations.length > 0) {
      const snapshot = {
        content: JSON.parse(JSON.stringify(content)),
        transaction: { ...currentTransaction }
      };
      
      // 应用所有操作
      currentTransaction.operations.forEach(op => {
        applyOperation(op);
      });
      
      // 记录到历史
      if (historyEnabled) {
        // 如果当前不是最新状态，清除之后的历史
        if (historyPointer < history.length - 1) {
          history = history.slice(0, historyPointer + 1);
        }
        
        history.push(snapshot);
        
        // 限制历史记录数量
        if (history.length > historyLimit) {
          history.shift();
        } else {
          historyPointer++;
        }
      }
      
      // 通知变更
      notifyChangeListeners({
        type: 'transaction',
        name: currentTransaction.name,
        operations: currentTransaction.operations,
        timestamp: currentTransaction.timestamp
      });
    }
    
    // 清理当前事务
    currentTransaction = null;
    return true;
  };
  
  /**
   * 回滚当前事务
   * @returns {boolean} 是否成功回滚
   */
  const rollbackTransaction = () => {
    if (!currentTransaction) {
      return false;
    }
    
    currentTransaction = null;
    return true;
  };
  
  /**
   * 添加操作到当前事务
   * @param {Object} operation - 操作对象
   * @returns {boolean} 是否成功添加
   */
  const addOperation = (operation) => {
    if (!operation || !operation.type) {
      throw new Error('无效的操作: 缺少类型');
    }
    
    // 如果不在事务中，则自动开始一个隐式事务
    if (!currentTransaction) {
      beginTransaction(`自动事务-${operation.type}`);
    }
    
    currentTransaction.operations.push(operation);
    
    // 如果不在批处理模式，立即提交事务
    if (!isBatching) {
      return commitTransaction();
    }
    
    return true;
  };
  
  /**
   * 应用单个操作到文档
   * @param {Object} operation - 操作对象
   * @private
   */
  const applyOperation = (operation) => {
    // 不同类型的操作有不同的处理方式
    switch (operation.type) {
      case 'replace':
        content = operation.content;
        break;
      case 'update':
        if (typeof operation.updater === 'function') {
          content = operation.updater(content);
        }
        break;
      case 'set_meta':
        metaData.set(operation.key, operation.value);
        break;
      // 可以扩展更多操作类型...
      default:
        console.warn(`未知的操作类型: ${operation.type}`);
    }
  };
  
  /**
   * 启动批处理模式
   * 在此模式下，操作会累积直到提交
   */
  const startBatch = () => {
    isBatching = true;
    return () => endBatch();
  };
  
  /**
   * 结束批处理模式并提交
   */
  const endBatch = () => {
    isBatching = false;
    
    // 如果有未完成的事务，提交它
    if (currentTransaction) {
      commitTransaction();
    }
    
    // 处理挂起的操作
    if (pendingOperations.length > 0) {
      const batch = beginTransaction('批量操作');
      pendingOperations.forEach(op => addOperation(op));
      commitTransaction();
      pendingOperations = [];
    }
  };
  
  /**
   * 替换整个文档内容
   * @param {any} newContent - 新的文档内容
   */
  const replaceContent = (newContent) => {
    addOperation({
      type: 'replace',
      content: newContent
    });
  };
  
  /**
   * 使用函数更新文档内容
   * @param {Function} updater - 接收当前内容并返回新内容的函数
   */
  const updateContent = (updater) => {
    if (typeof updater !== 'function') {
      throw new Error('更新器必须是一个函数');
    }
    
    addOperation({
      type: 'update',
      updater
    });
  };
  
  /**
   * 设置元数据
   * @param {string} key - 元数据键
   * @param {any} value - 元数据值
   */
  const setMetadata = (key, value) => {
    addOperation({
      type: 'set_meta',
      key,
      value
    });
  };
  
  /**
   * 获取元数据
   * @param {string} key - 元数据键
   * @returns {any} 元数据值
   */
  const getMetadata = (key) => {
    return metaData.get(key);
  };
  
  /**
   * 获取当前文档内容
   * @returns {any} 当前内容的只读副本
   */
  const getContent = () => {
    return readonly(content);
  };
  
  /**
   * 撤销上一次事务
   * @returns {boolean} 是否成功撤销
   */
  const undo = () => {
    if (!historyEnabled || historyPointer < 0) {
      return false;
    }
    
    // 应用前一个状态
    content = JSON.parse(JSON.stringify(history[historyPointer].content));
    historyPointer--;
    
    notifyChangeListeners({
      type: 'undo',
      timestamp: Date.now()
    });
    
    return true;
  };
  
  /**
   * 重做上一次撤销的事务
   * @returns {boolean} 是否成功重做
   */
  const redo = () => {
    if (!historyEnabled || historyPointer >= history.length - 1) {
      return false;
    }
    
    historyPointer++;
    const redoTransaction = history[historyPointer].transaction;
    
    // 从历史记录重新应用操作
    redoTransaction.operations.forEach(op => {
      applyOperation(op);
    });
    
    notifyChangeListeners({
      type: 'redo',
      name: redoTransaction.name,
      timestamp: Date.now()
    });
    
    return true;
  };
  
  /**
   * 获取操作历史
   * @returns {Array} 历史操作列表
   */
  const getHistory = () => {
    return history.map(h => ({
      name: h.transaction.name,
      timestamp: h.transaction.timestamp,
      operationCount: h.transaction.operations.length
    }));
  };
  
  /**
   * 清除历史记录
   */
  const clearHistory = () => {
    history = [];
    historyPointer = -1;
  };
  
  /**
   * 注册自定义操作处理器
   * @param {string} operationType - 操作类型名
   * @param {Function} handler - 处理函数
   */
  const registerOperationHandler = (operationType, handler) => {
    if (typeof handler !== 'function') {
      throw new Error('操作处理器必须是函数');
    }
    
    customOperationHandlers[operationType] = handler;
  };
  
  // 存储自定义操作处理器
  const customOperationHandlers = {};
  
  return {
    // 事务管理
    beginTransaction,
    commitTransaction,
    rollbackTransaction,
    addOperation,
    
    // 批处理
    startBatch,
    endBatch,
    
    // 内容管理
    getContent,
    replaceContent,
    updateContent,
    
    // 元数据
    setMetadata,
    getMetadata,
    
    // 历史管理
    undo,
    redo,
    getHistory,
    clearHistory,
    
    // 事件与监听
    addChangeListener,
    
    // 扩展点
    registerOperationHandler
  };
};

/**
 * 创建文档模型与事件系统的集成适配器
 * 
 * @param {Object} documentModel - 文档模型实例
 * @param {Object} eventManager - 事件管理器实例
 * @returns {Object} 集成适配器API
 */
export const createDocumentEventAdapter = (documentModel, eventManager) => {
  if (!documentModel || !eventManager) {
    throw new Error('必须提供文档模型和事件管理器');
  }
  
  // 连接自定义事件到文档操作
  const connectEvents = () => {
    // 监听内容变化事件
    eventManager.core.onCustomEvent('customContentChange', (e) => {
      if (e && e.content) {
        documentModel.beginTransaction('内容变更');
        documentModel.replaceContent(e.content);
        documentModel.commitTransaction();
      }
    });
    
    // 监听输入事件
    eventManager.core.onCustomEvent('customTextInput', (e) => {
      if (e && e.text) {
        documentModel.beginTransaction('文本输入');
        documentModel.updateContent(content => {
          // 这里应根据实际的文档模型结构进行更新
          // 这是一个简化示例
          if (typeof content === 'string') {
            return content + e.text;
          }
          return content;
        });
        documentModel.commitTransaction();
      }
    });
    
    // 监听选区变化
    eventManager.core.onCustomEvent('customSelectionChange', (e) => {
      if (e && e.selection) {
        documentModel.setMetadata('selection', e.selection);
      }
    });
  };
  
  // 从文档模型变化触发事件
  const setupModelListeners = () => {
    documentModel.addChangeListener((changeData) => {
      if (changeData.type === 'transaction') {
        eventManager.core.dispatch('customDocumentChange', null, {
          name: changeData.name,
          timestamp: changeData.timestamp,
          operations: changeData.operations.map(op => op.type)
        });
      } else if (changeData.type === 'undo' || changeData.type === 'redo') {
        eventManager.core.dispatch('customHistoryChange', null, {
          action: changeData.type,
          timestamp: changeData.timestamp
        });
      }
    });
  };
  
  // 连接热键到文档操作
  const setupShortcuts = () => {
    // 撤销
    eventManager.keyboard.registerShortcut('ctrl+z', () => {
      documentModel.undo();
      return true; // 阻止默认行为
    });
    
    // 重做
    eventManager.keyboard.registerShortcut('ctrl+y', () => {
      documentModel.redo();
      return true; // 阻止默认行为
    });
    
    // 也支持 shift+ctrl+z 进行重做
    eventManager.keyboard.registerShortcut('shift+ctrl+z', () => {
      documentModel.redo();
      return true; // 阻止默认行为
    });
  };
  
  // 初始化
  const init = () => {
    connectEvents();
    setupModelListeners();
    setupShortcuts();
  };
  
  // 包装一些常用文档操作，使其更易与事件系统集成
  const wrapDocumentActions = () => {
    return {
      insertText: (text, position) => {
        documentModel.beginTransaction('插入文本');
        // 具体实现取决于文档模型结构
        documentModel.commitTransaction();
      },
      
      deleteSelection: () => {
        const selection = documentModel.getMetadata('selection');
        if (!selection || selection.isCollapsed) return false;
        
        documentModel.beginTransaction('删除选中内容');
        // 具体实现取决于文档模型结构
        documentModel.commitTransaction();
        return true;
      },
      
      formatSelection: (format) => {
        const selection = documentModel.getMetadata('selection');
        if (!selection) return false;
        
        documentModel.beginTransaction('格式化文本');
        // 具体实现取决于文档模型结构
        documentModel.commitTransaction();
        return true;
      }
    };
  };
  
  return {
    init,
    documentModel,
    eventManager,
    actions: wrapDocumentActions()
  };
}; 