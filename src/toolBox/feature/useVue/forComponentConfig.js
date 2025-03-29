/**
 * @fileoverview Vue组件配置相关的工具函数
 * 提供自动化构建Vue组件配置的实用函数
 */

import { 同步获取文件夹列表 } from '../../base/forNetWork/forFileSystem.js';

/**
 * 根据目录结构自动构建Tab配置
 * @param {string} 基础路径 - 组件目录的基础路径
 * @param {string} [组件路径前缀='/plugins/SACAssetsManager'] - 组件路径的前缀
 * @param {string} [默认文件名='index.vue'] - 默认组件文件名
 * @param {function} [配置转换函数] - 可选的自定义转换函数，用于处理每个配置项
 * @returns {Object} Tab配置对象
 */
export function 构建组件配置(基础路径, 组件路径前缀 = '/plugins/SACAssetsManager', 默认文件名 = 'index.vue', 配置转换函数) {
  const 配置项 = {};
  
  try {
    const 文件列表 = 同步获取文件夹列表(基础路径);
    
    文件列表.forEach(文件信息 => {
      if (文件信息.isDir) {
        const 文件夹名 = 文件信息.name;
        const 组件名 = `${文件夹名}Tab`;
        
        let 配置 = {
          component: `${组件路径前缀}${基础路径}/${文件夹名}/${默认文件名}`,
          containerId: 文件夹名
        };
        
        // 如果提供了转换函数，应用它
        if (typeof 配置转换函数 === 'function') {
          配置 = 配置转换函数(配置, 文件夹名, 文件信息);
        }
        
        配置项[组件名] = 配置;
      }
    });
  } catch (错误) {
    console.error('构建组件配置时出错:', 错误);
  }
  
  return 配置项;
}

/**
 * 构建停靠面板配置
 * @param {string} 基础路径 - 组件目录的基础路径
 * @param {Object} 默认配置 - 默认的面板配置
 * @param {string} [组件路径前缀='/plugins/SACAssetsManager'] - 组件路径的前缀
 * @returns {Object} 停靠面板配置对象
 */
export function 构建停靠面板配置(基础路径, 默认配置 = {}, 组件路径前缀 = '/plugins/SACAssetsManager') {
  const 配置项 = {};
  
  try {
    const 文件列表 = 同步获取文件夹列表(基础路径);
    
    文件列表.forEach(文件信息 => {
      if (文件信息.isDir) {
        const 文件夹名 = 文件信息.name;
        const panelId = `${文件夹名}Panel`;
        
        配置项[panelId] = {
          icon: 默认配置.icon || 'iconPanel',
          position: 默认配置.position || 'LeftBottom',
          component: `${组件路径前缀}${基础路径}/${文件夹名}/index.vue`,
          title: 文件夹名,
          propertyName: `${文件夹名}PanelDock`,
          ...默认配置
        };
      }
    });
  } catch (错误) {
    console.error('构建停靠面板配置时出错:', 错误);
  }
  
  return 配置项;
}

/**
 * 创建动态导入组件的加载函数
 * @param {string} 组件路径 - 组件的路径
 * @param {Object} [配置项={}] - 传递给组件的配置项
 * @returns {Function} 加载组件的函数
 */
export function 创建组件加载器(组件路径, 配置项 = {}) {
  return async (容器元素) => {
    try {
      const 模块 = await import(组件路径);
      if (模块.default || 模块.createApp) {
        const Vue = await import('/plugins/SACAssetsManager/static/vue.esm-browser.js');
        const app = Vue.createApp(模块.default || 模块, 配置项);
        app.mount(容器元素);
        return app;
      } else if (模块.initVueApp) {
        const app = 模块.initVueApp(组件路径, 配置项);
        app.mount(容器元素);
        return app;
      } else {
        console.error(`组件 ${组件路径} 不符合预期的格式`);
        return null;
      }
    } catch (错误) {
      console.error(`加载组件 ${组件路径} 时出错:`, 错误);
      return null;
    }
  };
} 