import { detectEnvironment, getEnvironmentInfo, hasFeature } from '../env/detect.js';
import semver from 'semver';  // 用于语义化版本比较

/**
 * 扩展加载管理器
 */
export class ExtensionLoader {
  constructor(framework) {
    this.framework = framework;
    this.loadedExtensions = new Map();
    this.loadedModules = new Map();
    this.environment = detectEnvironment();
    this.environmentInfo = getEnvironmentInfo();
    this.activationEvents = new Map(); // 存储激活事件和对应的扩展
    this.pendingExtensions = new Map(); // 等待激活的扩展
    this.extensionContributions = new Map(); // 存储扩展贡献点
    this.marketplaceUrl = null; // 扩展市场URL
  }
  
  /**
   * 检查模块是否应该在当前环境加载
   * @param {Object} moduleInfo 模块信息
   * @returns {boolean} 是否应该加载
   */
  shouldLoadModule(moduleInfo) {
    // 检查环境兼容性
    const { environments = [], features = [] } = moduleInfo;
    
    // 如果指定了环境，检查当前环境是否匹配
    if (environments.length > 0 && 
        !environments.includes('*') && 
        !environments.includes(this.environment)) {
      return false;
    }
    
    // 检查特性需求
    for (const feature of features) {
      // 处理否定条件 (!feature)
      if (feature.startsWith('!')) {
        const featureName = feature.substring(1);
        // 如果特性存在但需要不存在，则不加载
        if (this.environmentInfo.features[featureName]) {
          return false;
        }
      } else {
        // 如果特性不存在但需要存在，则不加载
        if (!hasFeature(feature) && 
            !this.environmentInfo.features[feature]) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * 初始化扩展市场
   * @param {Object} options 市场配置选项
   */
  async initializeMarketplace(options = {}) {
    this.marketplaceUrl = options.url || 'http://localhost:4873';
    
    // 加载内置的市场扩展
    try {
      const marketplaceManifest = {
        id: 'core.marketplace',
        name: '扩展市场',
        version: '1.0.0',
        modules: {
          service: {
            entry: options.marketplaceEntry || '../extensions/marketplace/index.js',
            environments: ['*']
          }
        }
      };
      
      const marketplaceExtension = await this.loadExtension(marketplaceManifest);
      this.marketplace = marketplaceExtension.modules.service;
      this.framework.logging.info('扩展市场服务已初始化');
    } catch (err) {
      this.framework.logging.error('初始化扩展市场失败', err);
    }
  }
  
  /**
   * 从市场安装扩展
   * @param {string} extensionId 扩展ID
   * @param {string} version 版本号 (可选)
   * @returns {Promise<Object>} 安装的扩展
   */
  async installExtension(extensionId, version) {
    if (!this.marketplace) {
      throw new Error('扩展市场未初始化');
    }
    
    this.framework.logging.info(`开始安装扩展: ${extensionId}${version ? '@' + version : ''}`);
    
    // 调用市场服务下载扩展
    const extensionPackage = await this.marketplace.downloadExtension(extensionId, version);
    
    // 安装扩展到本地存储
    await this.framework.storage.saveExtension(extensionId, extensionPackage);
    
    // 解析清单并加载扩展
    const manifest = JSON.parse(extensionPackage.manifest);
    return await this.loadExtension(manifest);
  }
  
  /**
   * 检查扩展更新
   * @returns {Promise<Array>} 可更新的扩展列表
   */
  async checkForUpdates() {
    if (!this.marketplace) {
      throw new Error('扩展市场未初始化');
    }
    
    const updates = [];
    
    for (const [extensionId, extension] of this.loadedExtensions.entries()) {
      try {
        const latestVersion = await this.marketplace.getLatestVersion(extensionId);
        
        if (latestVersion && semver.gt(latestVersion, extension.version)) {
          updates.push({
            id: extensionId,
            currentVersion: extension.version,
            latestVersion
          });
        }
      } catch (err) {
        this.framework.logging.warn(`检查扩展 ${extensionId} 更新失败`, err);
      }
    }
    
    return updates;
  }
  
  /**
   * 注册激活事件
   * @param {string} event 激活事件名称
   * @param {string} extensionId 扩展ID
   */
  registerActivationEvent(event, extensionId) {
    if (!this.activationEvents.has(event)) {
      this.activationEvents.set(event, new Set());
    }
    this.activationEvents.get(event).add(extensionId);
  }
  
  /**
   * 触发激活事件
   * @param {string} event 事件名称
   * @returns {Promise<Array>} 被激活的扩展列表
   */
  async triggerActivationEvent(event) {
    if (!this.activationEvents.has(event)) {
      return [];
    }
    
    const extensionsToActivate = this.activationEvents.get(event);
    const activatedExtensions = [];
    
    for (const extensionId of extensionsToActivate) {
      if (this.pendingExtensions.has(extensionId)) {
        try {
          const extension = await this.activateExtension(extensionId);
          activatedExtensions.push(extension);
        } catch (err) {
          this.framework.logging.error(`激活扩展 ${extensionId} 失败`, err);
        }
      }
    }
    
    return activatedExtensions;
  }
  
  /**
   * 激活扩展
   * @param {string} extensionId 扩展ID
   * @returns {Promise<Object>} 激活的扩展
   */
  async activateExtension(extensionId) {
    const pendingExtension = this.pendingExtensions.get(extensionId);
    if (!pendingExtension) {
      throw new Error(`找不到待激活的扩展: ${extensionId}`);
    }
    
    this.framework.logging.info(`激活扩展: ${extensionId}`);
    
    try {
      // 加载各个模块
      for (const [moduleType, moduleInfo] of Object.entries(pendingExtension.modules || {})) {
        if (this.shouldLoadModule(moduleInfo)) {
          const moduleExports = await import(/* @vite-ignore */ moduleInfo.entry);
          const moduleInstance = moduleExports.default || moduleExports;
          
          // 初始化模块
          if (typeof moduleInstance.initialize === 'function') {
            await moduleInstance.initialize(this.framework);
          }
          
          pendingExtension.instance.modules[moduleType] = moduleInstance;
          this.loadedModules.set(`${extensionId}:${moduleType}`, moduleInstance);
        }
      }
      
      // 移除待激活列表并添加到已加载列表
      this.loadedExtensions.set(extensionId, pendingExtension.instance);
      this.pendingExtensions.delete(extensionId);
      
      // 注册扩展贡献点
      if (pendingExtension.contributions) {
        this.registerContributions(extensionId, pendingExtension.contributions);
      }
      
      return pendingExtension.instance;
    } catch (err) {
      this.framework.logging.error(`激活扩展 ${extensionId} 失败`, err);
      throw err;
    }
  }
  
  /**
   * 注册扩展贡献点
   * @param {string} extensionId 扩展ID
   * @param {Object} contributions 贡献点对象
   */
  registerContributions(extensionId, contributions) {
    for (const [type, items] of Object.entries(contributions)) {
      // 根据不同类型的贡献点进行处理
      switch (type) {
        case 'commands':
          items.forEach(command => {
            this.framework.commands.register(command.id, () => {
              const extension = this.loadedExtensions.get(extensionId);
              return extension.modules.main.executeCommand(command.id);
            });
          });
          break;
        
        case 'configurations':
          this.framework.configuration.registerExtensionConfig(extensionId, items);
          break;
          
        // 可以添加更多贡献点类型
      }
    }
    
    this.extensionContributions.set(extensionId, contributions);
  }
  
  /**
   * 加载扩展
   * @param {Object} manifest 扩展清单
   * @returns {Promise<Object>} 加载的扩展实例
   */
  async loadExtension(manifest) {
    try {
      // 检查依赖
      if (manifest.dependencies) {
        for (const [depId, versionRange] of Object.entries(manifest.dependencies)) {
          if (!this.loadedExtensions.has(depId)) {
            // 尝试自动安装依赖
            if (this.marketplace) {
              await this.installExtension(depId, versionRange);
            } else {
              throw new Error(`依赖扩展未加载: ${depId}@${versionRange}`);
            }
          } else {
            // 检查版本兼容性
            const loadedVersion = this.loadedExtensions.get(depId).version;
            if (!semver.satisfies(loadedVersion, versionRange)) {
              throw new Error(`依赖版本不兼容: ${depId}@${loadedVersion} 不满足 ${versionRange}`);
            }
          }
        }
      }
      
      // 创建扩展实例
      const extension = {
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        modules: {},
        api: {},  // 将提供给其他扩展的API
        metadata: manifest.metadata || {}
      };
      
      // 处理激活事件
      if (manifest.activationEvents && manifest.activationEvents.length > 0) {
        // 将扩展添加到待激活列表
        this.pendingExtensions.set(manifest.id, {
          instance: extension,
          modules: manifest.modules || {},
          contributions: manifest.contributes
        });
        
        // 注册激活事件
        for (const event of manifest.activationEvents) {
          this.registerActivationEvent(event, manifest.id);
        }
        
        this.framework.logging.info(
          `扩展 ${manifest.id} 已注册，等待激活事件: ${manifest.activationEvents.join(', ')}`
        );
        
        // 检查是否需要立即激活
        if (manifest.activationEvents.includes('*') || manifest.activationEvents.includes('onStartup')) {
          await this.activateExtension(manifest.id);
        }
        
        return extension;
      }
      
      // 如果没有激活事件，直接加载
      // 加载各个模块
      for (const [moduleType, moduleInfo] of Object.entries(manifest.modules || {})) {
        if (this.shouldLoadModule(moduleInfo)) {
          try {
            // 动态导入模块
            const moduleExports = await import(
              /* @vite-ignore */
              moduleInfo.entry
            );
            
            const moduleInstance = moduleExports.default || moduleExports;
            
            // 初始化模块
            if (typeof moduleInstance.initialize === 'function') {
              await moduleInstance.initialize(this.framework);
            }
            
            extension.modules[moduleType] = moduleInstance;
            this.loadedModules.set(`${manifest.id}:${moduleType}`, moduleInstance);
            
            this.framework.logging.info(
              `已加载模块 ${manifest.id}:${moduleType}`
            );
          } catch (err) {
            this.framework.logging.error(
              `加载模块 ${manifest.id}:${moduleType} 失败`, err
            );
          }
        } else {
          this.framework.logging.info(
            `跳过加载模块 ${manifest.id}:${moduleType}，不兼容当前环境`
          );
        }
      }
      
      this.loadedExtensions.set(manifest.id, extension);
      
      // 注册贡献点
      if (manifest.contributes) {
        this.registerContributions(manifest.id, manifest.contributes);
      }
      
      return extension;
    } catch (err) {
      this.framework.logging.error(`加载扩展 ${manifest.id} 失败`, err);
      throw err;
    }
  }
  
  /**
   * 卸载扩展
   * @param {string} extensionId 扩展ID
   * @returns {Promise<boolean>} 是否成功卸载
   */
  async unloadExtension(extensionId) {
    const extension = this.loadedExtensions.get(extensionId);
    if (!extension) return false;
    
    // 卸载各个模块
    for (const [moduleType, moduleInstance] of Object.entries(extension.modules)) {
      if (typeof moduleInstance.dispose === 'function') {
        try {
          await moduleInstance.dispose();
          this.loadedModules.delete(`${extensionId}:${moduleType}`);
        } catch (err) {
          this.framework.logging.error(
            `卸载模块 ${extensionId}:${moduleType} 失败`, err
          );
        }
      }
    }
    
    this.loadedExtensions.delete(extensionId);
    return true;
  }
  
  /**
   * 获取已加载的扩展列表
   * @returns {Array<Object>} 扩展列表
   */
  getLoadedExtensions() {
    return Array.from(this.loadedExtensions.values());
  }
  
  /**
   * 获取特定模块
   * @param {string} extensionId 扩展ID
   * @param {string} moduleType 模块类型
   * @returns {Object|null} 模块实例或null
   */
  getModule(extensionId, moduleType) {
    return this.loadedModules.get(`${extensionId}:${moduleType}`) || null;
  }
  
  /**
   * 获取扩展配置
   * @param {string} extensionId 扩展ID
   * @returns {Object} 扩展配置
   */
  getExtensionConfiguration(extensionId) {
    return this.framework.configuration.getExtensionConfig(extensionId);
  }
  
  /**
   * 发布扩展到市场
   * @param {string} extensionPath 扩展包路径
   * @returns {Promise<Object>} 发布结果
   */
  async publishExtension(extensionPath) {
    if (!this.marketplace) {
      throw new Error('扩展市场未初始化');
    }
    
    return await this.marketplace.publishExtension(extensionPath);
  }
}
