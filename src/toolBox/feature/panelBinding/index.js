/**
 * 面板绑定模块
 * 统一导出面板绑定相关功能
 */

// 导出面板注册表
export * from './panelRegistry.js';

// 导出面板绑定管理器
export * from './panelBindingManager.js';

// 导出面板绑定混入
export { usePanelBinding } from './panelBindingMixin.js';

// 导出面板发现服务
export * from './panelDiscoveryService.js';

// 导出组件
import PanelBindingDialog from './components/PanelBindingDialog.vue';
import PanelBindingToolbar from './components/PanelBindingToolbar.vue';

export {
  PanelBindingDialog,
  PanelBindingToolbar
};

// 引入注册表API
import { 
  PANEL_STATES, 
  CONNECTION_STATES, 
  getAllPanels, 
  registerPanel
} from './panelRegistry.js';

// 引入面板发现服务
import { discoveryService } from './panelDiscoveryService.js';

/**
 * 创建面板绑定UI
 * 工具函数，用于在面板头部创建绑定工具栏
 * 
 * @param {Object} options 配置选项
 * @param {string} options.panelId 面板ID
 * @param {string} options.panelName 面板名称
 * @param {Object} options.panelData 面板数据
 * @param {string} options.bindingState 绑定状态
 * @param {boolean} options.showAddButton 是否显示添加按钮
 * @param {Function} options.onNavigate 导航回调
 * @param {Function} options.onCreateBinding 创建绑定回调
 * @param {Function} options.onSyncData 同步数据回调
 * @param {Function} options.onUnbind 解绑回调
 * @param {Function} options.onBindingChange 绑定变化回调
 * @returns {string} 渲染的HTML
 */
export function createPanelBindingUI(options) {
  const { 
    panelId, 
    panelName, 
    panelData, 
    bindingState = CONNECTION_STATES.DISCONNECTED,
    showAddButton = true,
    onNavigate,
    onCreateBinding,
    onSyncData,
    onUnbind,
    onBindingChange
  } = options;
  
  // 确保面板被注册到注册表
  if (panelId && panelName) {
    registerPanel(panelId, {
      name: panelName,
      metadata: {
        lastActiveAt: Date.now(),
        autoDiscovered: true
      }
    });
  }
  
  // 简单的HTML渲染，用于非Vue环境
  const html = `
    <div class="panel-binding-ui">
      <div class="binding-indicator" data-panel-id="${panelId}" data-panel-name="${panelName}">
        <svg><use xlink:href="#icon${bindingState === CONNECTION_STATES.CONNECTED ? 'Link' : 'Unlink'}"></use></svg>
      </div>
      ${showAddButton ? `
        <button class="binding-add-btn" title="添加面板绑定">
          <svg><use xlink:href="#iconAdd"></use></svg>
        </button>
      ` : ''}
    </div>
  `;
  
  // 在渲染后必须手动绑定事件
  setTimeout(() => {
    const indicator = document.querySelector(`.binding-indicator[data-panel-id="${panelId}"]`);
    const addBtn = document.querySelector(`.binding-add-btn[data-panel-id="${panelId}"]`);
    
    if (indicator) {
      indicator.addEventListener('click', () => {
        if (typeof onNavigate === 'function') {
          onNavigate();
        }
      });
    }
    
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        if (typeof onCreateBinding === 'function') {
          onCreateBinding();
        }
      });
    }
  }, 0);
  
  return html;
}

/**
 * 获取可绑定的面板列表
 * @param {string} [currentPanelId] 当前面板ID，用于排除自身
 * @param {Object} [options] 额外选项
 * @returns {Array} 可绑定的面板列表
 */
export function getBindablePanels(currentPanelId = null, options = {}) {
  // 触发一次面板发现
  discoveryService.discover();
  
  // 获取所有面板
  const allPanels = getAllPanels({ activeOnly: true, ...options });
  
  // 如果指定了当前面板ID，排除自身
  if (currentPanelId) {
    return allPanels.filter(panel => panel.id !== currentPanelId);
  }
  
  return allPanels;
}

// 初始化面板绑定服务，确保在应用启动时发现面板
export function initPanelBindingServices() {
  // 首次扫描发现面板
  discoveryService.discover();
  
  // 这里可以添加其他初始化逻辑
  console.log('面板绑定服务已初始化');
  
  return {
    discoveryService,
    // 可以返回其他服务实例
  };
}

// 自动初始化
initPanelBindingServices(); 