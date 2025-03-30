/**
 * Vue组件加载工具
 * 
 * 提供用于动态加载Vue组件的工具函数
 * 支持SFC文件加载、组件缓存和热重载
 */

// 导入Vue和SFC Loader
import * as Vue from '../../../../static/vue.esm-browser.js';
import * as SfcLoader from '../../../../static/vue3-sfc-loader.esm.js';
import { plugin } from '../../../../source/asyncModules.js';

// 导入子模块
import { 初始化模块缓存, 数据库缓存管理器 } from './useSFC/forVueCache.js';
import { 加载历史记录 } from './useSFC/forVueError.js';
import { 创建加载器选项, 初始化Vue应用, 创建Vue界面, 增强加载模块 } from './useSFC/forVueApp.js';
import { 创建组件模板, 加载组件为节点同步 } from './useSFC/forVueUtils.js';

// 初始化模块缓存
初始化模块缓存(Vue, { runtime: { plugin } });

/**
 * 初始化Vue应用
 * @param {string|Object} appURL - 组件URL或组件对象
 * @param {string} name - 组件名称
 * @param {Object} mixinOptions - 附加选项
 * @param {string} directory - 热重载目录
 * @param {Object} data - 应用数据
 * @returns {Promise<Object>} Vue应用实例
 */
export const initVueApp = async (appURL, name = '', mixinOptions = {}, directory = '', data = {}) => {
  return await 初始化Vue应用(appURL, name, mixinOptions, directory, data, Vue, SfcLoader);
};

/**
 * 创建Vue界面组件
 * @param {Object} container - 容器元素或Tab对象
 * @param {string} componentPath - 组件路径
 * @param {string} [containerId=''] - 容器ID
 * @param {Object} [extraData={}] - 额外数据
 * @returns {Promise<Vue.App>} Vue应用实例
 */
export const createVueInterface = async (container, componentPath, containerId = '', extraData = {}) => {
  return await 创建Vue界面(container, componentPath, containerId, extraData, Vue, SfcLoader);
};

/**
 * 清除组件缓存
 * @returns {Promise<void>}
 */
export const clearComponentCache = async () => {
  await 数据库缓存管理器.清空();
  console.log('组件缓存已清除');
};

/**
 * 创建一个标记模板函数，用于生成组件模板
 * @param {Array<string>} propNames - 组件的props名称数组
 * @returns {Function} 标记模板函数
 */
export const cc = 创建组件模板;

/**
 * 异步加载Vue组件，并通过NodeSync接口返回
 * @param {string} componentURL - 组件的URL
 * @returns {Object} 包含getNodeDefineScope和getComponent方法的对象
 */
export const loadVueComponentAsNodeSync = (componentURL) => {
  const options = 创建加载器选项({}, Vue, SfcLoader);
  const enhancedLoader = 增强加载模块(SfcLoader.loadModule);
  const nodeSync = 加载组件为节点同步(componentURL, enhancedLoader, options);
  
  return {
    async getNodeDefineScope(id) {
      return await nodeSync.获取节点定义作用域(id);
    },
    
    async getComponent(scope) {
      return await nodeSync.获取组件(scope);
    }
  };
};

// 导出默认对象以保持兼容性
export default {
  initVueApp,
  createVueInterface,
  clearComponentCache,
  cc,
  loadVueComponentAsNodeSync
}; 