/**
 * 面板绑定管理器
 * 用于管理面板之间的绑定关系和通信
 */
import { createEventBus } from '../../base/forEvent/useEventBus.js';

// 创建专用于面板绑定的事件总线
const bindingEventBus = createEventBus();

/**
 * 面板绑定和解绑事件
 */
const BINDING_EVENTS = {
  // 绑定事件
  PANEL_BOUND: 'panel:bound',
  // 解绑事件
  PANEL_UNBOUND: 'panel:unbound',
  // 数据同步事件
  PANEL_DATA_SYNC: 'panel:data-sync',
  // 面板状态更新
  PANEL_STATE_CHANGED: 'panel:state-changed',
};

/**
 * 面板绑定类型
 */
const BINDING_TYPES = {
  // 双向绑定 - 两个面板互相影响
  BIDIRECTIONAL: 'bidirectional',
  // 单向绑定 - 源面板影响目标面板
  UNIDIRECTIONAL: 'unidirectional',
  // 部分绑定 - 只绑定部分属性
  PARTIAL: 'partial',
};

/**
 * 面板连接状态
 */
const CONNECTION_STATES = {
  // 已连接
  CONNECTED: 'connected',
  // 等待连接
  PENDING: 'pending',
  // 已断开连接
  DISCONNECTED: 'disconnected',
  // 连接错误
  ERROR: 'error',
};

/**
 * 预定义的面板绑定颜色主题
 */
const BINDING_THEMES = {
  // 蓝色主题 - 默认
  blue: {
    primary: '#1a73e8',
    secondary: '#8ab4f8',
    indicator: '#1a73e877',
    border: '#1a73e8',
    text: '#1a73e8',
  },
  // 绿色主题
  green: {
    primary: '#188038',
    secondary: '#81c995',
    indicator: '#18803877',
    border: '#188038',
    text: '#188038',
  },
  // 红色主题
  red: {
    primary: '#d93025',
    secondary: '#f28b82',
    indicator: '#d9302577',
    border: '#d93025',
    text: '#d93025',
  },
  // 橙色主题
  orange: {
    primary: '#f29900',
    secondary: '#fdd663',
    indicator: '#f2990077',
    border: '#f29900',
    text: '#f29900',
  },
  // 紫色主题
  purple: {
    primary: '#9334e6',
    secondary: '#c58af9',
    indicator: '#9334e677',
    border: '#9334e6',
    text: '#9334e6',
  },
};

// 存储面板绑定信息
const panelBindings = new Map();

// 存储面板元数据
const panelMetadata = new Map();

/**
 * 生成唯一的绑定ID
 * @returns {string} 唯一ID
 */
function generateBindingId() {
  return `binding_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * 创建面板绑定
 * @param {string} sourcePanelId - 源面板ID
 * @param {string} targetPanelId - 目标面板ID
 * @param {Object} options - 绑定选项
 * @param {string} [options.type=BINDING_TYPES.BIDIRECTIONAL] - 绑定类型
 * @param {string} [options.theme='blue'] - 使用的颜色主题
 * @param {Array<string>} [options.properties=[]] - 绑定的属性（用于部分绑定）
 * @param {Function} [options.dataTransformer] - 数据转换函数
 * @returns {string} 绑定ID
 */
function bindPanels(sourcePanelId, targetPanelId, options = {}) {
  if (!sourcePanelId || !targetPanelId) {
    console.error('面板绑定失败: 缺少面板ID');
    return null;
  }

  // 设置默认选项
  const bindingOptions = {
    type: BINDING_TYPES.BIDIRECTIONAL,
    theme: 'blue',
    properties: [],
    dataTransformer: null,
    ...options,
  };

  // 生成绑定ID
  const bindingId = generateBindingId();

  // 创建绑定记录
  const binding = {
    id: bindingId,
    sourcePanelId,
    targetPanelId,
    state: CONNECTION_STATES.CONNECTED,
    createdAt: Date.now(),
    lastSyncAt: Date.now(),
    options: bindingOptions,
  };

  // 存储绑定记录
  panelBindings.set(bindingId, binding);

  // 发布绑定事件
  bindingEventBus.emit(BINDING_EVENTS.PANEL_BOUND, {
    binding,
    source: sourcePanelId,
    target: targetPanelId,
  });

  return bindingId;
}

/**
 * 解除面板绑定
 * @param {string} bindingId - 绑定ID
 * @returns {boolean} 是否成功解除绑定
 */
function unbindPanels(bindingId) {
  if (!panelBindings.has(bindingId)) {
    console.warn(`面板解绑失败: 找不到绑定ID ${bindingId}`);
    return false;
  }

  const binding = panelBindings.get(bindingId);
  
  // 发布解绑事件
  bindingEventBus.emit(BINDING_EVENTS.PANEL_UNBOUND, {
    binding,
    source: binding.sourcePanelId,
    target: binding.targetPanelId,
  });

  // 删除绑定记录
  panelBindings.delete(bindingId);
  
  return true;
}

/**
 * 获取面板的所有绑定
 * @param {string} panelId - 面板ID
 * @returns {Array} 绑定列表
 */
function getPanelBindings(panelId) {
  if (!panelId) return [];
  
  return Array.from(panelBindings.values()).filter(
    binding => binding.sourcePanelId === panelId || binding.targetPanelId === panelId
  );
}

/**
 * 获取两个面板之间的绑定
 * @param {string} panelId1 - 第一个面板ID
 * @param {string} panelId2 - 第二个面板ID
 * @returns {Object|null} 绑定记录或null
 */
function getBindingBetweenPanels(panelId1, panelId2) {
  return Array.from(panelBindings.values()).find(
    binding => 
      (binding.sourcePanelId === panelId1 && binding.targetPanelId === panelId2) ||
      (binding.sourcePanelId === panelId2 && binding.targetPanelId === panelId1)
  ) || null;
}

/**
 * 同步面板数据
 * @param {string} sourcePanelId - 源面板ID
 * @param {any} data - 要同步的数据
 * @param {Object} options - 同步选项
 * @returns {boolean} 是否成功同步
 */
function syncPanelData(sourcePanelId, data, options = {}) {
  const bindings = getPanelBindings(sourcePanelId);
  
  if (bindings.length === 0) {
    return false;
  }

  // 默认选项
  const syncOptions = {
    properties: null, // 为null时同步所有数据
    ...options
  };

  bindings.forEach(binding => {
    // 源面板到目标面板的单向绑定
    if (binding.sourcePanelId === sourcePanelId || binding.options.type === BINDING_TYPES.BIDIRECTIONAL) {
      const targetPanelId = binding.sourcePanelId === sourcePanelId 
        ? binding.targetPanelId 
        : binding.sourcePanelId;
      
      let syncData = data;
      
      // 如果设置了部分绑定，只同步指定属性
      if (binding.options.type === BINDING_TYPES.PARTIAL && binding.options.properties.length > 0) {
        syncData = {};
        binding.options.properties.forEach(prop => {
          if (data && data[prop] !== undefined) {
            syncData[prop] = data[prop];
          }
        });
      }
      
      // 使用数据转换器（如果有）
      if (typeof binding.options.dataTransformer === 'function') {
        syncData = binding.options.dataTransformer(syncData, sourcePanelId, targetPanelId);
      }
      
      // 更新最后同步时间
      binding.lastSyncAt = Date.now();
      
      // 发布数据同步事件
      bindingEventBus.emit(BINDING_EVENTS.PANEL_DATA_SYNC, {
        binding,
        sourcePanelId,
        targetPanelId,
        data: syncData,
        properties: syncOptions.properties,
      });
    }
  });
  
  return true;
}

/**
 * 获取所有注册的面板
 * @param {boolean} includeInactive - 是否包含不活跃的面板
 * @returns {Array} 面板列表
 */
function getAllPanels(includeInactive = true) {
  console.log('获取所有面板，面板元数据Map大小:', panelMetadata.size);
  console.log('当前注册的面板IDs:', Array.from(panelMetadata.keys()));
  
  if (panelMetadata.size === 0) {
    console.warn('警告: 没有注册的面板');
    return [];
  }
  
  const panels = [];
  
  // 转换面板元数据为面板对象列表
  panelMetadata.forEach((metadata, panelId) => {
    // 过滤不活跃的面板
    if (!includeInactive && metadata.lastActiveTime && Date.now() - metadata.lastActiveTime > 24 * 60 * 60 * 1000) {
      return;
    }
    
    panels.push({
      id: panelId,
      name: metadata.name || panelId,
      type: metadata.type || 'unknown',
      exposedProperties: metadata.exposedProperties || [],
      isActive: !!metadata.lastActiveTime,
      lastActiveTime: metadata.lastActiveTime || null,
      ...metadata
    });
  });
  
  console.log('处理后的面板列表:', panels);
  return panels;
}

/**
 * 注册面板
 * @param {string} panelId - 面板ID
 * @param {Object} metadata - 面板元数据
 * @returns {boolean} 是否成功注册
 */
function registerPanel(panelId, metadata = {}) {
  if (!panelId) {
    console.error('面板注册失败: 缺少面板ID');
    return false;
  }
  
  const currentTime = Date.now();
  
  // 合并元数据
  const updatedMetadata = {
    ...metadata,
    lastActiveTime: currentTime,
    registeredAt: panelMetadata.has(panelId) 
      ? panelMetadata.get(panelId).registeredAt 
      : currentTime
  };
  
  // 存储元数据
  panelMetadata.set(panelId, updatedMetadata);
  
  console.log(`面板 "${panelId}" 已注册/更新, 当前共有 ${panelMetadata.size} 个面板`);
  
  // 触发面板状态变更事件
  bindingEventBus.emit(BINDING_EVENTS.PANEL_STATE_CHANGED, {
    panelId,
    action: 'register',
    metadata: updatedMetadata
  });
  
  return true;
}

/**
 * 取消注册面板
 * @param {string} panelId - 面板ID
 */
function unregisterPanel(panelId) {
  if (!panelId) return;
  
  // 解除所有与该面板相关的绑定
  const bindings = getPanelBindings(panelId);
  bindings.forEach(binding => {
    unbindPanels(binding.id);
  });
  
  // 删除面板元数据
  panelMetadata.delete(panelId);
}

/**
 * 更新面板活跃状态
 * @param {string} panelId - 面板ID
 */
function updatePanelActivity(panelId) {
  if (!panelId || !panelMetadata.has(panelId)) return;
  
  const metadata = panelMetadata.get(panelId);
  metadata.lastActiveAt = Date.now();
  panelMetadata.set(panelId, metadata);
}

/**
 * 获取绑定CSS变量
 * @param {string} bindingId - 绑定ID
 * @returns {Object} CSS变量对象
 */
function getBindingCSSVariables(bindingId) {
  if (!panelBindings.has(bindingId)) {
    return {};
  }

  const binding = panelBindings.get(bindingId);
  const theme = BINDING_THEMES[binding.options.theme] || BINDING_THEMES.blue;
  
  return {
    '--panel-binding-primary': theme.primary,
    '--panel-binding-secondary': theme.secondary,
    '--panel-binding-indicator': theme.indicator,
    '--panel-binding-border': theme.border,
    '--panel-binding-text': theme.text,
  };
}

/**
 * 获取所有绑定
 * @returns {Array} 所有绑定的数组
 */
function getAllBindings() {
  return Array.from(panelBindings.values());
}

/**
 * 强制发现所有窗口中的面板
 * 这是一个高级函数，用于在面板自动注册失败时手动搜索面板
 * @returns {Array} 发现的面板列表
 */
function discoverPanels() {
  console.log('尝试发现所有面板...');
  
  try {
    // 在DOM中查找所有可能的面板
    const panelElements = document.querySelectorAll('[data-panel-id]');
    console.log(`在DOM中发现 ${panelElements.length} 个可能的面板元素`);
    
    // 注册发现的面板
    panelElements.forEach(element => {
      const panelId = element.getAttribute('data-panel-id');
      const panelName = element.getAttribute('data-panel-name') || panelId;
      const panelType = element.getAttribute('data-panel-type') || 'unknown';
      
      if (panelId) {
        registerPanel(panelId, {
          name: panelName,
          type: panelType,
          element: element,
          discovered: true
        });
      }
    });
    
    return getAllPanels();
  } catch (error) {
    console.error('面板发现过程中发生错误:', error);
    return [];
  }
}

/**
 * 重置面板管理器状态
 * 用于调试和高级用例
 */
function resetPanelManager() {
  // 清空所有绑定
  panelBindings.clear();
  
  // 清空所有面板元数据
  panelMetadata.clear();
  
  console.log('面板管理器已重置');
  
  // 触发状态变更事件
  bindingEventBus.emit(BINDING_EVENTS.PANEL_STATE_CHANGED, {
    action: 'reset'
  });
}

export {
  // 常量
  BINDING_EVENTS,
  BINDING_TYPES,
  CONNECTION_STATES,
  BINDING_THEMES,
  
  // 事件总线
  bindingEventBus,
  
  // 核心API
  bindPanels,
  unbindPanels,
  getPanelBindings,
  getBindingBetweenPanels,
  syncPanelData,
  
  // 面板管理
  registerPanel,
  unregisterPanel,
  updatePanelActivity,
  
  // 辅助函数
  getBindingCSSVariables,
  getAllBindings,
  getAllPanels,
  
  // 新增导出函数
  discoverPanels,
  resetPanelManager
}; 