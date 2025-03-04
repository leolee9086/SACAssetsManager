import { safeExecute } from './useVirtualScrollHelpers.js';

/**
 * 创建插件系统 - 独立优化版
 * @returns {Object} 包含插件管理方法的对象
 */
export function createPluginSystem() {
  const plugins = new Map();
  const pluginFactories = new Map();
  
  // 注册插件工厂
  const registerPluginFactory = (name, factory, defaultEnabled = false) => {
    pluginFactories.set(name, { factory, defaultEnabled });
  };
  
  // 注册插件实例
  const registerPlugin = (name, pluginInstance) => {
    plugins.set(name, pluginInstance);
  };
  
  // 获取插件实例
  const getPlugin = (name) => plugins.get(name) || null;
  
  // 创建所有注册的插件
  const createPlugins = (engine, options) => {
    // 清除任何现有插件
    plugins.clear();
    
    // 从插件工厂创建插件实例
    for (const [name, { factory, defaultEnabled }] of pluginFactories.entries()) {
      // 检查选项中是否启用此插件
      const isEnabled = options[name] !== undefined ? !!options[name] : defaultEnabled;
      
      if (isEnabled) {
        try {
          const pluginInstance = factory(engine, options);
          registerPlugin(name, pluginInstance);
        } catch (error) {
          console.error(`创建插件 "${name}" 时发生错误:`, error);
        }
      }
    }
  };
  
  // 初始化所有插件
  const initializePlugins = (errorHandler) => {
    const initPromises = [];
    for (const [name, plugin] of plugins.entries()) {
      if (plugin.initialize && typeof plugin.initialize === 'function') {
        const promise = safeExecute(() => plugin.initialize(), errorHandler)
          .catch(error => {
            console.warn(`初始化插件 "${name}" 时发生错误:`, error);
            // 返回失败结果，但不中断其他插件初始化
            return { name, success: false, error };
          });
        initPromises.push(promise);
      }
    }
    return Promise.all(initPromises);
  };
  
  // 销毁所有插件
  const destroyPlugins = (errorHandler) => {
    const destroyPromises = [];
    for (const [name, plugin] of plugins.entries()) {
      if (plugin.destroy && typeof plugin.destroy === 'function') {
        const promise = safeExecute(() => plugin.destroy(), errorHandler)
          .catch(error => {
            console.warn(`销毁插件 "${name}" 时发生错误:`, error);
            return { name, success: false, error };
          });
        destroyPromises.push(promise);
      }
    }
    plugins.clear();
    return Promise.all(destroyPromises);
  };
  
  return {
    registerPluginFactory,
    registerPlugin,
    getPlugin,
    createPlugins,
    initializePlugins,
    destroyPlugins,
    getAllPlugins: () => Array.from(plugins.entries())
  };
}

/**
 * 创建标准插件模板 - 用于统一插件接口
 * @param {Object} engine - 引擎实例
 * @param {Object} options - 配置选项
 * @param {Object} implementation - 插件具体实现
 * @returns {Object} - 标准化的插件对象
 */
export function createStandardPlugin(engine, options, implementation) {
  if (!implementation) {
    throw new Error('插件实现不能为空');
  }

  // 提供默认实现，确保插件结构一致
  const defaultImplementation = {
    name: implementation.name || '未命名插件',
    version: implementation.version || '1.0.0',
    setup: () => ({}),  // 返回publicAPI的初始实现
    initialize: () => Promise.resolve(),
    destroy: () => Promise.resolve(),
    onError: (error) => console.error(`[${implementation.name || '插件'}]错误:`, error)
  };

  // 合并默认实现和具体实现
  const plugin = { ...defaultImplementation, ...implementation };
  
  // 创建公共API
  let publicAPI;
  try {
    publicAPI = plugin.setup(engine, options) || {};
  } catch (error) {
    console.error(`设置插件 "${plugin.name}" 时发生错误:`, error);
    publicAPI = {};
    plugin.onError(error);
  }
  
  return {
    name: plugin.name,
    version: plugin.version, 
    publicAPI,
    initialize: () => {
      try {
        return Promise.resolve(plugin.initialize(engine, options, publicAPI))
          .catch(error => {
            plugin.onError(error);
            return Promise.reject(error);
          });
      } catch (error) {
        plugin.onError(error);
        return Promise.reject(error);
      }
    },
    destroy: () => {
      try {
        return Promise.resolve(plugin.destroy(engine, options, publicAPI))
          .catch(error => {
            plugin.onError(error);
            return Promise.reject(error);
          });
      } catch (error) {
        plugin.onError(error);
        return Promise.reject(error);
      }
    }
  };
} 