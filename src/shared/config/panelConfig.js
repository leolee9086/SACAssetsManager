/**
 * 面板配置
 * 定义系统中使用的停靠面板配置，包括图标、位置、组件路径和标题
 */

/**
 * 停靠面板配置
 * @type {Object}
 */
export const 停靠面板配置 = Object.freeze({
  /** 资源信息面板 */
  AssetsPanel: {
    /** 面板图标 */
    icon: "iconInfo",
    /** 面板位置 */
    position: "LeftBottom",
    /** 面板组件路径 */
    component: '/plugins/SACAssetsManager/source/UI/pannels/assetInfoPanel/index.vue',
    /** 面板标题 */
    title: "SACAssetsPanel",
    /** 面板属性名，用于插件实例注册 */
    propertyName: "assetsPanelDock"
  },
  
  /** 收藏面板 */
  CollectionPanel: {
    /** 面板图标 */
    icon: "iconDatabase",
    /** 面板位置 */
    position: "RightBottom",
    /** 面板组件路径 */
    component: '/plugins/SACAssetsManager/source/UI/components/collectionPanel.vue',
    /** 面板标题 */
    title: "SACAssetsCollectionPanel",
    /** 面板属性名，用于插件实例注册 */
    propertyName: "collectionPanelDock"
  },
  
  /** 面板列表 */
  PannelListPanel: {
    /** 面板图标 */
    icon: "iconPanel",
    /** 面板位置 */
    position: "RightBottom",
    /** 面板组件路径 */
    component: '/plugins/SACAssetsManager/source/UI/pannels/pannelList/index.vue',
    /** 面板标题 */
    title: "面板列表",
    /** 面板属性名，用于插件实例注册 */
    propertyName: "pannelListDock"
  }
});

/**
 * 创建停靠面板
 * 通用的停靠面板创建函数
 * 
 * @param {Object} plugin 插件实例
 * @param {string} dockType 面板类型
 * @param {Function} 插入UI容器函数 用于插入面板容器的函数
 * @returns {Object} dock实例
 */
export function 创建停靠面板(plugin, dockType, 插入UI容器函数) {
  const config = 停靠面板配置[dockType];
  
  if (!config) {
    console.error(`未找到停靠面板配置: ${dockType}`);
    return null;
  }
  
  const dock = plugin.addDock({
    config: {
      icon: config.icon,
      position: config.position,
      size: { width: 200, height: 0 },
      title: config.title
    },
    data: { text: "" },
    type: dockType,
    init() {
      const container = 插入UI容器函数(this.element);
      
      // 动态导入Vue组件加载器
      import('/plugins/SACAssetsManager/src/toolBox/feature/useVue/vueComponentLoader.js').then(
        async module => {
          try {
            // 使用await等待异步函数完成
            const app = await module.initVueApp(config.component);
            // 确保app存在且mount函数可用
            if (app && typeof app.mount === 'function') {
              app.mount(container);
            } else {
              console.error('Vue应用创建失败', app);
            }
          } catch (error) {
            console.error('加载Vue组件失败:', error);
          }
        }
      );
    }
  });
  
  return dock;
}

/**
 * 注册所有停靠面板
 * 在插件实例上注册所有配置的停靠面板
 * 
 * @param {Object} plugin 插件实例
 * @param {Function} 插入UI容器函数 用于插入面板容器的函数
 */
export function 注册所有停靠面板(plugin, 插入UI容器函数) {
  Object.entries(停靠面板配置).forEach(([dockType, config]) => {
    plugin[config.propertyName] = 创建停靠面板(plugin, dockType, 插入UI容器函数);
  });
}

// 为保持向后兼容，导出旧的常量名
export const DOCK_CONFIGS = 停靠面板配置; 