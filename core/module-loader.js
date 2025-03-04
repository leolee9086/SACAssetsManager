/**
 * 模块加载系统 - core/module-loader.js
 * 提供模块的同步和异步加载能力，支持多环境
 * @AI 环境检测等不应该位于这个文件,也不应该被这个文件引入,这个模块管理器仅仅负责:
 * 1.根据外部传入的配置,查找注册的加载策略加载模块并返回
 * 2.提供模块缓存、单例等功能
 * 3.提供扩展点，便于扩展功能
 * 4.在使用同步方式（无论是node的reuqire还是同步请求）添加模块时必须警告（而不是错误），由于加载函数实际上由外部传入，这可能是一个挑战
 * 5.**信任程序员**，对于外部调用造成的错误直接抛出，不要内部处理，仅仅在内部错误时进行中断
 * 6.他被用于在多种环境中以多种策略加载模块，因此需要支持相当复杂的扩展，但同时又需要保持简单使用时的简洁
 * 7.编程逻辑与语言无关，忠实遵循合适地中英文混合命名风格
 */

/**
 * 加载策略管理器 - 管理不同环境的模块加载策略
 */
class 加载策略管理器 {
  /**
   * 创建加载策略管理器
   * @param {string} 基础路径 - 加载策略模块的基础路径
   */
  constructor(基础路径 = './loaders/') {
    this.基础路径 = 基础路径;
    this.加载策略集 = {};
    // 注册默认的策略注册器
    this.策略注册器 = {
      register: (策略集) => {
        this.加载策略集 = {...this.加载策略集, ...策略集};
      }
    };
    
    // 默认初始化基础策略
    this.初始化默认策略();
  }
  
  /**
   * 初始化默认策略，确保即使外部策略加载失败也有基础功能可用
   * @private
   */
  初始化默认策略() {
    const 默认策略集 = this.获取默认加载策略集();
    this.策略注册器.register(默认策略集);
  }
  
  /**
   * 设置策略注册器
   * @param {Object} 注册器 - 包含register方法的对象
   */
  设置策略注册器(注册器) {
    if (注册器 && typeof 注册器.register === 'function') {
      this.策略注册器 = 注册器;
    }
  }
  
  /**
   * 注册单个加载策略
   * @param {string} 环境类型 - 环境类型标识
   * @param {Object} 策略 - 策略对象，包含加载方法
   */
  注册策略(环境类型, 策略) {
    this.加载策略集[环境类型] = 策略;
  }
  
  /**
   * 初始化加载策略
   * @param {Function} 同步加载函数 - 用于同步加载策略模块的函数
   */
  初始化加载策略(同步加载函数) {
    try {
      // 外部策略集可选，如果加载失败不应影响系统运行
      let 外部策略集 = null;
      
      // 尝试加载外部策略集，但不依赖于它
      try {
        外部策略集 = 同步加载函数('module-loaders');
      } catch (外部加载错误) {
        console.warn('加载外部策略集失败，将使用默认策略:', 外部加载错误.message);
      }
      
      // 如果成功加载外部策略，则注册它
      if (外部策略集 && typeof 外部策略集 === 'object') {
        this.策略注册器.register(外部策略集);
      }
      
      // 确保至少有 fallback 策略
      if (!this.加载策略集.fallback) {
        const 默认策略集 = this.获取默认加载策略集();
        this.加载策略集.fallback = 默认策略集.fallback;
      }
    } catch (error) {
      console.error('初始化加载策略失败:', error);
      // 由于基础策略已在构造函数中初始化，这里不需要重新初始化
    }
  }
  
  /**
   * 获取默认的加载策略集
   * @returns {Object} 默认加载策略集
   */
  获取默认加载策略集() {
    return {
      node: { 
        加载: this.基础Node模块加载.bind(this),
        异步加载: this.基础Node模块异步加载.bind(this)
      },
      browser: { 
        加载: this.基础浏览器模块加载.bind(this),
        异步加载: this.基础浏览器模块异步加载.bind(this)
      },
      fallback: { 
        加载: this.基础备用加载.bind(this),
        异步加载: this.基础备用异步加载.bind(this)
      }
    };
  }
  
  /**
   * 获取特定环境的加载策略
   * @param {string} 环境类型 - 环境类型标识
   * @returns {Object} 加载策略对象
   */
  获取策略(环境类型) {
    return this.加载策略集[环境类型] || this.加载策略集.fallback;
  }
  
  /**
   * 基础Node模块加载实现
   * @param {string} moduleName - 模块名称
   * @returns {any} 加载的模块
   */
  基础Node模块加载(moduleName) {
    const nativeRequire = typeof require !== 'undefined' ? require : null;
    if (!nativeRequire) {
      throw new Error('Node环境中require不可用');
    }
    return nativeRequire(moduleName);
  }
  
  /**
   * 基础浏览器模块加载实现
   * @param {string} moduleName - 模块名称
   * @param {Object} context - 模块上下文
   * @returns {any} 加载的模块
   */
  基础浏览器模块加载(moduleName, context) {
    if (typeof window !== 'undefined') {
      // 检查全局对象中是否已有模块
      if (window[moduleName] || window[`siyuan_${moduleName}`]) {
        return window[moduleName] || window[`siyuan_${moduleName}`];
      }
      
      // 尝试用XHR同步加载模块内容
      try {
        const xhr = new XMLHttpRequest();
        const 可能的路径 = [
          `./plugins/${moduleName}.js`,
          `./plugins/${moduleName}/index.js`,
          `./${moduleName}.js`
        ];
        
        for (const 路径 of 可能的路径) {
          try {
            xhr.open("GET", 路径, false); // 同步请求
            xhr.send(null);
            
            if (xhr.status === 200) {
              // 执行模块代码
              const 执行函数 = new Function('require', 'module', 'exports', xhr.responseText);
              执行函数(context._require, context.module, context.exports);
              return context.module.exports;
            }
          } catch (e) {
            // 继续尝试下一个路径
          }
        }
      } catch (e) {
        // XHR加载失败
      }
    }
    
    throw new Error(`无法在浏览器环境加载模块: ${moduleName}`);
  }
  
  /**
   * 基础备用加载实现
   * @param {string} moduleName - 模块名称
   * @returns {any} 加载的模块或null
   */
  基础备用加载(moduleName) {
    // 1. 检查全局对象
    if (typeof window !== 'undefined') {
      const 可能的全局名称 = [
        moduleName,
        `siyuan_${moduleName}`,
        `plugin_${moduleName}`,
        moduleName.replace(/-/g, '_')
      ];
      
      for (const 名称 of 可能的全局名称) {
        if (window[名称]) {
          return window[名称];
        }
      }
      
      // 思源API特殊处理
      if (moduleName === 'siyuan' && window.siyuan && window.siyuan.API) {
        return window.siyuan;
      }
    }
    
    // 2. Node require尝试
    if (typeof require !== 'undefined') {
      try {
        return require(moduleName);
      } catch (e) {
        // 继续尝试其他方法
      }
    }
    
    return null;
  }
  
  /**
   * 基础Node模块异步加载实现
   * @param {string} moduleName - 模块名称
   * @returns {Promise<any>} 加载的模块
   */
  async 基础Node模块异步加载(moduleName) {
    return new Promise((resolve, reject) => {
      try {
        const module = this.基础Node模块加载(moduleName);
        resolve(module);
      } catch (error) {
        reject(new Error(`Node异步加载模块失败: ${error.message}`));
      }
    });
  }
  
  /**
   * 基础浏览器模块异步加载实现
   * @param {string} moduleName - 模块名称
   * @param {Object} context - 模块上下文
   * @returns {Promise<any>} 加载的模块
   */
  async 基础浏览器模块异步加载(moduleName, context) {
    if (typeof window !== 'undefined') {
      // 检查全局对象中是否已有模块
      if (window[moduleName] || window[`siyuan_${moduleName}`]) {
        return window[moduleName] || window[`siyuan_${moduleName}`];
      }
      
      // 尝试用fetch异步加载模块内容
      const 可能的路径 = [
        `./plugins/${moduleName}.js`,
        `./plugins/${moduleName}/index.js`,
        `./${moduleName}.js`
      ];
      
      for (const 路径 of 可能的路径) {
        try {
          const 响应 = await fetch(路径);
          if (响应.ok) {
            const 代码 = await 响应.text();
            // 执行模块代码
            const 执行函数 = new Function('require', 'module', 'exports', 代码);
            执行函数(context._require, context.module, context.exports);
            return context.module.exports;
          }
        } catch (e) {
          // 继续尝试下一个路径
        }
      }
    }
    
    throw new Error(`无法在浏览器环境异步加载模块: ${moduleName}`);
  }
  
  /**
   * 基础备用异步加载实现
   * @param {string} moduleName - 模块名称
   * @returns {Promise<any>} 加载的模块或null
   */
  async 基础备用异步加载(moduleName) {
    // 首先尝试同步方法
    try {
      return this.基础备用加载(moduleName);
    } catch (e) {
      // 同步方法失败，继续尝试异步方法
    }
    
    // 浏览器环境特殊处理
    if (typeof window !== 'undefined' && typeof window.importModule === 'function') {
      try {
        return await window.importModule(moduleName);
      } catch (e) {
        // importModule 失败，继续尝试其他方法
      }
    }
    
    // 使用动态 import() 尝试加载 (在支持的环境中)
    try {
      // 使用间接方式检测动态导入支持
      const dynamicImport = new Function('modulePath', 'return import(modulePath)');
      return await dynamicImport(moduleName);
    } catch (e) {
      // 不支持动态导入或导入失败
    }
    
    return null;
  }
}

/**
 * 模块代理管理器 - 处理模块的懒加载和代理
 */
class 模块代理管理器 {
  /**
   * 创建模块代理 - 延迟模块解析
   * @param {string} moduleName - 模块名称
   * @param {Promise} modulePromise - 模块加载 Promise
   * @param {Object} moduleCache - 模块缓存
   * @returns {Proxy} 模块代理对象
   */
  创建模块代理(moduleName, modulePromise, moduleCache) {
    // 创建一个特殊对象，用作代理目标
    const target = {
      __modulePromise: modulePromise,
      __moduleName: moduleName,
      __isLoading: true
    };
    
    // 创建代理，拦截所有属性访问和函数调用
    return new Proxy(target, {
      get: (target, prop) => {
        // 特殊属性直接返回
        if (prop === '__modulePromise' || prop === '__moduleName' || prop === '__isLoading') {
          return target[prop];
        }
        
        // 如果模块已经解析完成，从缓存获取实际模块
        if (moduleCache[moduleName]) {
          return moduleCache[moduleName][prop];
        }
        
        // 否则返回一个代理函数，延迟执行到模块加载完成
        return (...args) => {
          console.warn(`模块 ${moduleName} 尚未完全加载，方法 ${String(prop)} 调用已排队`);
          return modulePromise.then(module => {
            if (!module) throw new Error(`模块 ${moduleName} 加载失败`);
            if (typeof module[prop] !== 'function') {
              return module[prop];
            }
            return module[prop](...args);
          });
        };
      },
      
      apply: (target, thisArg, args) => {
        // 如果模块已加载且是函数，直接调用
        if (moduleCache[moduleName]) {
          const module = moduleCache[moduleName];
          if (typeof module === 'function') {
            return module(...args);
          }
          throw new Error(`模块 ${moduleName} 不是函数`);
        }
        
        // 否则等待模块加载完成后调用
        return modulePromise.then(module => {
          if (!module) throw new Error(`模块 ${moduleName} 加载失败`);
          if (typeof module !== 'function') {
            throw new Error(`模块 ${moduleName} 不是函数`);
          }
          return module(...args);
        });
      }
    });
  }
}

/**
 * 模块加载错误类 - 统一处理模块加载相关错误
 */
class 模块加载错误 extends Error {
  /**
   * 创建模块加载错误
   * @param {string} 消息 - 错误消息
   * @param {string} 模块名 - 模块名称
   * @param {string} 错误码 - 错误类型代码
   * @param {Error} 原始错误 - 导致此错误的原始错误
   */
  constructor(消息, 模块名, 错误码 = 'MODULE_LOAD_ERROR', 原始错误 = null) {
    super(消息);
    this.name = '模块加载错误';
    this.moduleName = 模块名;
    this.code = 错误码;
    this.originalError = 原始错误;
    this.timestamp = new Date();
    
    // 保留原始错误的堆栈信息
    if (原始错误 && 原始错误.stack) {
      this.stack = `${this.stack}\nCaused by: ${原始错误.stack}`;
    }
  }
  
  /**
   * 获取错误的完整信息
   * @returns {string} 包含所有错误细节的描述
   */
  获取详细信息() {
    let 详情 = `模块加载错误: ${this.message}\n`;
    详情 += `- 模块名: ${this.moduleName}\n`;
    详情 += `- 错误码: ${this.code}\n`;
    详情 += `- 时间: ${this.timestamp.toISOString()}\n`;
    
    if (this.originalError) {
      详情 += `- 原始错误: ${this.originalError.message}\n`;
    }
    
    return 详情;
  }
}

/**
 * 模块加载器 - 核心模块加载系统
 */
class 模块加载器 {
  /**
   * 创建模块加载器实例
   * @param {Object} 配置 - 配置对象
   */
  constructor(配置 = {}) {
    // 初始化基础属性
    this.模块缓存 = {};
    this.挂起模块 = new Map();
    this.初始化完成 = false;
    this.配置 = Object.assign({
      基础路径: './modules/',
      调试模式: false,
      预加载模块: [],
      环境: null // 可选项，允许后续设置
    }, 配置);
    
    // 检查环境信息 - 如果没有提供则只发出警告
    if (!this.配置.环境) {
      console.warn('未提供环境配置信息，系统将使用基础功能运行。请在加载模块前通过设置环境配置方法提供环境信息。');
      this.环境 = null; // 设置为空，后续可以更新
    } else {
      this.环境 = this.配置.环境;
    }
    
    // 初始化加载策略管理器
    this.策略管理器 = new 加载策略管理器(this.配置.基础路径);
    this.策略管理器.初始化加载策略(this.同步加载模块.bind(this));
    
    // 初始化模块代理管理器
    this.代理管理器 = new 模块代理管理器();
    
    // 兼容层 - 提供 requireSync 的替代方案
    this.requireSync = this.兼容式加载.bind(this);
    
    // 调试日志
    if (this.配置.调试模式) {
      console.log(`模块加载器初始化完成，当前环境: ${this.环境 ? this.环境.类型 : '未设置'}`);
    }
    
    // 预加载配置的模块
    if (this.配置.预加载模块 && this.配置.预加载模块.length > 0) {
      setTimeout(() => {
        this.预加载模块(this.配置.预加载模块);
      }, 0);
    }
  }
  
  /**
   * 设置或更新环境配置
   * @param {Object} 环境配置 - 环境配置对象
   */
  设置环境配置(环境配置) {
    if (!环境配置) {
      console.warn('尝试设置无效的环境配置');
      return;
    }
    
    this.配置.环境 = 环境配置;
    this.环境 = 环境配置;
    
    if (this.配置.调试模式) {
      console.log(`环境配置已更新: ${this.环境.类型}`);
    }
  }
  
  /**
   * 获取当前环境配置
   * @returns {Object|null} 当前环境配置
   */
  获取环境配置() {
    return this.环境;
  }
  
  /**
   * 检查环境配置是否可用
   * @returns {boolean} 环境配置是否有效
   * @private
   */
  检查环境配置() {
    if (!this.环境) {
      console.error('未配置环境信息，无法加载模块。请先调用设置环境配置方法。');
      return false;
    }
    return true;
  }
  
  /**
   * 兼容性模块加载函数 - 用于替代旧的 requireSync
   * @param {string} moduleName - 模块名称
   * @returns {any} 加载的模块
   */
  兼容式加载(模块名) {
    // 检查环境配置
    if (!this.检查环境配置()) {
      throw new 模块加载错误(
        `无法加载模块: ${模块名}, 既没有默认环境也没有覆盖配置`,
        模块名,
        '无环境配置'
      );
    }
    
    // 1. 检查缓存
    if (this.模块缓存[模块名]) {
      return this.模块缓存[模块名];
    }
    
    // 2. 如果初始化已完成但模块不在缓存中，则是运行时请求
    if (this.初始化完成) {
      // 预加载模块但返回 Promise 或代理
      const modulePromise = this.require异步(模块名)
        .catch(error => {
          console.error(`加载模块失败: ${模块名}`, error);
          return null;
        });
      
      // 记录请求，但返回一个轻量级的代理对象，延迟到真正需要时才解析
      this.挂起模块.set(模块名, modulePromise);
      
      // 返回代理对象
      return this.代理管理器.创建模块代理(模块名, modulePromise, this.模块缓存);
    }
    
    // 3. 未初始化完成时，使用同步加载方法
    console.warn(`警告: 模块 "${模块名}" 在初始化阶段使用同步方式加载，建议预先配置到预加载模块列表中。`);
    return this.同步加载模块(模块名);
  }
  
  /**
   * 同步加载模块（仅启动阶段使用）
   * @param {string} moduleName - 模块名称
   * @returns {any} 加载的模块
   * @private
   */
  同步加载模块(moduleName) {
    // 检查环境配置
    if (!this.检查环境配置()) {
      throw new 模块加载错误(
        `无法加载模块: ${moduleName}, 既没有默认环境也没有覆盖配置`,
        moduleName,
        'NO_ENVIRONMENT_CONFIG'
      );
    }
    
    console.warn(`警告: 正在使用同步方式加载模块 "${moduleName}"，这可能导致性能问题，请考虑使用异步加载。`);
    
    try {
      // 创建模块上下文
      const 模块上下文 = this.创建模块上下文();
      
      // 使用环境对应的加载策略
      const 加载策略 = this.策略管理器.获取策略(this.环境.类型);
      
      if (加载策略 && typeof 加载策略.加载 === 'function') {
        const 模块 = 加载策略.加载(moduleName, 模块上下文, this);
        if (模块) {
          this.模块缓存[moduleName] = 模块;
          return 模块;
        }
      }
      
      // 如果策略加载失败，尝试备用加载
      const 备用模块 = this.尝试备用加载(moduleName, 模块上下文);
      if (备用模块) {
        this.模块缓存[moduleName] = 备用模块;
        return 备用模块;
      }
      
      throw new 模块加载错误(
        `无法加载模块: ${moduleName}`,
        moduleName,
        'MODULE_SYNC_LOAD_FAILED'
      );
    } catch (error) {
      // 如果错误已经是模块加载错误类型，直接抛出
      if (error instanceof 模块加载错误) {
        throw error;
      }
      
      // 封装其他错误
      throw new 模块加载错误(
        `模块 ${moduleName} 同步加载失败: ${error.message}`,
        moduleName,
        'MODULE_SYNC_EXCEPTION',
        error
      );
    }
  }
  
  /**
   * 尝试使用所有备用策略加载模块
   * @param {string} moduleName - 模块名称
   * @param {Object} 模块上下文 - 模块上下文
   * @returns {any} 加载的模块或null
   */
  尝试备用加载(moduleName, 模块上下文) {
    // 定义策略尝试顺序（当前环境策略已尝试过，此处跳过）
    const 备用策略顺序 = ['fallback', 'node', 'browser']
      .filter(策略名 => 策略名 !== this.环境.类型);
      
    // 依次尝试每个备用策略
    for (const 策略名 of 备用策略顺序) {
      const 当前策略 = this.策略管理器.加载策略集[策略名];
      if (!当前策略) continue;
      
      try {
        const 模块 = 当前策略.加载(moduleName, 模块上下文, this);
        if (模块) return 模块;
      } catch (e) {
        // 策略失败，继续下一个
      }
    }
    
    // 最后使用内置的基础备用加载
    return this.策略管理器.基础备用加载(moduleName, 模块上下文, this);
  }
  
  /**
   * 异步加载模块
   * @param {string} moduleName - 模块名称
   * @returns {Promise<any>} 加载的模块
   */
  async require异步(moduleName) {
    // 1. 检查缓存
    if (this.模块缓存[moduleName]) {
      return this.模块缓存[moduleName];
    }
    
    // 2. 检查是否已在加载中
    if (this.挂起模块.has(moduleName)) {
      return this.挂起模块.get(moduleName);
    }
    
    // 3. 创建模块加载 Promise
    const modulePromise = this.执行异步模块加载(moduleName);
    
    // 4. 记录挂起的模块加载
    this.挂起模块.set(moduleName, modulePromise);
    
    return modulePromise;
  }
  
  /**
   * 执行异步模块加载逻辑
   * @param {string} moduleName - 模块名称
   * @returns {Promise<any>} 加载的模块
   * @private
   */
  async 执行异步模块加载(moduleName) {
    try {
      const 模块上下文 = this.创建模块上下文();
      const 已加载模块 = await this.尝试异步加载策略队列(moduleName, 模块上下文);
      
      if (已加载模块) {
        this.模块缓存[moduleName] = 已加载模块;
        this.挂起模块.delete(moduleName);
        return 已加载模块;
      }
      
      // 使用新的错误类，提供更清晰的错误信息
      throw new 模块加载错误(
        `无法异步加载模块: ${moduleName}，所有加载策略均已尝试但都失败了`,
        moduleName,
        'MODULE_ASYNC_LOAD_FAILED'
      );
    } catch (error) {
      // 移除挂起状态
      this.挂起模块.delete(moduleName);
      
      // 如果错误已经是模块加载错误类型，直接抛出
      if (error instanceof 模块加载错误) {
        // 记录错误但不处理，符合"信任程序员"原则
        if (this.配置.调试模式) {
          console.error(error.获取详细信息());
        }
        throw error;
      }
      
      // 封装其他错误类型为模块加载错误
      const 封装错误 = new 模块加载错误(
        `模块 ${moduleName} 加载失败: ${error.message}`,
        moduleName,
        'MODULE_LOAD_EXCEPTION',
        error
      );
      
      // 记录错误但不处理，符合"信任程序员"原则
      if (this.配置.调试模式) {
        console.error(封装错误.获取详细信息());
      }
      
      throw 封装错误;
    }
  }
  
  /**
   * 按顺序尝试异步加载策略
   * @param {string} moduleName - 模块名称
   * @param {Object} 模块上下文 - 模块上下文
   * @returns {Promise<any>} 加载的模块或null
   * @private
   */
  async 尝试异步加载策略队列(moduleName, 模块上下文) {
    // 首先尝试当前环境策略
    const 主策略 = this.策略管理器.获取策略(this.环境.类型);
    if (主策略 && typeof 主策略.异步加载 === 'function') {
      try {
        const 模块 = await 主策略.异步加载(moduleName, 模块上下文, this);
        if (模块) return 模块;
      } catch (e) {
        // 主策略异步加载失败，继续尝试备用策略
      }
    }
    
    // 备用策略顺序
    const 备用策略顺序 = ['fallback', 'node', 'browser']
      .filter(策略名 => 策略名 !== this.环境.类型);
    
    // 依次尝试每个备用策略的异步加载
    for (const 策略名 of 备用策略顺序) {
      const 当前策略 = this.策略管理器.加载策略集[策略名];
      if (!当前策略 || typeof 当前策略.异步加载 !== 'function') continue;
      
      try {
        const 模块 = await 当前策略.异步加载(moduleName, 模块上下文, this);
        if (模块) return 模块;
      } catch (e) {
        // 继续下一个策略
      }
    }
    
    return null; // 所有异步策略都失败
  }
  
  /**
   * 创建模块上下文
   * @returns {Object} 模块上下文对象
   */
  创建模块上下文() {
    const context = {
      module: { exports: {} },
      exports: {},
      _require: (name) => this.模块缓存[name] || this.兼容式加载(name)
    };
    return context;
  }
  
  /**
   * 设置初始化完成状态
   * 这会改变模块加载行为，从同步优先转为异步优先
   */
  标记初始化完成() {
    this.初始化完成 = true;
    if (this.配置.调试模式) {
      console.log('模块加载系统初始化完成，后续将优先使用异步加载');
    }
  }
  
  /**
   * 预加载模块，但不会阻塞
   * @param {Array<string>} moduleNames - 模块名称数组
   * @returns {Promise<void>}
   */
  async 预加载模块(moduleNames) {
    if (!Array.isArray(moduleNames) || moduleNames.length === 0) {
      return;
    }
    
    if (this.配置.调试模式) {
      console.log(`开始预加载模块: ${moduleNames.join(', ')}`);
    }
    
    const promises = moduleNames.map(name => 
      this.require异步(name).catch(err => {
        console.warn(`预加载模块 ${name} 失败:`, err);
        return null;
      })
    );
    
    await Promise.allSettled(promises);
    
    if (this.配置.调试模式) {
      console.log(`预加载模块完成`);
    }
  }
  
  /**
   * 获取已加载的所有模块
   * @returns {Object} 模块缓存的副本
   */
  获取已加载模块() {
    return { ...this.模块缓存 };
  }
  
  /**
   * 清除模块缓存
   * @param {string} 模块名 - 指定要清除的模块名称，不提供则清除所有
   */
  清除模块缓存(模块名) {
    if (模块名) {
      delete this.模块缓存[模块名];
      this.挂起模块.delete(模块名);
    } else {
      this.模块缓存 = {};
      this.挂起模块.clear();
    }
  }
}

// 导出模块 (兼容原始导出)
module.exports = {
  ModuleLoader: 模块加载器, // 提供向后兼容性
  模块加载器, // 新的中文命名导出
  加载策略管理器,
  模块代理管理器,
  模块加载错误 // 导出新的错误类
}; 