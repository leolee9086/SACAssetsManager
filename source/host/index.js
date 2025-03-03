/***
 * 一个思源笔记大型插件的宿主层
 * ,实际上插件的体量可能比软件本体还大,,包含类似"插件的插件"(我们称为扩展)的功能, 
 * 只是借助软件平台分发和作为一些UI元素和功能的宿主层以及利用软件的electron环境,
 * 因此完整实现一整套扩展接口
 * 为插件实现思源前后端API的更高层次抽象
 * 将应用特定的api转发到自己的私有api
 * 以避免应用升级造成问题之后修复困难,并方便移植插件
 * 由于扩展框架本身由插件加载,而插件会在软件本身的每一个窗口加载
 * 所以我们需要一些优化处理
 * 另外还需要处理在无法触及真正的主进程的前提下,如何在渲染进程完成功能
 * 如果实在无法完成,hack主线程的main.js也是可以接受的,但是必须非常小心谨慎
 */

import { 
  initGlobalRouter, 
  getGlobalRouter 
} from '../utils/feature/forGlobalRouter.js';

// 导入核心模块
import { ExtensionManager } from './core/extensions.js';
import { EventBus } from './core/events.js';
import { UIManager } from './core/ui.js';
import { StorageManager } from './core/storage.js';
import { PermissionManager } from './core/permissions.js';
import { ResourceLoader } from './core/resources.js';
import { LogManager } from './core/logging.js';
import { ConfigManager } from './core/config.js';
import { CommandRegistry } from './core/commands.js';
import { ServiceRegistry } from './core/services.js';

// 导入平台适配层
import { SiyuanPlatformAdapter } from './platform/siyuan.js';
// 未来可添加其他平台适配器
// import { VSCodePlatformAdapter } from './platform/vscode.js';
// import { ObsidianPlatformAdapter } from './platform/obsidian.js';

// 框架版本
export const FRAMEWORK_VERSION = '1.0.0';

// 平台类型
export const PlatformType = {
  SIYUAN: 'siyuan',
  // 预留其他平台
  VSCODE: 'vscode',
  OBSIDIAN: 'obsidian',
  CUSTOM: 'custom'
};

/**
 * 检测当前运行平台
 */
function detectPlatform() {
  if (typeof window !== 'undefined') {
    if (window.siyuan) return PlatformType.SIYUAN;
    // 添加其他平台检测
  }
  return PlatformType.CUSTOM;
}

/**
 * 扩展框架主类
 */
class ExtensionFramework {
  /**
   * 构造函数
   * @param {Object} options 框架配置选项
   */
  constructor(options = {}) {
    this.options = {
      enforceDocumentation: true,
      debug: false,
      autoLoadExtensions: true,
      ...options
    };
    
    // 检测平台
    this.platformType = options.platform || detectPlatform();
    console.log(`检测到运行平台: ${this.platformType}`);
    
    // 初始化全局路由器
    this.router = initGlobalRouter({
      enforceDocumentation: this.options.enforceDocumentation
    });
    
    // 创建主事件总线
    this.events = new EventBus();
    
    // 创建日志管理器
    this.logging = new LogManager({
      debug: this.options.debug,
      prefix: '[扩展框架]'
    });
    
    // 初始化平台适配器
    this.initPlatformAdapter();
    
    // 初始化核心管理器
    this.initCoreManagers();
    
    // 注册核心API路由
    this.registerCoreApiRoutes();
    
    this.logging.info('扩展框架初始化完成', { version: FRAMEWORK_VERSION });
  }
  
  /**
   * 初始化平台适配器
   */
  initPlatformAdapter() {
    switch (this.platformType) {
      case PlatformType.SIYUAN:
        this.platform = new SiyuanPlatformAdapter(this);
        break;
      // 其他平台适配器
      default:
        throw new Error(`不支持的平台类型: ${this.platformType}`);
    }
    
    this.logging.info('平台适配器初始化完成', { platform: this.platformType });
  }
  
  /**
   * 初始化核心管理器
   */
  initCoreManagers() {
    // 配置管理器
    this.config = new ConfigManager(this);
    
    // 存储管理器
    this.storage = new StorageManager(this);
    
    // 命令注册表
    this.commands = new CommandRegistry(this);
    
    // UI管理器
    this.ui = new UIManager(this);
    
    // 权限管理器
    this.permissions = new PermissionManager(this);
    
    // 资源加载器
    this.resources = new ResourceLoader(this);
    
    // 服务注册表
    this.services = new ServiceRegistry(this);
    
    // 扩展管理器 (最后初始化，因为它依赖上面所有管理器)
    this.extensions = new ExtensionManager(this);
    
    this.logging.info('核心管理器初始化完成');
  }
  
  /**
   * 注册核心API路由
   */
  registerCoreApiRoutes() {
    // 各个管理器注册各自的API路由
    // 这些会由各管理器内部实现
    
    this.logging.info('核心API路由注册完成');
  }
  
  /**
   * 启动框架
   * @param {Object} context 启动上下文
   * @returns {Promise<void>}
   */
  async start(context = {}) {
    try {
      this.logging.info('扩展框架启动中...');
      
      // 初始化平台
      await this.platform.initialize(context);
      
      // 加载配置
      await this.config.load();
      
      // 初始化存储
      await this.storage.initialize();
      
      // 注册UI扩展点
      this.ui.registerDefaultExtensionPoints();
      
      // 如果配置为自动加载扩展，则加载扩展
      if (this.options.autoLoadExtensions) {
        await this.extensions.loadAllExtensions();
      }
      
      // 触发框架启动完成事件
      this.events.emit('framework:started', { timestamp: Date.now() });
      
      this.logging.info('扩展框架启动完成');
      return true;
    } catch (error) {
      this.logging.error('扩展框架启动失败', error);
      this.events.emit('framework:error', { 
        phase: 'startup', 
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
  
  /**
   * 停止框架
   * @returns {Promise<void>}
   */
  async stop() {
    try {
      this.logging.info('扩展框架停止中...');
      
      // 卸载所有扩展
      await this.extensions.unloadAllExtensions();
      
      // 关闭存储
      await this.storage.close();
      
      // 触发框架停止事件
      this.events.emit('framework:stopped', { timestamp: Date.now() });
      
      this.logging.info('扩展框架已停止');
      return true;
    } catch (error) {
      this.logging.error('扩展框架停止时出错', error);
      throw error;
    }
  }
  
  /**
   * 获取API客户端
   * @returns {Object} API客户端
   */
  getApiClient() {
    return {
      // 扩展管理相关API
      extensions: {
        getAll: () => this.extensions.getAllExtensions(),
        get: (id) => this.extensions.getExtension(id),
        install: (source) => this.extensions.installExtension(source),
        uninstall: (id) => this.extensions.uninstallExtension(id),
        enable: (id) => this.extensions.enableExtension(id),
        disable: (id) => this.extensions.disableExtension(id),
        reload: (id) => this.extensions.reloadExtension(id)
      },
      
      // 命令相关API
      commands: {
        execute: (id, ...args) => this.commands.execute(id, ...args),
        register: (id, handler, metadata) => this.commands.register(id, handler, metadata),
        getAll: () => this.commands.getAll()
      },
      
      // 事件相关API
      events: {
        on: (event, handler) => this.events.on(event, handler),
        off: (event, handler) => this.events.off(event, handler),
        once: (event, handler) => this.events.once(event, handler),
        emit: (event, data) => this.events.emit(event, data)
      },
      
      // UI相关API
      ui: {
        registerView: (viewId, factory, options) => this.ui.registerView(viewId, factory, options),
        showView: (viewId, ...args) => this.ui.showView(viewId, ...args),
        hideView: (viewId) => this.ui.hideView(viewId),
        registerMenuItem: (location, item) => this.ui.registerMenuItem(location, item),
        showMessage: (message, options) => this.ui.showMessage(message, options),
        showConfirm: (message, options) => this.ui.showConfirm(message, options),
        showPrompt: (message, options) => this.ui.showPrompt(message, options)
      },
      
      // 存储相关API
      storage: {
        getItem: (key) => this.storage.getItem(key),
        setItem: (key, value) => this.storage.setItem(key, value),
        removeItem: (key) => this.storage.removeItem(key),
        getItems: (pattern) => this.storage.getItems(pattern),
        clear: () => this.storage.clear()
      },
      
      // 配置相关API
      config: {
        get: (key, defaultValue) => this.config.get(key, defaultValue),
        set: (key, value) => this.config.set(key, value),
        remove: (key) => this.config.remove(key),
        getAll: () => this.config.getAll()
      },
      
      // 平台相关API (代理到平台适配器)
      platform: this.platform.getPublicApi(),
      
      // 服务相关API
      services: {
        register: (name, provider) => this.services.register(name, provider),
        get: (name) => this.services.get(name),
        getAll: () => this.services.getAllServices()
      },
      
      // 获取框架信息
      getInfo: () => ({
        version: FRAMEWORK_VERSION,
        platform: this.platformType,
        extensionsCount: this.extensions.getAllExtensions().length
      })
    };
  }
  
  /**
   * 获取调试信息
   */
  getDebugInfo() {
    return {
      frameworkVersion: FRAMEWORK_VERSION,
      platform: this.platformType,
      extensions: this.extensions.getAllExtensions().map(ext => ({
        id: ext.id,
        name: ext.name,
        version: ext.version,
        enabled: ext.enabled,
        api: ext.apiVersion
      })),
      commands: this.commands.getAll().map(cmd => ({
        id: cmd.id,
        source: cmd.source
      })),
      views: this.ui.getAllViews().map(view => ({
        id: view.id,
        visible: view.visible
      })),
      services: this.services.getAllServices().map(svc => ({
        name: svc.name,
        provider: svc.provider.name || 'anonymous'
      }))
    };
  }
}

/**
 * 创建扩展框架实例
 * @param {Object} options 框架配置选项
 * @returns {ExtensionFramework} 扩展框架实例
 */
export function createExtensionFramework(options = {}) {
  return new ExtensionFramework(options);
}