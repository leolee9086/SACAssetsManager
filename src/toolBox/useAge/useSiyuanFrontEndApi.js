/**
 * 思源笔记前端API封装
 * 采用函数式风格，提供更声明式的接口
 * @module useSiyuanFrontEndApi
 */

/**
 * 对话框相关函数
 * @namespace dialog
 */
export const dialog = {
  /**
   * 显示消息
   * @function showMessage
   * @param {string} message - 消息内容
   * @param {number} [timeout] - 消息显示时间，单位毫秒
   * @returns {void}
   */
  showMessage: (message, timeout) => window.siyuan.API.showMessage(message, timeout),
  
  /**
   * 确认对话框
   * @function confirm
   * @param {string} title - 对话框标题
   * @param {string} text - 对话框内容
   * @param {Function} confirmCallback - 确认按钮回调函数
   * @param {Function} [cancelCallback] - 取消按钮回调函数
   * @returns {void}
   */
  confirm: (title, text, confirmCallback, cancelCallback) => 
    window.siyuan.API.confirm(title, text, confirmCallback, cancelCallback),
  
  /**
   * 创建自定义对话框
   * @function createDialog
   * @param {Object} options - 对话框选项
   * @returns {Dialog} 对话框实例
   */
  createDialog: (options) => new window.siyuan.API.Dialog(options)
};

/**
 * 打开思源标签页
 * @function openSiyuanTab
 * @param {Object} options - 标签页选项
 * @param {Object} [options.doc] - 文档选项
 * @param {string} [options.doc.id] - 块ID
 * @param {Array} [options.doc.action] - 操作列表，如cb-get-all, cb-get-focus, cb-get-hl
 * @param {boolean} [options.doc.zoomIn] - 是否缩放
 * @param {Object} [options.pdf] - PDF选项
 * @param {string} [options.pdf.path] - PDF路径
 * @param {number} [options.pdf.page] - PDF页码
 * @param {string} [options.pdf.id] - File Annotation ID
 * @param {Object} [options.asset] - 资源文件选项
 * @param {string} [options.asset.path] - 资源文件路径
 * @param {Object} [options.search] - 搜索选项
 * @param {Object} [options.card] - 卡片选项
 * @param {string} [options.card.type] - 卡片类型
 * @param {string} [options.card.id] - 卡片ID
 * @param {string} [options.card.title] - 卡片标题
 * @param {Object} [options.custom] - 自定义选项
 * @param {string} [options.position="right"] - 标签页位置，可选值为right或bottom
 * @param {boolean} [options.keepCursor] - 是否跳转到新标签页
 * @param {boolean} [options.removeCurrentTab] - 在当前页签打开时是否移除原有页签
 * @param {Function} [options.afterOpen] - 打开后回调函数
 * @returns {Tab} 标签页实例
 */
export const openSiyuanTab = (options) => {
  // 确保options包含必要的app属性
  const completeOptions = { 
    app: window.siyuan.app,
    ...options
  };
  return window.siyuan.API.openTab(completeOptions);
};

/**
 * 打开思源窗口
 * @function openSiyuanWindow
 * @param {Object} options - 窗口选项
 * @param {Object} [options.position] - 窗口位置
 * @param {number} [options.height] - 窗口高度
 * @param {number} [options.width] - 窗口宽度
 * @param {Tab} [options.tab] - 标签页实例
 * @param {Object} [options.doc] - 文档选项
 * @param {string} [options.doc.id] - 块ID
 * @returns {void}
 */
export const openSiyuanWindow = (options) => {
  return window.siyuan.API.openWindow(options);
};

/**
 * 文档操作相关
 * @namespace document
 */
export const document = {
  /**
   * 通过ID打开文档
   * @function openById
   * @param {string} id - 块ID
   * @param {Array} [action=[]] - 操作列表
   * @returns {Tab} 标签页实例
   */
  openById: (id, action = []) => openSiyuanTab({
    doc: {
      id,
      action
    }
  }),
  
  /**
   * 通过ID打开文档并缩放
   * @function openByIdAndZoom
   * @param {string} id - 块ID
   * @param {Array} [action=[]] - 操作列表
   * @returns {Tab} 标签页实例
   */
  openByIdAndZoom: (id, action = []) => openSiyuanTab({
    doc: {
      id,
      action,
      zoomIn: true
    }
  }),
  
  /**
   * 在移动端打开文档
   * @function openInMobile
   * @param {string} id - 块ID
   * @returns {void}
   */
  openInMobile: (id) => window.siyuan.API.openMobileFileById(id)
};

/**
 * 资源文件操作
 * @namespace asset
 */
export const asset = {
  /**
   * 打开资源文件
   * @function openAssetFile
   * @param {string} path - 资源文件路径
   * @returns {Tab} 标签页实例
   */
  openAssetFile: (path) => openSiyuanTab({
    asset: {
      path
    }
  }),
  
  /**
   * 打开PDF文件
   * @function openPDF
   * @param {string} path - PDF文件路径
   * @param {number} [page] - PDF页码
   * @returns {Tab} 标签页实例
   */
  openPDF: (path, page) => openSiyuanTab({
    pdf: {
      path,
      page
    }
  })
};

/**
 * 搜索相关
 * @namespace search
 */
export const search = {
  /**
   * 打开搜索页面
   * @function openSearchPage
   * @param {string} keyword - 搜索关键词
   * @param {Array} [scope=[]] - 搜索范围，块ID路径
   * @returns {Tab} 标签页实例
   */
  openSearchPage: (keyword, scope = []) => openSiyuanTab({
    search: {
      k: keyword,
      idPath: scope,
      hPath: ""
    }
  })
};

/**
 * 卡片相关
 * @namespace card
 */
export const card = {
  /**
   * 打开间隔重复页面
   * @function openSpacedRepetition
   * @param {string} type - 卡片类型
   * @param {string} [id] - 文档或笔记本ID，type为all时可不传
   * @param {string} [title] - 文档或笔记本名称，type为all时可不传
   * @returns {Tab} 标签页实例
   */
  openSpacedRepetition: (type, id, title) => openSiyuanTab({
    card: {
      type,
      id,
      title
    }
  })
};

/**
 * 布局和编辑器相关
 * @namespace layout
 */
export const layout = {
  /**
   * 获取所有编辑器
   * @function getAllEditors
   * @returns {Array<Protyle>} 编辑器实例数组
   */
  getAllEditors: () => window.siyuan.API.getAllEditor(),
  
  /**
   * 获取所有模型
   * @function getAllModels
   * @returns {Array<Model>} 模型实例数组
   */
  getAllModels: () => window.siyuan.API.getAllModels(),
  
  /**
   * 根据类型获取模型
   * @function getModelByDockType
   * @param {string} type - 停靠类型
   * @returns {Model} 模型实例
   */
  getModelByDockType: (type) => window.siyuan.API.getModelByDockType(type)
};

/**
 * 系统操作
 * @namespace system
 */
export const system = {
  /**
   * 锁屏
   * @function lockScreen
   * @returns {void}
   */
  lockScreen: () => window.siyuan.API.lockScreen(),
  
  /**
   * 退出思源笔记
   * @function exit
   * @returns {void}
   */
  exit: () => window.siyuan.API.exitSiYuan(),
  
  /**
   * 打开设置
   * @function openSettings
   * @returns {void}
   */
  openSettings: () => window.siyuan.API.openSetting(),
  
  /**
   * 获取前端环境
   * @function getFrontend
   * @returns {string} 前端环境，如"browser", "desktop", "mobile"等
   */
  getFrontend: () => window.siyuan.API.getFrontend(),
  
  /**
   * 获取后端环境
   * @function getBackend
   * @returns {string} 后端环境，如"windows", "linux", "darwin"等
   */
  getBackend: () => window.siyuan.API.getBackend()
};

/**
 * 工具函数
 * @namespace utils
 */
export const utils = {
  /**
   * 更新快捷键提示
   * @function updateHotkeyTip
   * @param {string} text - 包含快捷键的文本
   * @returns {string} 处理后的文本
   */
  updateHotkeyTip: (text) => window.siyuan.API.adaptHotkey(text),
  
  /**
   * 平台兼容性工具
   * @constant platformUtils
   * @type {Object}
   */
  platformUtils: window.siyuan.API.platformUtils
};

/**
 * 插件相关
 * @namespace plugin
 */
export const plugin = {
  /**
   * 创建插件设置
   * @function createSetting
   * @param {Plugin} plugin - 插件实例
   * @returns {Setting} 设置实例
   */
  createSetting: (plugin) => new window.siyuan.API.Setting(plugin),
  
  /**
   * 创建菜单
   * @function createMenu
   * @param {string} id - 菜单ID
   * @returns {Menu} 菜单实例
   */
  createMenu: (id) => new window.siyuan.API.Menu(id)
};

/**
 * 常量导出
 * @constant constants
 * @type {Object}
 */
export const constants = window.siyuan.API.Constants;

/**
 * 核心API类
 * @namespace coreAPI
 */
export const coreAPI = {
  /**
   * Protyle编辑器
   * @constant Protyle
   * @type {Class}
   */
  Protyle: window.siyuan.API.Protyle,
  
  /**
   * 插件类
   * @constant Plugin
   * @type {Class}
   */
  Plugin: window.siyuan.API.Plugin,
  
  /**
   * 对话框类
   * @constant Dialog
   * @type {Class}
   */
  Dialog: window.siyuan.API.Dialog,
  
  /**
   * 菜单类
   * @constant Menu
   * @type {Class}
   */
  Menu: window.siyuan.API.Menu,
  
  /**
   * 设置类
   * @constant Setting
   * @type {Class}
   */
  Setting: window.siyuan.API.Setting
};
