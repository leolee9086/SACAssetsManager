/**
 * 面板注册表
 * 为应用提供全局面板实例管理和高效查询功能
 */

import { createEventBus } from '../../base/forEvent/useEventBus.js';

// 面板注册表事件总线
const registryEventBus = createEventBus();

/**
 * 面板注册表事件类型
 */
const REGISTRY_EVENTS = {
  // 面板注册事件
  PANEL_REGISTERED: 'panel:registered',
  // 面板更新事件
  PANEL_UPDATED: 'panel:updated',
  // 面板注销事件
  PANEL_UNREGISTERED: 'panel:unregistered',
  // 面板激活事件
  PANEL_ACTIVATED: 'panel:activated',
  // 面板状态变更事件
  PANEL_STATE_CHANGED: 'panel:state-changed',
};

/**
 * 面板类型
 */
const PANEL_TYPES = {
  // 标准面板
  STANDARD: 'standard',
  // 侧边栏面板
  SIDEBAR: 'sidebar',
  // 对话框面板
  DIALOG: 'dialog',
  // 浮动面板
  FLOATING: 'floating',
  // 自定义面板
  CUSTOM: 'custom',
};

/**
 * 面板状态
 */
const PANEL_STATES = {
  // 活跃状态
  ACTIVE: 'active',
  // 非活跃状态
  INACTIVE: 'inactive',
  // 暂停状态
  SUSPENDED: 'suspended',
  // 销毁状态
  DESTROYED: 'destroyed',
};

// 面板元数据存储
const panelMetadata = new Map();
// 面板分组存储
const panelGroups = new Map();

/**
 * 生成唯一的面板ID
 * @param {string} [prefix='panel'] - ID前缀
 * @returns {string} 唯一的面板ID
 */
function generatePanelId(prefix = 'panel') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 注册面板
 * @param {string} panelId - 面板ID
 * @param {Object} options - 面板选项
 * @param {string} [options.name] - 面板名称
 * @param {string} [options.type] - 面板类型
 * @param {Object} [options.metadata] - 面板元数据
 * @param {string[]} [options.groups] - 面板所属分组
 * @returns {boolean} 是否成功注册
 */
function registerPanel(panelId, options = {}) {
  if (!panelId) {
    console.error('面板注册失败: 缺少面板ID');
    return false;
  }
  
  const { 
    name = panelId, 
    type = PANEL_TYPES.STANDARD,
    metadata = {},
    groups = []
  } = options;
  
  const timestamp = Date.now();
  const exists = panelMetadata.has(panelId);
  
  // 存储面板元数据
  const panelMeta = {
    id: panelId,
    name,
    type,
    state: PANEL_STATES.ACTIVE,
    createdAt: exists ? panelMetadata.get(panelId).createdAt : timestamp,
    updatedAt: timestamp,
    lastActiveAt: timestamp,
    ...metadata
  };
  
  panelMetadata.set(panelId, panelMeta);
  
  // 添加到分组
  if (groups && Array.isArray(groups)) {
    groups.forEach(groupName => {
      if (!panelGroups.has(groupName)) {
        panelGroups.set(groupName, new Set());
      }
      panelGroups.get(groupName).add(panelId);
    });
  }
  
  // 触发事件
  registryEventBus.emit(
    exists ? REGISTRY_EVENTS.PANEL_UPDATED : REGISTRY_EVENTS.PANEL_REGISTERED,
    { panelId, metadata: panelMeta }
  );
  
  console.log(`面板 ${exists ? '更新' : '注册'} 成功: ${panelId}`);
  return true;
}

/**
 * 注销面板
 * @param {string} panelId - 面板ID
 * @returns {boolean} 是否成功注销
 */
function unregisterPanel(panelId) {
  if (!panelId || !panelMetadata.has(panelId)) {
    return false;
  }
  
  // 获取面板元数据
  const metadata = panelMetadata.get(panelId);
  
  // 从分组中移除
  panelGroups.forEach((panels, groupName) => {
    if (panels.has(panelId)) {
      panels.delete(panelId);
      // 如果分组为空，删除分组
      if (panels.size === 0) {
        panelGroups.delete(groupName);
      }
    }
  });
  
  // 删除元数据
  panelMetadata.delete(panelId);
  
  // 触发事件
  registryEventBus.emit(REGISTRY_EVENTS.PANEL_UNREGISTERED, { 
    panelId, 
    metadata 
  });
  
  console.log(`面板注销成功: ${panelId}`);
  return true;
}

/**
 * 更新面板状态
 * @param {string} panelId - 面板ID 
 * @param {Object} [options] - 更新选项
 * @param {boolean} [options.active=true] - 是否活跃
 * @param {Object} [options.metadata] - 要更新的元数据
 * @returns {boolean} 是否成功更新
 */
function updatePanelState(panelId, options = {}) {
  if (!panelId || !panelMetadata.has(panelId)) {
    return false;
  }
  
  const { 
    active = true,
    metadata = {} 
  } = options;
  
  const panelMeta = panelMetadata.get(panelId);
  const timestamp = Date.now();
  
  // 更新状态
  panelMeta.state = active ? PANEL_STATES.ACTIVE : PANEL_STATES.INACTIVE;
  panelMeta.updatedAt = timestamp;
  
  if (active) {
    panelMeta.lastActiveAt = timestamp;
    registryEventBus.emit(REGISTRY_EVENTS.PANEL_ACTIVATED, { 
      panelId, 
      timestamp 
    });
  }
  
  // 更新元数据
  Object.assign(panelMeta, metadata);
  
  // 保存更新后的元数据
  panelMetadata.set(panelId, panelMeta);
  
  // 触发状态变更事件
  registryEventBus.emit(REGISTRY_EVENTS.PANEL_STATE_CHANGED, {
    panelId,
    state: panelMeta.state,
    metadata: panelMeta
  });
  
  return true;
}

/**
 * 获取面板元数据
 * @param {string} panelId - 面板ID 
 * @returns {Object|null} 面板元数据
 */
function getPanelMetadata(panelId) {
  return panelMetadata.get(panelId) || null;
}

/**
 * 获取所有面板
 * @param {Object} [options] - 获取选项 
 * @param {boolean} [options.activeOnly=false] - 是否只返回活跃的面板
 * @param {string} [options.groupName] - 按分组筛选
 * @param {string} [options.type] - 按类型筛选
 * @returns {Array} 面板列表
 */
function getAllPanels(options = {}) {
  const {
    activeOnly = false,
    groupName = null,
    type = null
  } = options;
  
  let panelIds = [];
  
  // 按分组筛选
  if (groupName && panelGroups.has(groupName)) {
    panelIds = Array.from(panelGroups.get(groupName));
  } 
  // 获取所有面板
  else {
    panelIds = Array.from(panelMetadata.keys());
  }
  
  // 获取面板元数据并过滤
  return panelIds
    .map(id => panelMetadata.get(id))
    .filter(meta => {
      // 筛选活跃状态
      if (activeOnly && meta.state !== PANEL_STATES.ACTIVE) {
        return false;
      }
      
      // 筛选类型
      if (type && meta.type !== type) {
        return false;
      }
      
      return true;
    });
}

/**
 * 查找面板
 * @param {Function} predicate - 筛选函数
 * @returns {Array} 匹配的面板列表
 */
function findPanels(predicate) {
  if (typeof predicate !== 'function') {
    return [];
  }
  
  return Array.from(panelMetadata.values())
    .filter(predicate);
}

/**
 * 将面板添加到分组
 * @param {string} panelId - 面板ID
 * @param {string} groupName - 分组名称
 * @returns {boolean} 是否成功添加
 */
function addPanelToGroup(panelId, groupName) {
  if (!panelId || !groupName || !panelMetadata.has(panelId)) {
    return false;
  }
  
  if (!panelGroups.has(groupName)) {
    panelGroups.set(groupName, new Set());
  }
  
  panelGroups.get(groupName).add(panelId);
  return true;
}

/**
 * 获取分组中的所有面板
 * @param {string} groupName - 分组名称
 * @returns {Array} 面板列表
 */
function getPanelsInGroup(groupName) {
  if (!groupName || !panelGroups.has(groupName)) {
    return [];
  }
  
  return Array.from(panelGroups.get(groupName))
    .map(id => panelMetadata.get(id))
    .filter(Boolean);
}

/**
 * 重置注册表
 */
function resetRegistry() {
  panelMetadata.clear();
  panelGroups.clear();
  
  console.warn('面板注册表已重置');
  
  registryEventBus.emit(REGISTRY_EVENTS.PANEL_STATE_CHANGED, {
    action: 'reset'
  });
}

/**
 * 获取注册表统计信息
 * @returns {Object} 统计信息
 */
function getRegistryStats() {
  return {
    totalPanels: panelMetadata.size,
    activePanels: getAllPanels({ activeOnly: true }).length,
    groups: Array.from(panelGroups.keys()),
    totalGroups: panelGroups.size,
  };
}

// 初始化注册几个系统面板，确保有基本面板可绑定
function initializeSystemPanels() {
  // 注册主界面面板
  registerPanel('system_main', {
    name: '主界面',
    type: PANEL_TYPES.STANDARD,
    groups: ['system']
  });
  
  // 注册编辑器面板
  registerPanel('system_editor', {
    name: '编辑器',
    type: PANEL_TYPES.STANDARD,
    groups: ['system']
  });
}

// 自动初始化系统面板
initializeSystemPanels();

export {
  // 事件和常量
  REGISTRY_EVENTS,
  PANEL_TYPES,
  PANEL_STATES,
  registryEventBus,
  
  // 核心功能
  registerPanel,
  unregisterPanel,
  updatePanelState,
  getPanelMetadata,
  getAllPanels,
  
  // 查询功能
  findPanels,
  
  // 分组管理
  addPanelToGroup,
  getPanelsInGroup,
  
  // 辅助功能
  generatePanelId,
  getRegistryStats,
  resetRegistry
}; 