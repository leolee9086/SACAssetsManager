/**
 * 编辑器命令系统 (Editor Command System)
 * 
 * @module useCommand
 * @description 
 * 这是一个完整的编辑器命令系统，将用户意图转化为编辑器操作，
 * 采用命令模式设计，支持命令注册、执行、撤销和重做。
 * 
 * ◆ 设计目标 ◆
 * -------------
 * 1. 统一命令接口：为所有编辑操作提供一致的命令接口
 * 2. 分离关注点：将命令定义与执行逻辑分离
 * 3. 可撤销操作：支持撤销/重做功能
 * 4. 命令组合：支持宏命令和命令序列
 * 5. 扩展性：允许插件系统注册自定义命令
 * 6. 上下文感知：根据当前状态智能启用/禁用命令
 * 
 * ◆ 核心架构 ◆
 * -------------
 * 采用命令模式与责任链模式结合的设计：
 * 
 * 1. 核心层：
 *    - commandRegistry: 命令注册表，存储所有可用命令
 *    - commandExecutor: 命令执行器，负责命令的执行
 *    - commandHistory: 命令历史，管理已执行命令的历史记录
 * 
 * 2. 功能层：
 *    - textCommands: 文本编辑相关命令（插入、删除、替换等）
 *    - formatCommands: 格式化相关命令（加粗、斜体等）
 *    - blockCommands: 块操作相关命令（创建、移动、删除块等）
 *    - tableCommands: 表格操作相关命令
 *    - listCommands: 列表操作相关命令
 * 
 * 3. 辅助层：
 *    - contextProvider: 提供命令执行的上下文
 *    - commandMapper: 将快捷键映射到命令
 *    - commandValidator: 验证命令在当前上下文是否可执行
 * 
 * ◆ 命令流程 ◆
 * -------------
 * 1. 用户操作/API调用 → 
 * 2. 创建命令对象 → 
 * 3. 命令验证 → 
 * 4. 命令执行 → 
 * 5. 添加到历史 → 
 * 6. 触发相关事件
 * 
 * ◆ 命令设计 ◆
 * -------------
 * 每个命令包含：
 * - execute(): 执行命令的逻辑
 * - undo(): 撤销命令的逻辑
 * - canExecute(): 检查命令是否可在当前上下文执行
 * - merge(): 尝试与前一个命令合并（优化历史记录）
 * 
 * ◆ 使用方式 ◆
 * -------------
 * ```js
 * // 创建命令系统
 * const commandManager = useCommand({
 *   modelRef: documentModel,
 *   selectionRef: selectionModel,
 *   maxHistorySize: 100
 * });
 * 
 * // 注册自定义命令
 * commandManager.registerCommand('insertSpecialBlock', {
 *   execute: (params) => {
 *     // 插入特殊块的逻辑
 *     return true; // 执行成功
 *   },
 *   undo: (params) => {
 *     // 撤销插入的逻辑
 *     return true; // 撤销成功
 *   },
 *   canExecute: (params) => {
 *     // 检查是否可执行
 *     return true;
 *   }
 * });
 * 
 * // 执行命令
 * commandManager.execute('formatBold', { range: selection.getRange() });
 * 
 * // 撤销/重做
 * commandManager.undo();
 * commandManager.redo();
 * 
 * // 获取可用命令
 * const availableCommands = commandManager.getAvailableCommands();
 * 
 * // 创建命令组合（宏）
 * commandManager.createMacro('formatHeading1', [
 *   { name: 'clearFormatting', params: {} },
 *   { name: 'formatHeading', params: { level: 1 } }
 * ]);
 * ```
 * 
 * ◆ 命令类型 ◆
 * -------------
 * 1. 文本命令：insertText, deleteText, replaceText, etc.
 * 2. 格式命令：bold, italic, underline, strikethrough, etc.
 * 3. 段落命令：createParagraph, setParagraphStyle, etc.
 * 4. 块命令：createBlock, moveBlock, deleteBlock, etc.
 * 5. 结构命令：indent, outdent, mergeBlocks, splitBlock, etc.
 * 6. 表格命令：insertTable, addRow, removeColumn, etc.
 * 7. 列表命令：createList, toggleListItem, changeListType, etc.
 * 8. 媒体命令：insertImage, resizeImage, insertVideo, etc.
 * 9. 视图命令：scrollTo, zoomIn, zoomOut, etc.
 * 
 * @author leolee9086
 * @version 1.0.0
 * @license AGPL-3.0
 */
import { ref, readonly, watch } from '../../../../static/vue.esm-browser.js';

/**
 * 创建命令系统
 * 
 * @typedef {Object} CommandOptions
 * @property {Object} [modelRef=null] - 文档模型引用
 * @property {Object} [selectionRef=null] - 选区模型引用
 * @property {number} [maxHistorySize=100] - 历史记录最大长度
 * @property {boolean} [enableMacros=true] - 是否启用宏命令
 * @property {boolean} [enableUndo=true] - 是否启用撤销功能
 * @property {boolean} [mergeSimilar=true] - 是否合并类似命令
 * @property {number} [mergeTimeout=1000] - 命令合并超时时间(ms)
 * @property {boolean} [validateCommands=true] - 执行前是否验证命令
 * @property {function} [onCommandExecuted=null] - 命令执行后的回调
 * @property {boolean} [strictMode=false] - 严格模式，命令不存在时抛出错误
 * @property {boolean} [debugMode=false] - 调试模式，记录命令执行细节
 * 
 * @typedef {Object} Command
 * @property {function} execute - 执行命令的函数
 * @property {function} [undo] - 撤销命令的函数
 * @property {function} [canExecute] - 检查命令是否可执行的函数
 * @property {function} [merge] - 尝试与前一个命令合并的函数
 * 
 * @typedef {Object} CommandHistoryItem
 * @property {string} name - 命令名称
 * @property {Object} params - 命令参数
 * @property {Command} command - 命令对象
 * @property {number} timestamp - 执行时间戳
 * 
 * @typedef {Object} CommandContext
 * @property {Object} model - 文档模型
 * @property {Object} selection - 选区模型
 * @property {Object} view - 视图引用
 * @property {Object} state - 当前编辑器状态
 * 
 * @typedef {Object} CommandManagerAPI
 * @property {Function} registerCommand - 注册新命令
 * @property {Function} unregisterCommand - 注销命令
 * @property {Function} execute - 执行命令
 * @property {Function} undo - 撤销上一个命令
 * @property {Function} redo - 重做上一个命令
 * @property {Function} canUndo - 检查是否可以撤销
 * @property {Function} canRedo - 检查是否可以重做
 * @property {Function} getHistory - 获取命令历史
 * @property {Function} clearHistory - 清空命令历史
 * @property {Function} getAvailableCommands - 获取当前可用命令
 * @property {Function} createMacro - 创建宏命令
 * @property {Function} isCommandAvailable - 检查命令是否可用
 * @property {Function} getCommandDefinition - 获取命令定义
 * @property {Function} getBatchExecutor - 获取批量执行器
 * @property {Function} beginCommandGroup - 开始命令组
 * @property {Function} endCommandGroup - 结束命令组
 * @property {Function} abortCommandGroup - 中止命令组
 * 
 * @param {CommandOptions} options - 命令系统配置选项
 * @returns {CommandManagerAPI} 命令管理器API
 */
export const useCommand = (options = {}) => {
  // 命令系统具体实现将在此处编写

  const {
    modelRef = null,
    selectionRef = null,
    maxHistorySize = 100,
    enableMacros = true,
    enableUndo = true,
    mergeSimilar = true,
    mergeTimeout = 1000,
    validateCommands = true,
    onCommandExecuted = null,
    strictMode = false,
    debugMode = false
  } = options;

  // 命令注册表
  const commandRegistry = new Map();
  
  // 命令历史
  const undoHistory = ref([]);
  const redoHistory = ref([]);
  
  // 命令组状态
  const commandGroupStack = ref([]);
  
  // 其他内部状态
  const isExecuting = ref(false);
  const lastExecutedCommand = ref(null);

  /**
   * 获取当前命令上下文
   * @returns {CommandContext} 命令上下文
   */
  const getCommandContext = () => {
    return {
      model: modelRef?.value,
      selection: selectionRef?.value,
      // 其他上下文信息
    };
  };

  /**
   * 注册命令
   * @param {string} name - 命令名称
   * @param {Command} command - 命令对象
   * @returns {boolean} 是否注册成功
   */
  const registerCommand = (name, command) => {
    if (typeof command.execute !== 'function') {
      throw new Error(`命令必须包含execute方法: ${name}`);
    }
    
    commandRegistry.set(name, command);
    return true;
  };

  /**
   * 注销命令
   * @param {string} name - 命令名称
   * @returns {boolean} 是否注销成功
   */
  const unregisterCommand = (name) => {
    return commandRegistry.delete(name);
  };

  /**
   * 执行命令
   * @param {string} name - 命令名称
   * @param {Object} params - 命令参数
   * @returns {boolean} 命令是否执行成功
   */
  const execute = (name, params = {}) => {
    const command = commandRegistry.get(name);
    if (!command) {
      if (strictMode) {
        throw new Error(`未找到命令: ${name}`);
      }
      return false;
    }

    if (validateCommands && typeof command.canExecute === 'function') {
      if (!command.canExecute(params, getCommandContext())) {
        return false;
      }
    }

    isExecuting.value = true;
    
    try {
      const result = command.execute(params, getCommandContext());
      
      if (result !== false && enableUndo) {
        const historyItem = {
          name,
          params,
          command,
          timestamp: Date.now()
        };
        
        // 检查是否可以合并命令
        if (mergeSimilar && 
            lastExecutedCommand.value && 
            typeof command.merge === 'function' &&
            Date.now() - lastExecutedCommand.value.timestamp < mergeTimeout) {
          
          const merged = command.merge(
            lastExecutedCommand.value.params,
            params,
            getCommandContext()
          );
          
          if (merged) {
            // 更新最后一个命令的参数
            undoHistory.value[undoHistory.value.length - 1].params = merged;
          } else {
            // 添加新命令到历史
            addToUndoHistory(historyItem);
          }
        } else {
          // 添加新命令到历史
          addToUndoHistory(historyItem);
        }
        
        lastExecutedCommand.value = historyItem;
        
        // 清空重做历史
        redoHistory.value = [];
      }
      
      if (typeof onCommandExecuted === 'function') {
        onCommandExecuted(name, params, result);
      }
      
      return result !== false;
    } finally {
      isExecuting.value = false;
    }
  };

  /**
   * 添加命令到撤销历史
   * @param {CommandHistoryItem} item - 历史记录项
   */
  const addToUndoHistory = (item) => {
    // 如果当前有活跃的命令组，添加到命令组
    if (commandGroupStack.value.length > 0) {
      const currentGroup = commandGroupStack.value[commandGroupStack.value.length - 1];
      currentGroup.commands.push(item);
      return;
    }
    
    // 添加到主历史记录
    undoHistory.value.push(item);
    
    // 限制历史记录大小
    if (undoHistory.value.length > maxHistorySize) {
      undoHistory.value.shift();
    }
  };

  /**
   * 撤销上一个命令
   * @returns {boolean} 是否成功撤销
   */
  const undo = () => {
    if (!canUndo()) {
      return false;
    }
    
    const item = undoHistory.value.pop();
    
    // 处理命令组
    if (item.isGroup) {
      // 从后向前撤销组中的所有命令
      for (let i = item.commands.length - 1; i >= 0; i--) {
        const groupItem = item.commands[i];
        if (typeof groupItem.command.undo === 'function') {
          groupItem.command.undo(groupItem.params, getCommandContext());
        }
      }
      
      redoHistory.value.push(item);
      return true;
    }
    
    // 撤销单个命令
    if (typeof item.command.undo === 'function') {
      const result = item.command.undo(item.params, getCommandContext());
      if (result !== false) {
        redoHistory.value.push(item);
        return true;
      }
    }
    
    return false;
  };

  /**
   * 重做上一个撤销的命令
   * @returns {boolean} 是否成功重做
   */
  const redo = () => {
    if (!canRedo()) {
      return false;
    }
    
    const item = redoHistory.value.pop();
    
    // 处理命令组
    if (item.isGroup) {
      // 按顺序重做组中的所有命令
      for (let i = 0; i < item.commands.length; i++) {
        const groupItem = item.commands[i];
        groupItem.command.execute(groupItem.params, getCommandContext());
      }
      
      undoHistory.value.push(item);
      return true;
    }
    
    // 重做单个命令
    const result = item.command.execute(item.params, getCommandContext());
    if (result !== false) {
      undoHistory.value.push(item);
      return true;
    }
    
    return false;
  };

  /**
   * 检查是否可以撤销
   * @returns {boolean} 是否可以撤销
   */
  const canUndo = () => {
    return enableUndo && undoHistory.value.length > 0;
  };

  /**
   * 检查是否可以重做
   * @returns {boolean} 是否可以重做
   */
  const canRedo = () => {
    return enableUndo && redoHistory.value.length > 0;
  };

  /**
   * 获取命令历史
   * @returns {Object} 包含撤销和重做历史的对象
   */
  const getHistory = () => {
    return {
      undoHistory: readonly(undoHistory.value),
      redoHistory: readonly(redoHistory.value)
    };
  };

  /**
   * 清空命令历史
   */
  const clearHistory = () => {
    undoHistory.value = [];
    redoHistory.value = [];
    lastExecutedCommand.value = null;
  };

  /**
   * 获取当前可用命令
   * @returns {Array} 可用命令列表
   */
  const getAvailableCommands = () => {
    const context = getCommandContext();
    const available = [];
    
    for (const [name, command] of commandRegistry.entries()) {
      if (!validateCommands || 
          typeof command.canExecute !== 'function' || 
          command.canExecute({}, context)) {
        available.push(name);
      }
    }
    
    return available;
  };

  /**
   * 创建宏命令
   * @param {string} name - 宏命令名称
   * @param {Array} commandSequence - 命令序列
   * @returns {boolean} 是否创建成功
   */
  const createMacro = (name, commandSequence) => {
    if (!enableMacros) {
      return false;
    }
    
    const macroCommand = {
      execute: (_, context) => {
        // 开始命令组
        beginCommandGroup();
        
        try {
          // 执行所有命令
          for (const { name, params } of commandSequence) {
            const cmd = commandRegistry.get(name);
            if (cmd) {
              cmd.execute(params || {}, context);
            }
          }
          
          // 结束命令组
          return endCommandGroup();
        } catch (error) {
          // 错误时中止命令组
          abortCommandGroup();
          if (debugMode) {
            console.error('宏命令执行错误:', error);
          }
          return false;
        }
      },
      
      canExecute: (_, context) => {
        // 检查所有命令是否都可执行
        return commandSequence.every(({ name, params }) => {
          const cmd = commandRegistry.get(name);
          return cmd && (!validateCommands || 
                          typeof cmd.canExecute !== 'function' || 
                          cmd.canExecute(params || {}, context));
        });
      },
      
      // 宏命令不支持撤销，将作为命令组撤销
      undo: null
    };
    
    return registerCommand(name, macroCommand);
  };

  /**
   * 检查命令是否可用
   * @param {string} name - 命令名称
   * @param {Object} params - 命令参数
   * @returns {boolean} 命令是否可用
   */
  const isCommandAvailable = (name, params = {}) => {
    const command = commandRegistry.get(name);
    if (!command) {
      return false;
    }
    
    return !validateCommands || 
           typeof command.canExecute !== 'function' || 
           command.canExecute(params, getCommandContext());
  };

  /**
   * 获取命令定义
   * @param {string} name - 命令名称
   * @returns {Command|null} 命令定义或null
   */
  const getCommandDefinition = (name) => {
    return commandRegistry.get(name) || null;
  };

  /**
   * 获取批量执行器
   * @returns {Function} 批量执行函数
   */
  const getBatchExecutor = () => {
    return (commands) => {
      beginCommandGroup();
      
      try {
        const results = commands.map(({ name, params }) => 
          execute(name, params || {})
        );
        
        endCommandGroup();
        return results.every(result => result);
      } catch (error) {
        abortCommandGroup();
        if (debugMode) {
          console.error('批量执行命令错误:', error);
        }
        return false;
      }
    };
  };

  /**
   * 开始命令组
   * @param {string} [groupName="CommandGroup"] - 命令组名称
   * @returns {boolean} 是否成功开始命令组
   */
  const beginCommandGroup = (groupName = "CommandGroup") => {
    commandGroupStack.value.push({
      name: groupName,
      commands: [],
      timestamp: Date.now()
    });
    return true;
  };

  /**
   * 结束命令组
   * @returns {boolean} 是否成功结束命令组
   */
  const endCommandGroup = () => {
    if (commandGroupStack.value.length === 0) {
      return false;
    }
    
    const group = commandGroupStack.value.pop();
    
    // 如果组内没有命令，不添加到历史记录
    if (group.commands.length === 0) {
      return true;
    }
    
    // 创建一个组合命令并添加到历史
    undoHistory.value.push({
      name: group.name,
      isGroup: true,
      commands: [...group.commands],
      timestamp: group.timestamp
    });
    
    // 清空重做历史
    redoHistory.value = [];
    
    return true;
  };

  /**
   * 中止命令组
   * @returns {boolean} 是否成功中止命令组
   */
  const abortCommandGroup = () => {
    if (commandGroupStack.value.length === 0) {
      return false;
    }
    
    const group = commandGroupStack.value.pop();
    
    // 从后向前撤销已执行的命令
    for (let i = group.commands.length - 1; i >= 0; i--) {
      const item = group.commands[i];
      if (typeof item.command.undo === 'function') {
        item.command.undo(item.params, getCommandContext());
      }
    }
    
    return true;
  };

  /**
   * 注册核心命令
   */
  const registerCoreCommands = () => {
    // 这里可以注册一些核心命令，如文本操作、格式化等
  };

  // 初始化注册核心命令
  registerCoreCommands();

  // 导出API
  return {
    registerCommand,
    unregisterCommand,
    execute,
    undo,
    redo,
    canUndo,
    canRedo,
    getHistory,
    clearHistory,
    getAvailableCommands,
    createMacro,
    isCommandAvailable,
    getCommandDefinition,
    getBatchExecutor,
    beginCommandGroup,
    endCommandGroup,
    abortCommandGroup
  };
}; 