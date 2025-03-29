/**
 * 编辑器管理器模块
 * 整合各功能组件，提供统一的API接口
 */

// 导入所有子模块
import { createDocumentModel } from './documentModel.js';
import { createSpecialDeviceManager, createSpecialDeviceAdapter } from './specialDeviceSupport.js';
import { createDrawingManager } from './advancedDrawingSupport.js';
import { createCollaborationManager } from './collaborationManager.js';

/**
 * 编辑器管理器配置
 * @typedef {Object} EditorManagerConfig
 * @property {HTMLElement} container - 编辑器容器元素
 * @property {Object} eventManager - 事件管理器实例
 * @property {Object} options - 其他配置选项
 * @property {boolean} options.enableSpecialDevices - 是否启用特殊设备支持
 * @property {boolean} options.enableDrawing - 是否启用绘图支持
 * @property {boolean} options.enableCollaboration - 是否启用协同编辑
 * @property {Function} options.syncFunction - 协同编辑同步函数
 * @property {string} options.userId - 用户ID（用于协同编辑）
 */

/**
 * 创建编辑器管理器
 * @param {EditorManagerConfig} config - 配置对象
 * @returns {Object} 编辑器管理器API
 */
export const createEditorManager = (config = {}) => {
  const {
    container,
    eventManager,
    options = {}
  } = config;
  
  if (!container) {
    throw new Error('编辑器管理器需要一个容器元素');
  }
  
  if (!eventManager) {
    throw new Error('编辑器管理器需要一个事件管理器实例');
  }
  
  // 解构选项
  const {
    enableSpecialDevices = true,
    enableDrawing = true,
    enableCollaboration = false,
    syncFunction = null,
    userId = null
  } = options;
  
  // 组件实例存储
  const components = {
    documentModel: null,
    specialDeviceManager: null,
    specialDeviceAdapter: null,
    drawingManager: null,
    collaborationManager: null
  };
  
  // 编辑器状态
  const editorState = {
    initialized: false,
    ready: false,
    activeModules: new Set(),
    config: { ...options }
  };
  
  /**
   * 初始化文档模型
   * @returns {Object} 文档模型实例
   */
  const initDocumentModel = () => {
    try {
      // 创建文档模型
      const documentModel = createDocumentModel({
        eventManager,
        container
      });
      
      // 存储并返回实例
      components.documentModel = documentModel;
      editorState.activeModules.add('documentModel');
      
      // 触发事件
      eventManager.core.dispatch('documentModelInitialized', null, {
        timestamp: Date.now()
      });
      
      return documentModel;
    } catch (error) {
      console.error('初始化文档模型失败:', error);
      return null;
    }
  };
  
  /**
   * 初始化特殊设备支持
   * @returns {boolean} 是否成功初始化
   */
  const initSpecialDeviceSupport = () => {
    if (!enableSpecialDevices) return false;
    
    try {
      // 创建特殊设备管理器
      const deviceManager = createSpecialDeviceManager({
        eventManager,
        detectOnInit: true
      });
      
      // 创建特殊设备适配器
      const deviceAdapter = createSpecialDeviceAdapter({
        eventManager,
        documentModel: components.documentModel,
        deviceManager
      });
      
      // 存储实例
      components.specialDeviceManager = deviceManager;
      components.specialDeviceAdapter = deviceAdapter;
      editorState.activeModules.add('specialDevices');
      
      // 触发事件
      eventManager.core.dispatch('specialDevicesInitialized', null, {
        timestamp: Date.now()
      });
      
      return true;
    } catch (error) {
      console.error('初始化特殊设备支持失败:', error);
      return false;
    }
  };
  
  /**
   * 初始化绘图支持
   * @returns {boolean} 是否成功初始化
   */
  const initDrawingSupport = () => {
    if (!enableDrawing) return false;
    
    try {
      // 创建绘图管理器
      const drawingManager = createDrawingManager({
        eventManager,
        documentModel: components.documentModel,
        container
      });
      
      // 存储实例
      components.drawingManager = drawingManager;
      editorState.activeModules.add('drawing');
      
      // 触发事件
      eventManager.core.dispatch('drawingSupportInitialized', null, {
        timestamp: Date.now()
      });
      
      return true;
    } catch (error) {
      console.error('初始化绘图支持失败:', error);
      return false;
    }
  };
  
  /**
   * 初始化协同编辑支持
   * @returns {boolean} 是否成功初始化
   */
  const initCollaborationSupport = () => {
    if (!enableCollaboration || !syncFunction || !userId) return false;
    
    try {
      // 创建协同编辑管理器
      const collaborationManager = createCollaborationManager({
        eventManager,
        documentModel: components.documentModel,
        syncFunction,
        userId,
        debugMode: editorState.config.debugMode
      });
      
      // 存储实例
      components.collaborationManager = collaborationManager;
      editorState.activeModules.add('collaboration');
      
      // 触发事件
      eventManager.core.dispatch('collaborationInitialized', null, {
        timestamp: Date.now()
      });
      
      return true;
    } catch (error) {
      console.error('初始化协同编辑支持失败:', error);
      return false;
    }
  };
  
  /**
   * 初始化编辑器
   * @returns {boolean} 是否成功初始化
   */
  const init = () => {
    if (editorState.initialized) return true;
    
    try {
      // 初始化各组件
      const documentModel = initDocumentModel();
      
      if (!documentModel) {
        throw new Error('文档模型初始化失败');
      }
      
      // 初始化特殊设备支持（可选）
      initSpecialDeviceSupport();
      
      // 初始化绘图支持（可选）
      initDrawingSupport();
      
      // 初始化协同编辑支持（可选）
      initCollaborationSupport();
      
      // 设置状态
      editorState.initialized = true;
      editorState.ready = true;
      
      // 触发就绪事件
      eventManager.core.dispatch('editorReady', null, {
        activeModules: Array.from(editorState.activeModules),
        timestamp: Date.now()
      });
      
      return true;
    } catch (error) {
      console.error('初始化编辑器失败:', error);
      
      // 清理已创建的组件
      cleanup();
      
      return false;
    }
  };
  
  /**
   * 清理编辑器资源
   * @returns {boolean} 是否成功清理
   */
  const cleanup = () => {
    try {
      // 清理各组件
      if (components.collaborationManager) {
        components.collaborationManager.cleanup();
        editorState.activeModules.delete('collaboration');
      }
      
      if (components.drawingManager) {
        components.drawingManager.cleanup();
        editorState.activeModules.delete('drawing');
      }
      
      if (components.specialDeviceAdapter) {
        components.specialDeviceAdapter.cleanup();
      }
      
      if (components.specialDeviceManager) {
        components.specialDeviceManager.cleanup();
        editorState.activeModules.delete('specialDevices');
      }
      
      if (components.documentModel) {
        components.documentModel.cleanup();
        editorState.activeModules.delete('documentModel');
      }
      
      // 重置状态
      editorState.initialized = false;
      editorState.ready = false;
      
      // 触发清理事件
      eventManager.core.dispatch('editorCleanup', null, {
        timestamp: Date.now()
      });
      
      return true;
    } catch (error) {
      console.error('清理编辑器资源失败:', error);
      return false;
    }
  };
  
  /**
   * 获取编辑器就绪状态
   * @returns {boolean} 编辑器是否就绪
   */
  const isReady = () => editorState.ready;
  
  /**
   * 获取活动模块列表
   * @returns {string[]} 活动模块列表
   */
  const getActiveModules = () => Array.from(editorState.activeModules);
  
  /**
   * 获取组件实例
   * @param {string} componentName - 组件名称
   * @returns {Object|null} 组件实例或null
   */
  const getComponent = (componentName) => {
    if (!componentName || !components[componentName]) {
      return null;
    }
    
    return components[componentName];
  };
  
  /**
   * 设置编辑器配置选项
   * @param {Object} options - 配置选项
   * @returns {boolean} 是否成功设置
   */
  const setConfig = (options = {}) => {
    if (!options || typeof options !== 'object') {
      return false;
    }
    
    // 更新配置
    Object.assign(editorState.config, options);
    
    // 触发配置更新事件
    eventManager.core.dispatch('editorConfigUpdate', null, {
      config: { ...editorState.config },
      timestamp: Date.now()
    });
    
    return true;
  };
  
  /**
   * 获取编辑器配置
   * @returns {Object} 编辑器配置
   */
  const getConfig = () => ({ ...editorState.config });
  
  /**
   * 启用绘图模式
   * @returns {boolean} 是否成功启用
   */
  const enableDrawingMode = () => {
    if (!components.drawingManager) {
      console.warn('绘图管理器未初始化');
      return false;
    }
    
    return components.drawingManager.enable();
  };
  
  /**
   * 禁用绘图模式
   * @returns {boolean} 是否成功禁用
   */
  const disableDrawingMode = () => {
    if (!components.drawingManager) {
      console.warn('绘图管理器未初始化');
      return false;
    }
    
    return components.drawingManager.disable();
  };
  
  /**
   * 连接到协同会话
   * @param {string} sessionId - 会话ID
   * @returns {Promise<boolean>} 是否成功连接
   */
  const connectCollaboration = async (sessionId) => {
    if (!components.collaborationManager) {
      console.warn('协同编辑管理器未初始化');
      return false;
    }
    
    try {
      return await components.collaborationManager.connect(sessionId);
    } catch (error) {
      console.error('连接到协同会话失败:', error);
      return false;
    }
  };
  
  /**
   * 断开协同会话
   * @returns {boolean} 是否成功断开
   */
  const disconnectCollaboration = () => {
    if (!components.collaborationManager) {
      console.warn('协同编辑管理器未初始化');
      return false;
    }
    
    return components.collaborationManager.disconnect();
  };
  
  /**
   * 执行文档命令
   * @param {string} command - 命令名称
   * @param {Object} params - 命令参数
   * @returns {boolean} 是否成功执行
   */
  const execCommand = (command, params = {}) => {
    if (!components.documentModel) {
      console.warn('文档模型未初始化');
      return false;
    }
    
    return components.documentModel.execCommand(command, params);
  };
  
  /**
   * 对编辑器内容执行搜索
   * @param {string} query - 搜索查询
   * @param {Object} options - 搜索选项
   * @returns {Object[]} 搜索结果
   */
  const search = (query, options = {}) => {
    if (!components.documentModel) {
      console.warn('文档模型未初始化');
      return [];
    }
    
    return components.documentModel.search(query, options);
  };
  
  /**
   * 获取编辑器内容
   * @param {string} format - 内容格式（如'text', 'html', 'json'等）
   * @returns {string|Object} 编辑器内容
   */
  const getContent = (format = 'text') => {
    if (!components.documentModel) {
      console.warn('文档模型未初始化');
      return format === 'json' ? {} : '';
    }
    
    return components.documentModel.getContent(format);
  };
  
  /**
   * 设置编辑器内容
   * @param {string|Object} content - 内容
   * @param {string} format - 内容格式
   * @returns {boolean} 是否成功设置
   */
  const setContent = (content, format = 'text') => {
    if (!components.documentModel) {
      console.warn('文档模型未初始化');
      return false;
    }
    
    return components.documentModel.setContent(content, format);
  };
  
  /**
   * 保存编辑器内容
   * @returns {Promise<Object>} 保存结果
   */
  const saveContent = async () => {
    if (!components.documentModel) {
      console.warn('文档模型未初始化');
      return { success: false, error: '文档模型未初始化' };
    }
    
    try {
      // 获取内容
      const content = components.documentModel.getContent('json');
      
      // 触发保存事件
      eventManager.core.dispatch('contentSave', null, {
        content,
        timestamp: Date.now()
      });
      
      return { success: true, content };
    } catch (error) {
      console.error('保存内容失败:', error);
      return { success: false, error: error.message };
    }
  };
  
  /**
   * 获取编辑器状态信息
   * @returns {Object} 状态信息
   */
  const getState = () => {
    const state = {
      ready: editorState.ready,
      initialized: editorState.initialized,
      activeModules: getActiveModules(),
      drawingEnabled: components.drawingManager ? components.drawingManager.isEnabled() : false,
      collaborationConnected: components.collaborationManager ? 
        components.collaborationManager.isConnected() : false,
      userCount: components.collaborationManager ? 
        components.collaborationManager.getRemoteUsers().length + 1 : 1
    };
    
    return state;
  };
  
  /**
   * 注册编辑器插件
   * @param {Object} plugin - 插件对象
   * @returns {boolean} 是否成功注册
   */
  const registerPlugin = (plugin) => {
    if (!plugin || typeof plugin !== 'object' || !plugin.name) {
      console.warn('无效的插件对象');
      return false;
    }
    
    try {
      // 检查插件依赖
      if (Array.isArray(plugin.requires)) {
        for (const requirement of plugin.requires) {
          if (!editorState.activeModules.has(requirement)) {
            console.warn(`插件${plugin.name}依赖于未激活的模块:`, requirement);
            return false;
          }
        }
      }
      
      // 初始化插件
      if (typeof plugin.init === 'function') {
        const pluginApi = {
          // 提供插件可使用的API
          execCommand,
          getContent,
          setContent,
          getState,
          eventManager,
          documentModel: components.documentModel
        };
        
        // 执行插件初始化
        const initResult = plugin.init(pluginApi);
        
        if (initResult === false) {
          console.warn(`插件${plugin.name}初始化失败`);
          return false;
        }
      }
      
      // 添加到活动模块
      editorState.activeModules.add(`plugin:${plugin.name}`);
      
      // 触发插件注册事件
      eventManager.core.dispatch('pluginRegistered', null, {
        plugin: plugin.name,
        timestamp: Date.now()
      });
      
      return true;
    } catch (error) {
      console.error(`注册插件${plugin.name}失败:`, error);
      return false;
    }
  };
  
  // 自动初始化
  init();
  
  // 返回公共API
  return {
    // 核心方法
    init,
    cleanup,
    isReady,
    getActiveModules,
    getComponent,
    setConfig,
    getConfig,
    getState,
    
    // 文档操作
    execCommand,
    search,
    getContent,
    setContent,
    saveContent,
    
    // 绘图相关
    enableDrawingMode,
    disableDrawingMode,
    
    // 协同编辑相关
    connectCollaboration,
    disconnectCollaboration,
    
    // 插件支持
    registerPlugin
  };
}; 