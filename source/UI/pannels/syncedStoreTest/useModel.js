/**
 * 编辑器数据模型系统 (Editor Data Model System)
 * 
 * @module useModel
 * @description 
 * 统一的数据模型系统，支持不同编辑模式的数据结构和操作，
 * 包括块模型、文本模型和富文本模型。
 * 
 * ◆ 设计目标 ◆
 * -------------
 * 1. 统一接口：为不同编辑模式提供一致的模型操作接口
 * 2. 数据一致性：确保模型状态的一致性和可靠性
 * 3. 事务支持：支持原子操作和事务处理
 * 4. 变更通知：提供变更通知机制，便于视图更新
 * 5. 高性能：优化数据结构，提供高效的查询和修改操作
 * 6. 可扩展：支持自定义节点类型和属性
 * 
 * ◆ 核心架构 ◆
 * -------------
 * 1. 核心层：
 *    - modelRegistry: 模型注册表
 *    - modelFactory: 模型工厂，创建不同类型的模型
 *    - modelTransformer: 模型转换器，在不同模型类型间转换
 * 
 * 2. 模型层：
 *    - blockModel: 块模型，支持嵌套的文档结构
 *    - textModel: 文本模型，处理纯文本和Markdown
 *    - richTextModel: 富文本模型，处理复杂的格式化内容
 * 
 * 3. 操作层：
 *    - transactionManager: 事务管理器
 *    - changeTracker: 变更追踪器
 *    - nodeResolver: 节点解析器
 * 
 * ◆ 数据流程 ◆
 * -------------
 * 1. 命令/API调用 → 
 * 2. 创建事务 → 
 * 3. 执行模型操作 → 
 * 4. 提交/回滚事务 → 
 * 5. 通知变更 → 
 * 6. 更新视图
 * 
 * ◆ 使用方式 ◆
 * -------------
 * ```js
 * // 创建模型系统
 * const model = useModel({
 *   initialContent: initialData,
 *   modelType: 'block', // 'block', 'text', 'richText'
 *   onChange: handleModelChange
 * });
 * 
 * // 开始事务
 * model.beginTransaction('insert-paragraph');
 * 
 * // 执行操作
 * model.insertNode({
 *   type: 'paragraph',
 *   content: '新段落',
 *   position: { path: [0], offset: 1 }
 * });
 * 
 * // 提交事务
 * model.commitTransaction();
 * 
 * // 获取内容
 * const content = model.getContent();
 * 
 * // 转换模型类型
 * const markdownModel = model.transform('text');
 * ```
 * 
 * @author leolee9086
 * @version 1.0.0
 * @license AGPL-3.0
 */
import { ref, readonly, watch, computed } from '../../../../static/vue.esm-browser.js';

/**
 * 创建数据模型系统
 * 
 * @typedef {Object} ModelOptions
 * @property {Object|string} [initialContent=null] - 初始内容
 * @property {string} [modelType='block'] - 模型类型：'block'|'text'|'richText'
 * @property {Function} [onChange=null] - 内容变更回调
 * @property {boolean} [enableHistory=true] - 是否启用历史记录
 * @property {number} [maxHistorySize=100] - 历史记录最大数量
 * @property {boolean} [autoMergeTransactions=true] - 是否自动合并类似事务
 * @property {number} [mergeTimeout=1000] - 事务合并超时(ms)
 * @property {Object} [schema=null] - 自定义模型结构验证模式
 * @property {boolean} [strict=false] - 是否启用严格模式验证
 * 
 * @typedef {Object} ModelAPI
 * @property {Function} getContent - 获取当前内容
 * @property {Function} setContent - 设置当前内容
 * @property {Function} getNodeAt - 获取指定位置的节点
 * @property {Function} insertNode - 插入节点
 * @property {Function} updateNode - 更新节点
 * @property {Function} deleteNode - 删除节点
 * @property {Function} moveNode - 移动节点
 * @property {Function} beginTransaction - 开始事务
 * @property {Function} commitTransaction - 提交事务
 * @property {Function} rollbackTransaction - 回滚事务
 * @property {Function} transform - 转换模型类型
 * @property {Function} undo - 撤销操作
 * @property {Function} redo - 重做操作
 * @property {Function} canUndo - 检查是否可撤销
 * @property {Function} canRedo - 检查是否可重做
 * @property {Function} find - 查找内容
 * @property {Function} replace - 替换内容
 * @property {Function} validate - 验证当前模型是否有效
 * @property {Function} observe - 观察特定节点或路径变化
 * @property {Function} exportTo - 导出为特定格式
 * 
 * @param {ModelOptions} options - 配置选项
 * @returns {ModelAPI} 模型API接口
 */
export const useModel = (options = {}) => {
  const {
    initialContent = null,
    modelType = 'block',
    onChange = null,
    enableHistory = true,
    maxHistorySize = 100,
    autoMergeTransactions = true,
    mergeTimeout = 1000,
    schema = null,
    strict = false
  } = options;

  // 内部状态
  const content = ref(initialContent);
  const currentTransaction = ref(null);
  const transactionStack = ref([]);
  const history = ref([]);
  const futureHistory = ref([]);
  const activeModelType = ref(modelType);
  const changeListeners = ref(new Set());
  const isValidating = ref(false);

  // 如果提供了onChange回调，添加到监听器
  if (typeof onChange === 'function') {
    changeListeners.value.add(onChange);
  }

  /**
   * 通知所有变更监听器
   * @param {Object} change - 变更详情
   */
  const notifyChangeListeners = (change) => {
    changeListeners.value.forEach(listener => {
      try {
        listener(change);
      } catch (error) {
        console.error('模型变更监听器执行错误:', error);
      }
    });
  };

  /**
   * 获取当前内容
   * @returns {Object|string} 当前内容
   */
  const getContent = () => {
    return readonly(content.value);
  };

  /**
   * 设置内容
   * @param {Object|string} newContent - 新内容
   * @returns {boolean} 是否设置成功
   */
  const setContent = (newContent) => {
    if (!newContent) return false;
    
    // 保存旧内容用于历史记录
    const oldContent = content.value;
    
    try {
      // 在事务中设置内容
      beginTransaction('set-content');
      content.value = newContent;
      
      notifyChangeListeners({
        type: 'content-replace',
        oldContent,
        newContent
      });
      
      commitTransaction();
      return true;
    } catch (error) {
      rollbackTransaction();
      console.error('设置内容失败:', error);
      return false;
    }
  };

  /**
   * 获取指定位置的节点
   * @param {Object|Array|number} path - 节点路径
   * @returns {Object|null} 找到的节点或null
   */
  const getNodeAt = (path) => {
    // 不同模型类型会有不同的实现
    if (activeModelType.value === 'block') {
      // 实现块模型的节点查找
      return getBlockNodeAt(path);
    } else if (activeModelType.value === 'text') {
      // 实现文本模型的节点查找
      return getTextNodeAt(path);
    } else if (activeModelType.value === 'richText') {
      // 实现富文本模型的节点查找
      return getRichTextNodeAt(path);
    }
    
    return null;
  };

  /**
   * 获取块模型中的节点
   * @param {Array} path - 节点路径
   * @returns {Object|null} 找到的节点或null
   */
  const getBlockNodeAt = (path) => {
    if (!content.value || !Array.isArray(path)) return null;
    
    let current = content.value;
    
    for (const index of path) {
      if (!current.children || !current.children[index]) {
        return null;
      }
      current = current.children[index];
    }
    
    return current;
  };

  /**
   * 获取文本模型中的节点
   * @param {number} offset - 文本偏移量
   * @returns {Object|null} 找到的节点或null
   */
  const getTextNodeAt = (offset) => {
    // 针对文本模型的实现，这里简化处理
    if (typeof offset !== 'number' || !content.value) return null;
    
    return {
      type: 'text',
      offset,
      content: content.value.toString()
    };
  };

  /**
   * 获取富文本模型中的节点
   * @param {Object} location - 节点位置
   * @returns {Object|null} 找到的节点或null
   */
  const getRichTextNodeAt = (location) => {
    // 针对富文本模型的实现
    // 这里简化处理，实际实现会更复杂
    return null;
  };

  /**
   * 插入节点
   * @param {Object} options - 插入参数
   * @returns {boolean} 是否插入成功
   */
  const insertNode = (options) => {
    const { type, content: nodeContent, position, attributes } = options;
    
    if (!type || !position) {
      console.error('插入节点失败: 缺少必要参数');
      return false;
    }
    
    try {
      // 如果没有活跃事务，创建一个
      const needsTransaction = !currentTransaction.value;
      if (needsTransaction) {
        beginTransaction('insert-node');
      }
      
      // 根据不同模型类型执行插入
      let result = false;
      
      if (activeModelType.value === 'block') {
        result = insertBlockNode(type, nodeContent, position, attributes);
      } else if (activeModelType.value === 'text') {
        result = insertTextNode(nodeContent, position);
      } else if (activeModelType.value === 'richText') {
        result = insertRichTextNode(type, nodeContent, position, attributes);
      }
      
      if (needsTransaction) {
        if (result) {
          commitTransaction();
        } else {
          rollbackTransaction();
        }
      }
      
      return result;
    } catch (error) {
      if (!currentTransaction.value) {
        rollbackTransaction();
      }
      console.error('插入节点失败:', error);
      return false;
    }
  };

  /**
   * 在块模型中插入节点
   * @param {string} type - 节点类型
   * @param {string|Object} nodeContent - 节点内容
   * @param {Object} position - 插入位置
   * @param {Object} attributes - 附加属性
   * @returns {boolean} 是否插入成功
   */
  const insertBlockNode = (type, nodeContent, position, attributes) => {
    const { path, offset } = position;
    
    if (!Array.isArray(path)) {
      console.error('插入块节点失败: 路径必须是数组');
      return false;
    }
    
    // 创建新节点
    const newNode = {
      type,
      content: nodeContent,
      ...attributes
    };
    
    // 查找父节点
    const parentPath = path.slice(0, -1);
    const index = path[path.length - 1] || 0;
    
    let parent;
    
    if (parentPath.length === 0) {
      // 插入到根级别
      parent = content.value;
    } else {
      parent = getBlockNodeAt(parentPath);
    }
    
    if (!parent) {
      console.error('插入块节点失败: 找不到父节点');
      return false;
    }
    
    // 确保父节点有children数组
    if (!parent.children) {
      parent.children = [];
    }
    
    // 插入节点
    parent.children.splice(index, 0, newNode);
    
    // 通知变更
    notifyChangeListeners({
      type: 'node-insert',
      node: newNode,
      path,
      parentPath
    });
    
    return true;
  };

  // 其他模型类型的插入方法...

  /**
   * 开始事务
   * @param {string} name - 事务名称
   * @returns {boolean} 是否成功开始事务
   */
  const beginTransaction = (name) => {
    // 创建新事务
    const transaction = {
      name,
      timestamp: Date.now(),
      snapshot: JSON.parse(JSON.stringify(content.value)),
      operations: []
    };
    
    // 保存当前事务，并将其推入事务栈
    currentTransaction.value = transaction;
    transactionStack.value.push(transaction);
    
    return true;
  };

  /**
   * 提交事务
   * @returns {boolean} 是否成功提交事务
   */
  const commitTransaction = () => {
    if (!currentTransaction.value) {
      console.warn('没有活跃的事务可提交');
      return false;
    }
    
    // 弹出当前事务
    const transaction = transactionStack.value.pop();
    
    // 如果还有父事务，将当前事务作为父事务的操作
    if (transactionStack.value.length > 0) {
      const parentTransaction = transactionStack.value[transactionStack.value.length - 1];
      parentTransaction.operations.push({
        type: 'transaction',
        transaction
      });
      
      // 更新当前事务为父事务
      currentTransaction.value = parentTransaction;
    } else {
      // 没有父事务，将事务添加到历史
      if (enableHistory) {
        addToHistory(transaction);
      }
      
      // 清除当前事务
      currentTransaction.value = null;
    }
    
    return true;
  };

  /**
   * 回滚事务
   * @returns {boolean} 是否成功回滚事务
   */
  const rollbackTransaction = () => {
    if (!currentTransaction.value) {
      console.warn('没有活跃的事务可回滚');
      return false;
    }
    
    // 恢复事务开始时的快照
    content.value = JSON.parse(JSON.stringify(currentTransaction.value.snapshot));
    
    // 弹出当前事务及其所有子事务
    while (transactionStack.value.length > 0 && 
           transactionStack.value[transactionStack.value.length - 1] !== currentTransaction.value) {
      transactionStack.value.pop();
    }
    
    // 弹出当前事务
    if (transactionStack.value.length > 0) {
      transactionStack.value.pop();
    }
    
    // 更新当前事务
    currentTransaction.value = transactionStack.value.length > 0 
      ? transactionStack.value[transactionStack.value.length - 1] 
      : null;
    
    return true;
  };

  /**
   * 添加到历史记录
   * @param {Object} transaction - 事务对象
   */
  const addToHistory = (transaction) => {
    // 尝试合并事务
    if (autoMergeTransactions && history.value.length > 0) {
      const lastTransaction = history.value[history.value.length - 1];
      
      // 如果事务类型相同且时间接近，尝试合并
      if (lastTransaction.name === transaction.name && 
          transaction.timestamp - lastTransaction.timestamp < mergeTimeout) {
        // 这里可以实现具体的合并逻辑
        return;
      }
    }
    
    // 添加到历史
    history.value.push(transaction);
    
    // 清空未来历史
    futureHistory.value = [];
    
    // 限制历史大小
    if (history.value.length > maxHistorySize) {
      history.value.shift();
    }
  };

  /**
   * 转换模型类型
   * @param {string} targetType - 目标模型类型
   * @returns {ModelAPI|null} 新的模型API或null
   */
  const transform = (targetType) => {
    if (targetType === activeModelType.value) {
      return this;
    }
    
    try {
      // 转换内容
      const transformedContent = transformContent(content.value, activeModelType.value, targetType);
      
      // 创建新的模型实例
      return useModel({
        ...options,
        initialContent: transformedContent,
        modelType: targetType
      });
    } catch (error) {
      console.error(`转换到${targetType}模型失败:`, error);
      return null;
    }
  };

  /**
   * 转换内容到不同模型类型
   * @param {Object|string} currentContent - 当前内容
   * @param {string} sourceType - 源模型类型
   * @param {string} targetType - 目标模型类型
   * @returns {Object|string} 转换后的内容
   */
  const transformContent = (currentContent, sourceType, targetType) => {
    // 实现不同模型类型间的转换逻辑
    if (sourceType === 'block' && targetType === 'text') {
      return blockToText(currentContent);
    } else if (sourceType === 'text' && targetType === 'block') {
      return textToBlock(currentContent);
    } else if (sourceType === 'block' && targetType === 'richText') {
      return blockToRichText(currentContent);
    } else if (sourceType === 'richText' && targetType === 'block') {
      return richTextToBlock(currentContent);
    } else if (sourceType === 'text' && targetType === 'richText') {
      return textToRichText(currentContent);
    } else if (sourceType === 'richText' && targetType === 'text') {
      return richTextToText(currentContent);
    }
    
    throw new Error(`不支持从${sourceType}到${targetType}的转换`);
  };

  /**
   * 块模型转文本模型
   * @param {Object} blockContent - 块模型内容
   * @returns {string} 文本内容
   */
  const blockToText = (blockContent) => {
    // 简单实现：递归将块内容转换为文本
    if (!blockContent) return '';
    
    let result = '';
    
    const processNode = (node) => {
      if (typeof node.content === 'string') {
        result += node.content;
      }
      
      if (node.type === 'paragraph' || node.type === 'heading') {
        result += '\n';
      }
      
      if (Array.isArray(node.children)) {
        node.children.forEach(processNode);
      }
    };
    
    if (Array.isArray(blockContent)) {
      blockContent.forEach(processNode);
    } else {
      processNode(blockContent);
    }
    
    return result;
  };

  /**
   * 撤销操作
   * @returns {boolean} 是否成功撤销
   */
  const undo = () => {
    if (!canUndo()) return false;
    
    try {
      // 获取最后一个事务
      const transaction = history.value.pop();
      
      // 保存当前状态到未来历史
      futureHistory.value.push({
        name: 'redo-point',
        snapshot: JSON.parse(JSON.stringify(content.value)),
        timestamp: Date.now()
      });
      
      // 恢复事务的快照
      content.value = JSON.parse(JSON.stringify(transaction.snapshot));
      
      // 通知变更
      notifyChangeListeners({
        type: 'undo',
        transactionName: transaction.name
      });
      
      return true;
    } catch (error) {
      console.error('撤销操作失败:', error);
      return false;
    }
  };

  /**
   * 重做操作
   * @returns {boolean} 是否成功重做
   */
  const redo = () => {
    if (!canRedo()) return false;
    
    try {
      // 获取最近的未来状态
      const redoPoint = futureHistory.value.pop();
      
      // 保存当前状态到历史
      history.value.push({
        name: 'undo-point',
        snapshot: JSON.parse(JSON.stringify(content.value)),
        timestamp: Date.now()
      });
      
      // 恢复未来状态
      content.value = JSON.parse(JSON.stringify(redoPoint.snapshot));
      
      // 通知变更
      notifyChangeListeners({
        type: 'redo'
      });
      
      return true;
    } catch (error) {
      console.error('重做操作失败:', error);
      return false;
    }
  };

  /**
   * 检查是否可以撤销
   * @returns {boolean} 是否可以撤销
   */
  const canUndo = () => {
    return enableHistory && history.value.length > 0;
  };

  /**
   * 检查是否可以重做
   * @returns {boolean} 是否可以重做
   */
  const canRedo = () => {
    return enableHistory && futureHistory.value.length > 0;
  };

  /**
   * 查找内容
   * @param {string|RegExp} query - 查询条件
   * @param {Object} options - 查找选项
   * @returns {Array} 查找结果
   */
  const find = (query, options = {}) => {
    // 简单实现：不同模型类型的查找
    if (activeModelType.value === 'text') {
      return findInText(query, options);
    } else {
      // 更复杂模型的查找，这里简化处理
      return [];
    }
  };

  /**
   * 在文本中查找
   * @param {string|RegExp} query - 查询条件
   * @param {Object} options - 查找选项
   * @returns {Array} 查找结果
   */
  const findInText = (query, options) => {
    const { caseSensitive = false, wholeWord = false } = options;
    const text = content.value?.toString() || '';
    const results = [];
    
    if (typeof query === 'string') {
      let searchText = query;
      let targetText = text;
      
      if (!caseSensitive) {
        searchText = searchText.toLowerCase();
        targetText = targetText.toLowerCase();
      }
      
      let index = targetText.indexOf(searchText);
      while (index !== -1) {
        // 检查是否是完整单词
        if (wholeWord) {
          const prevChar = index > 0 ? targetText[index - 1] : ' ';
          const nextChar = index + searchText.length < targetText.length ? 
                          targetText[index + searchText.length] : ' ';
          
          if (!/\w/.test(prevChar) && !/\w/.test(nextChar)) {
            results.push({
              start: index,
              end: index + searchText.length,
              text: text.substring(index, index + searchText.length)
            });
          }
        } else {
          results.push({
            start: index,
            end: index + searchText.length,
            text: text.substring(index, index + searchText.length)
          });
        }
        
        index = targetText.indexOf(searchText, index + 1);
      }
    } else if (query instanceof RegExp) {
      let match;
      const regex = caseSensitive ? query : new RegExp(query.source, query.flags.replace('i', '') + 'i');
      
      while ((match = regex.exec(text)) !== null) {
        if (regex.global) {
          results.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0],
            groups: match.groups
          });
        } else {
          results.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0],
            groups: match.groups
          });
          break;
        }
      }
    }
    
    return results;
  };

  /**
   * 替换内容
   * @param {string|RegExp} query - 查询条件
   * @param {string|Function} replacement - 替换内容或替换函数
   * @param {Object} options - 替换选项
   * @returns {number} 替换数量
   */
  const replace = (query, replacement, options = {}) => {
    // 开始替换事务
    beginTransaction('replace');
    
    try {
      let count = 0;
      
      if (activeModelType.value === 'text') {
        count = replaceInText(query, replacement, options);
      } else {
        // 实现其他模型类型的替换
        count = 0;
      }
      
      if (count > 0) {
        commitTransaction();
      } else {
        rollbackTransaction();
      }
      
      return count;
    } catch (error) {
      rollbackTransaction();
      console.error('替换操作失败:', error);
      return 0;
    }
  };

  /**
   * 在文本中替换
   * @param {string|RegExp} query - 查询条件
   * @param {string|Function} replacement - 替换内容或替换函数
   * @param {Object} options - 替换选项
   * @returns {number} 替换数量
   */
  const replaceInText = (query, replacement, options) => {
    const { caseSensitive = false, all = true } = options;
    let text = content.value?.toString() || '';
    let count = 0;
    
    if (typeof query === 'string') {
      const searchOptions = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), searchOptions);
      const newText = text.replace(regex, (match) => {
        count++;
        return typeof replacement === 'function' ? replacement(match) : replacement;
      });
      
      if (count > 0) {
        content.value = newText;
      }
    } else if (query instanceof RegExp) {
      const flags = query.global ? query.flags : query.flags + 'g';
      const regex = caseSensitive ? 
                  new RegExp(query.source, flags) : 
                  new RegExp(query.source, flags.replace('i', '') + 'i');
      
      const newText = text.replace(regex, (...args) => {
        count++;
        return typeof replacement === 'function' ? replacement(...args) : replacement;
      });
      
      if (count > 0) {
        content.value = newText;
      }
    }
    
    return count;
  };

  /**
   * 验证当前模型是否有效
   * @returns {boolean} 模型是否有效
   */
  const validate = () => {
    if (!schema) return true;
    
    try {
      isValidating.value = true;
      
      // 根据模型类型和schema进行验证
      if (activeModelType.value === 'block') {
        return validateBlockModel();
      } else if (activeModelType.value === 'text') {
        return validateTextModel();
      } else if (activeModelType.value === 'richText') {
        return validateRichTextModel();
      }
      
      return true;
    } finally {
      isValidating.value = false;
    }
  };

  /**
   * 验证块模型
   * @returns {boolean} 块模型是否有效
   */
  const validateBlockModel = () => {
    // 简单验证示例
    if (!content.value) return false;
    
    // 检查根节点
    if (typeof content.value !== 'object') return false;
    
    // 递归验证子节点
    const validateNode = (node) => {
      if (!node.type) return false;
      
      // 验证子节点
      if (Array.isArray(node.children)) {
        return node.children.every(validateNode);
      }
      
      return true;
    };
    
    return validateNode(content.value);
  };

  /**
   * 观察特定节点或路径变化
   * @param {Array|string} path - 要观察的路径
   * @param {Function} callback - 变化回调
   * @returns {Function} 取消观察函数
   */
  const observe = (path, callback) => {
    if (!path || typeof callback !== 'function') {
      console.error('观察失败: 无效的路径或回调');
      return () => {};
    }
    
    const observer = (change) => {
      // 检查变化是否影响指定路径
      if (isPathAffected(path, change)) {
        callback(change);
      }
    };
    
    // 添加到观察者列表
    changeListeners.value.add(observer);
    
    // 返回取消观察函数
    return () => {
      changeListeners.value.delete(observer);
    };
  };

  /**
   * 检查路径是否受到变化影响
   * @param {Array|string} path - 路径
   * @param {Object} change - 变化对象
   * @returns {boolean} 是否受影响
   */
  const isPathAffected = (path, change) => {
    // 简单实现：检查路径是否与变化路径匹配或是其父路径
    if (!change.path) return true;
    
    const changePath = Array.isArray(change.path) ? change.path : [change.path];
    const targetPath = Array.isArray(path) ? path : [path];
    
    // 检查路径是否相等
    if (changePath.length === targetPath.length) {
      return changePath.every((part, index) => part === targetPath[index]);
    }
    
    // 检查是否是子路径
    if (changePath.length > targetPath.length) {
      return changePath.slice(0, targetPath.length).every((part, index) => part === targetPath[index]);
    }
    
    return false;
  };

  /**
   * 导出为特定格式
   * @param {string} format - 导出格式
   * @param {Object} options - 导出选项
   * @returns {string|Object} 导出的内容
   */
  const exportTo = (format, options = {}) => {
    try {
      if (format === 'json') {
        return JSON.stringify(content.value);
      } else if (format === 'text') {
        return activeModelType.value === 'text' ? 
               content.value : 
               transformContent(content.value, activeModelType.value, 'text');
      } else if (format === 'html') {
        // 实现HTML导出
        return exportToHtml(options);
      } else if (format === 'markdown') {
        // 实现Markdown导出
        return exportToMarkdown(options);
      }
      
      throw new Error(`不支持导出格式: ${format}`);
    } catch (error) {
      console.error(`导出到${format}失败:`, error);
      return null;
    }
  };

  // 初始化内容检查
  if (initialContent) {
    setContent(initialContent);
  } else {
    // 设置默认内容
    if (activeModelType.value === 'block') {
      setContent({ type: 'document', children: [] });
    } else if (activeModelType.value === 'text') {
      setContent('');
    } else if (activeModelType.value === 'richText') {
      setContent({ type: 'doc', content: [] });
    }
  }

  // 导出API
  return {
    // 核心API
    getContent,
    setContent,
    getNodeAt,
    insertNode,
    updateNode: () => false, // 简化，实际实现会更复杂
    deleteNode: () => false, // 简化，实际实现会更复杂
    moveNode: () => false,   // 简化，实际实现会更复杂
    
    // 事务API
    beginTransaction,
    commitTransaction,
    rollbackTransaction,
    
    // 转换API
    transform,
    
    // 历史API
    undo,
    redo,
    canUndo,
    canRedo,
    
    // 工具API
    find,
    replace,
    validate,
    observe,
    exportTo
  };
}; 