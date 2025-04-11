/**
 * 面板绑定混入
 * 为面板组件提供绑定功能的混入
 */
import { ref, computed, onMounted, onUnmounted, watch } from '../../../../static/vue.esm-browser.js';
import { openVueDialog } from '../../feature/useVue/dialogTools.js';
import { clientApi } from '../../../../source/asyncModules.js';

// 引入面板绑定管理器API
import {
  syncPanelData,
  bindingEventBus,
  BINDING_EVENTS,
  CONNECTION_STATES,
  getPanelBindings
} from './panelBindingManager.js';

// 引入面板注册表API
import {
  registerPanel as registerPanelToRegistry,
  unregisterPanel as unregisterPanelFromRegistry,
  updatePanelState,
  getAllPanels as getRegistryPanels,
  PANEL_TYPES,
  REGISTRY_EVENTS,
  registryEventBus
} from './panelRegistry.js';

/**
 * 创建面板绑定混入
 * @param {Object} options 配置选项
 * @param {string} options.panelId 面板ID
 * @param {string} options.panelName 面板名称
 * @param {Object} options.panelData 面板数据
 * @param {Function} options.onReceiveData 接收数据回调
 * @param {Array<string>} options.exposedProperties 暴露的属性列表
 * @param {string} options.panelType 面板类型
 * @param {Array<string>} options.groups 面板所属分组
 * @returns {Object} Vue组合式API对象
 */
export function usePanelBinding(options) {
  // 默认选项
  const defaultOptions = {
    panelId: '',
    panelName: '',
    panelData: {},
    onReceiveData: () => {},
    exposedProperties: [],
    panelType: PANEL_TYPES.STANDARD,
    groups: []
  };

  // 合并选项
  const mergedOptions = { ...defaultOptions, ...options };
  const { 
    panelId, 
    panelName, 
    onReceiveData, 
    exposedProperties, 
    panelType, 
    groups 
  } = mergedOptions;

  // 检查必要的参数
  if (!panelId) {
    console.error('无法初始化面板绑定: 缺少panelId参数');
    return {};
  }

  // 状态
  const bindingState = ref(CONNECTION_STATES.DISCONNECTED);
  const showBindingDialog = ref(false);
  const bindingAvailablePanels = ref([]);
  const selectedData = ref(mergedOptions.panelData || {});

  // 绑定对话框
  const openBindingDialog = async () => {
    try {
      // 检查必要的参数
      if (!panelId) {
        console.error('无法打开绑定对话框: 缺少panelId');
        return;
      }
      
      if (!panelName) {
        console.warn('面板名称未设置，将使用面板ID作为名称');
      }
      
      // 从面板注册表获取所有面板
      const allPanels = getRegistryPanels({ activeOnly: true });
      console.log('从注册表获取的面板列表:', allPanels);
      
      // 过滤掉当前面板自身
      const availablePanels = allPanels.filter(panel => panel.id !== panelId);
      console.log('可用于绑定的面板列表:', availablePanels);
      
      // 如果没有足够的面板可供绑定，提示用户
      if (!availablePanels.length) {
        console.error('没有找到可供绑定的面板。请确保您已打开至少两个面板并且它们都已正确注册。');
        alert('没有找到可供绑定的面板。请确保您已打开至少一个其他面板。');
        return;
      }
      
      // 构建对话框选项
      const sourcePanel = {
        id: panelId,
        name: panelName || panelId
      };
      
      console.log('准备传递的源面板对象:', sourcePanel);
      
      const dialogOptions = {
        title: '创建面板绑定',
        width: '580px',
        height: 'auto',
        transparent: false,
        disableClose: false
      };
      
      const componentOptions = {
        // 直接传递属性，不要嵌套在props中
        sourcePanel,
        availablePanels: availablePanels,
        availableProperties: exposedProperties || []
      };
      
      console.log('打开绑定对话框，传递组件参数:', componentOptions);
      
      const { app, dialog } = await openVueDialog(
        clientApi,
        '/plugins/SACAssetsManager/src/toolBox/feature/panelBinding/components/PanelBindingDialog.vue',
        'panel-binding-dialog',
        componentOptions,
        (bindingDialog) => {
          if (!bindingDialog) {
            console.error('绑定对话框创建失败');
            return;
          }
          
          // 扩展事件总线以处理特定事件
          const eventBus = bindingDialog.app.config.globalProperties.eventBus;
          const originalEmit = eventBus.emit;
          
          eventBus.emit = function(event, ...args) {
            console.log('绑定对话框事件:', event);
            
            if (event === 'binding-created') {
              handleBindingCreated(args[0]);
              if (typeof bindingDialog.destroy === 'function') {
                bindingDialog.destroy();
              } else if (typeof bindingDialog.close === 'function') {
                bindingDialog.close();
              } else {
                console.error('无法关闭对话框：未找到有效的关闭方法');
              }
            } else if (event === 'close') {
              if (typeof bindingDialog.destroy === 'function') {
                bindingDialog.destroy();
              } else if (typeof bindingDialog.close === 'function') {
                bindingDialog.close();
              } else {
                console.error('无法关闭对话框：未找到有效的关闭方法');
              }
            }
            
            // 调用原始emit
            return originalEmit.call(this, event, ...args);
          };
        },
        dialogOptions
      );
      
      return { app, dialog };
    } catch (error) {
      console.error('打开绑定对话框失败:', error);
      console.error('错误详情:', {
        panelId,
        panelName,
        exposedProperties,
        error: error.message,
        stack: error.stack
      });
      return null;
    }
  };

  // 处理绑定创建事件
  const handleBindingCreated = (event) => {
    console.log('创建绑定成功:', event);
    updateBindingState();
  };

  // 更新绑定状态
  const updateBindingState = () => {
    const bindings = getPanelBindings(panelId);
    if (bindings.length > 0) {
      bindingState.value = CONNECTION_STATES.CONNECTED;
    } else {
      bindingState.value = CONNECTION_STATES.DISCONNECTED;
    }
  };

  // 处理数据同步事件
  const handleDataSync = (event) => {
    const { sourcePanelId, targetPanelId, data } = event;
    
    // 如果当前面板是目标，则处理接收到的数据
    if (targetPanelId === panelId) {
      onReceiveData(data, sourcePanelId);
    }
  };

  // 当面板绑定状态改变时
  const handleBindingStateChange = (event) => {
    updateBindingState();
  };

  // 同步数据到绑定的面板
  const syncData = (data = null) => {
    // 如果未提供数据，使用当前状态
    const dataToSync = data || selectedData.value;
    if (!dataToSync) return false;
    
    // 更新面板活跃状态
    updatePanelState(panelId, { active: true });
    
    return syncPanelData(panelId, dataToSync);
  };

  // 当选定数据变化时，自动同步到绑定的面板
  watch(() => selectedData.value, (newData) => {
    if (newData) {
      syncData(newData);
    }
  }, { deep: true });

  // 生命周期钩子
  onMounted(() => {
    // 注册到面板注册表
    registerPanelToRegistry(panelId, {
      name: panelName,
      type: panelType,
      metadata: {
        exposedProperties,
        lastActiveAt: Date.now()
      },
      groups
    });
    
    console.log(`面板 "${panelName || panelId}" (${panelId}) 已注册到面板注册表`);
    
    // 监听绑定事件
    bindingEventBus.on(BINDING_EVENTS.PANEL_DATA_SYNC, handleDataSync);
    bindingEventBus.on(BINDING_EVENTS.PANEL_BOUND, handleBindingStateChange);
    bindingEventBus.on(BINDING_EVENTS.PANEL_UNBOUND, handleBindingStateChange);
    
    // 初始化状态
    updateBindingState();
    
    // 更新面板活跃状态
    updatePanelState(panelId, { active: true });
  });

  onUnmounted(() => {
    // 移除事件监听
    bindingEventBus.off(BINDING_EVENTS.PANEL_DATA_SYNC, handleDataSync);
    bindingEventBus.off(BINDING_EVENTS.PANEL_BOUND, handleBindingStateChange);
    bindingEventBus.off(BINDING_EVENTS.PANEL_UNBOUND, handleBindingStateChange);
    
    // 注销面板
    unregisterPanelFromRegistry(panelId);
    console.log(`面板 "${panelName || panelId}" (${panelId}) 已从面板注册表注销`);
  });

  // 返回API
  return {
    bindingState,
    showBindingDialog,
    openBindingDialog,
    syncData,
    updateBindingState,
    panelId
  };
} 