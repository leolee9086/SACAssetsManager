/**
 * 思源笔记环境依赖集中管理模块
 * 集中管理所有与思源笔记环境相关的访问
 * @module useSiyuan
 */

// 导入已有的思源相关工具
import { 获取思源核心服务端口号, 获取插件服务端口号 } from '../base/forNetWork/forPort/forSiyuanPort.js';
import { dialog, openSiyuanTab, openSiyuanWindow, document, asset, search, card } from './useSiyuanFrontEndApi.js';
import { 从思源工作空间路径加载AI配置, initializeAIConfig } from './useSiyuanConfig.js';
import * as menuTools from './forSiyuan/useSiyuanMenu.js';
import * as dialogTools from './forSiyuan/useSiyuanDialog.js';
import * as systemApi from './forSiyuan/useSiyuanSystem.js';
import * as blockApi from './forSiyuan/useSiyuanBlock.js';
import * as workspaceApi from './forSiyuan/useSiyuanWorkspace.js';
import * as notebookApi from './forSiyuan/useSiyuanNotebook.js';
import * as assetApi from './forSiyuan/useSiyuanAsset.js';

/**
 * 系统环境工具，提供访问思源系统环境的方法
 * @namespace system
 */
export const system = {
  /**
   * 获取思源工作空间路径
   * @returns {string} 工作空间路径
   */
  获取工作空间路径: () => window.siyuan?.config?.system?.workspaceDir || '',
  
  /**
   * 获取思源应用版本
   * @returns {string} 应用版本
   */
  获取应用版本: () => window.siyuan?.config?.system?.kernelVersion || '',
  
  /**
   * 获取思源语言设置
   * @returns {string} 语言设置，如 'zh_CN'
   */
  获取语言设置: () => window.siyuan?.config?.lang || 'zh_CN',
  
  /**
   * 获取思源操作系统类型
   * @returns {string} 操作系统类型
   */
  获取操作系统: () => window.siyuan?.config?.system?.os || '',
  
  /**
   * 获取思源应用模式
   * @returns {string} 应用模式，如 'desktop', 'mobile'
   */
  获取应用模式: () => window.siyuan?.config?.system?.mode || '',
  
  /**
   * 获取思源数据目录
   * @returns {string} 数据目录路径
   */
  获取数据目录: () => {
    const workspaceDir = system.获取工作空间路径();
    return workspaceDir ? `${workspaceDir}/data` : '';
  },
  
  /**
   * 获取思源资源目录
   * @returns {string} 资源目录路径
   */
  获取资源目录: () => {
    const dataDir = system.获取数据目录();
    return dataDir ? `${dataDir}/assets` : '';
  },
  
  /**
   * 获取系统字体列表（异步）
   * @returns {Promise<string[]>} 字体列表
   */
  获取系统字体列表: systemApi.获取系统字体,
  
  /**
   * 获取服务端版本号（异步）
   * @returns {Promise<string>} 版本号
   */
  获取服务端版本号: systemApi.获取版本号,
  
  /**
   * 获取服务器时间（异步）
   * @returns {Promise<number>} 服务器时间戳
   */
  获取服务器时间: systemApi.获取当前时间戳,
  
  /**
   * 重载UI
   * @returns {Promise<Object>} 请求结果
   */
  重载UI: systemApi.重载UI,
  
  /**
   * 退出应用
   * @param {Object} [options] - 退出选项
   * @returns {Promise<Object>} 请求结果
   */
  退出应用: systemApi.退出应用
};

/**
 * 插件环境工具，提供访问思源插件环境的方法
 * @namespace plugin
 */
export const plugin = {
  /**
   * 获取当前插件ID
   * @returns {string} 插件ID
   */
  获取当前插件ID: () => {
    // 尝试从URL获取
    const url = new URL(window.location.href);
    const pluginId = url.searchParams.get('id');
    return pluginId || '';
  },
  
  /**
   * 获取插件实例
   * @param {string} [pluginId] 插件ID，不提供则获取当前插件
   * @returns {Object|null} 插件实例
   */
  获取插件实例: (pluginId) => {
    const id = pluginId || plugin.获取当前插件ID();
    return window.siyuan?.ws?.app?.plugins?.find(p => p.name === id) || null;
  },
  
  /**
   * 获取所有已安装插件
   * @returns {Array} 插件列表
   */
  获取所有插件: () => window.siyuan?.ws?.app?.plugins || []
};

/**
 * UI相关工具，提供访问思源UI组件的方法
 * @namespace ui
 */
export const ui = {
  /**
   * 获取思源语言文本
   * @param {string} key 语言键名
   * @returns {string} 对应语言的文本
   */
  获取语言文本: (key) => window.siyuan?.languages?.[key] || key,
  
  /**
   * 显示通知
   * @param {Object} options 通知选项
   * @param {string} options.title 通知标题
   * @param {string} options.body 通知内容
   * @param {string} [options.type='info'] 通知类型，可选 'info', 'success', 'warning', 'error'
   * @returns {void}
   */
  显示通知: (options) => {
    if (window.siyuan?.notifications) {
      window.siyuan.notifications.show(options);
    }
  },
  
  /**
   * 创建确认对话框并返回Promise
   * @param {string} 标题 - 对话框标题
   * @param {string} 内容 - 对话框内容
   * @returns {Promise<boolean>} 用户确认返回true，取消返回false
   */
  确认对话框: dialogTools.confirmAsPromise,
  
  /**
   * 创建输入对话框
   * @param {Object} 选项 - 对话框选项
   * @returns {Promise<string|null>} 用户输入的值，取消则返回null
   */
  输入对话框: dialogTools.创建输入对话框,
  
  /**
   * 创建自定义对话框
   * @param {Object} 选项 - 对话框选项
   * @returns {Object} 对话框实例
   */
  创建对话框: dialogTools.创建简单对话框,
  
  /**
   * 创建菜单
   * @param {string} 菜单ID - 菜单ID
   * @param {Object} 位置 - 菜单位置
   * @param {Function} 菜单构建函数 - 菜单构建函数
   * @returns {Object} 菜单实例
   */
  创建菜单: menuTools.创建并打开思源原生菜单
};

/**
 * 文件系统命名空间，提供访问思源文件系统的方法
 * @namespace fs
 */
export const fs = {
  /**
   * 工作区操作
   */
  工作区: workspaceApi,
  
  /**
   * 笔记本操作
   */
  笔记本: notebookApi,
  
  /**
   * 资源文件操作
   */
  资源: assetApi,
  
  /**
   * 文档块操作
   */
  块: blockApi,
  
  /**
   * 获取工作区配置
   * @returns {Promise<Object>} 工作区配置
   */
  获取工作区配置: workspaceApi.获取工作区配置,
  
  /**
   * 获取笔记本列表
   * @returns {Promise<Object>} 笔记本列表
   */
  获取笔记本列表: notebookApi.获取笔记本列表,
  
  /**
   * 获取文件树列表
   * @param {boolean} [排序=false] - 是否按照排序进行返回
   * @returns {Promise<Object>} 文件树列表
   */
  获取文件树列表: workspaceApi.获取文件树列表,
  
  /**
   * 上传资源文件
   * @param {File|Blob} 文件 - 要上传的文件对象
   * @param {string} [笔记本ID] - 目标笔记本ID，不指定则使用当前打开的笔记本
   * @returns {Promise<Object>} 上传结果
   */
  上传资源文件: assetApi.上传资源文件,
  
  /**
   * 列出资源文件
   * @param {string} [路径='/'] - 目录路径，默认为根目录
   * @returns {Promise<Object>} 资源文件列表
   */
  列出资源文件: assetApi.列出资源文件
};

/**
 * 思源API命名空间，提供对思源系统API的访问
 * @namespace api
 */
export const api = {
  system: systemApi,
  dialog: dialogTools,
  menu: menuTools,
  block: blockApi,
  workspace: workspaceApi,
  notebook: notebookApi,
  asset: assetApi
};

/**
 * 导出已有的工具函数
 */
export {
  获取思源核心服务端口号, 
  获取插件服务端口号,
  dialog,
  openSiyuanTab as 打开思源标签页,
  openSiyuanWindow as 打开思源窗口,
  document as 文档,
  asset as 资源,
  search as 搜索,
  card as 卡片,
  从思源工作空间路径加载AI配置,
  initializeAIConfig as 初始化AI配置,
  menuTools,
  dialogTools,
  systemApi,
  blockApi,
  workspaceApi,
  notebookApi,
  assetApi
};

/**
 * 检查思源环境
 * @returns {boolean} 是否在思源环境中
 */
export const 检查思源环境 = () => {
  return typeof window !== 'undefined' && !!window.siyuan;
}; 