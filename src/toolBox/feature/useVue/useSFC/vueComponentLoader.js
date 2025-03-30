/**
 * Vue组件加载器 (主模块)
 * 
 * 提供动态加载Vue组件的功能，支持SFC文件加载、组件缓存和热重载
 * 该模块是重构后的主要实现，整合了所有功能子模块
 */

// 导入Vue和SFC Loader
import * as Vue from '../../../../static/vue.esm-browser.js';
import * as SfcLoader from '../../../../static/vue3-sfc-loader.esm.js';

// 导入缓存相关功能
import {
  修复URL格式, 数据库缓存管理器, 异步模块缓存, 模块缓存, 
  初始化模块缓存, 获取模块缓存, 添加到模块缓存, 添加样式元素, 
  清空样式元素, 导入并缓存模块, 获取组件内容,
  // 英文别名导出
  fixURLFormat, dbCacheManager, asyncModuleCache, moduleCache,
  initModuleCache, getModuleCache, addToModuleCache, addStyleElement,
  clearStyleElements, importAndCacheModule, getComponentContent
} from './forVueCache.js';

// 导入错误处理相关功能
import {
  加载历史记录器, 创建错误显示组件, 增强错误信息,
  // 英文别名导出
  loadingHistoryRecorder, createErrorDisplayComponent, enhanceErrorInfo
} from './forVueError.js';

// 从SFC Loader获取loadModule函数
const loadModule = SfcLoader.loadModule;

// 初始化模块缓存
初始化模块缓存(Vue, {
  runtime: {
    plugin: window.plugin || {}
  }
});

/**
 * 创建SFC加载器选项
 * @param {Object} 混合选项 - 附加选项
 * @returns {Object} 完整的加载器选项
 */
const 创建加载器选项 = (混合选项 = {}) => {
  const 选项 = {
    moduleCache: {
      ...获取模块缓存(),
      ...混合选项.moduleCache
    },
    
    async getFile(url) {
      try {
        // 处理特定文件路径映射
        const 路径映射 = {
          '/plugins/SACAssetsManager/source/UI/pannels/imagePreviewer/brushModeUtils.js': 
            '/plugins/SACAssetsManager/source/UI/pannels/imagePreviewer/brushModeUtils.js',
          '/plugins/SACAssetsManager/source/UI/pannels/imagePreviewer/index.vue':
            '/plugins/SACAssetsManager/source/UI/pannels/imagePreviewer/index.vue'
        };
        
        // 检查是否有特殊路径映射
        const 映射后URL = 路径映射[url] || url;
        
        // 获取文件内容
        const { 内容 } = await 获取组件内容(映射后URL);
        
        return {
          getContentData: asBinary => asBinary ? 
            new TextEncoder().encode(内容).buffer : 
            内容,
        };
      } catch (错误) {
        // 增强错误信息
        throw await 增强错误信息(错误, url);
      }
    },
    
    handleModule(type, source, path, options) {
      // 处理JSON模块
      if (type === '.json') {
        return JSON.parse(source);
      }
      
      // 特殊处理runtime模块
      if (path === 'runtime') {
        console.log('提供runtime模块');
        return 获取模块缓存().runtime;
      }
      
      // 处理Vue相关模块
      if (path === 'vue/runtime' || 
          path.startsWith('vue/') || 
          path.startsWith('@vue/')) {
        console.log(`提供Vue模块作为${path}的替代`);
        return Vue;
      }
      
      // 处理JS模块
      if (type === '.js') {
        return 异步模块缓存[path] || 获取模块缓存()[path];
      }
      
      // 处理CDN模块
      if (path.includes('esm.sh') || path.includes('cdn')) {
        return 异步模块缓存[path];
      }
    },
    
    addStyle(textContent) {
      const style = Object.assign(document.createElement('style'), { textContent });
      const ref = document.head.getElementsByTagName('style')[0] || null;
      document.head.insertBefore(style, ref);
      添加样式元素(style);
    },
    
    ...混合选项
  };
  
  return 选项;
};

/**
 * 增强版loadModule调用
 * @param {string} url - 组件的URL
 * @param {Object} options - 加载器选项
 * @returns {Promise<Object>} 加载后的组件对象
 */
const 增强的加载模块 = async (url, options) => {
  加载历史记录器.记录事件('开始加载模块', url);
  
  try {
    const result = await loadModule(url, options);
    加载历史记录器.记录事件('模块加载成功', url);
    return result;
  } catch (错误) {
    // 增强错误信息
    错误.文件URL = 错误.文件URL || url;
    加载历史记录器.记录错误(错误, `加载模块失败: ${url}`);
    
    // 增强错误信息
    const 增强后错误 = await 增强错误信息(错误, url);
    throw 增强后错误;
  }
};

/**
 * 初始化Vue应用
 * @param {string|Object} appURL - 组件URL或组件对象
 * @param {string} name - 组件名称
 * @param {Object} mixinOptions - 额外选项
 * @param {string} directory - 热重载目录
 * @param {Object} data - 应用数据
 * @returns {Promise<Object>} Vue应用实例
 */
export const initVueApp = async (appURL, name = '', mixinOptions = {}, directory = '', data = {}) => {
  let oldApp;
  let mountArgs;
  
  // 每次初始化应用时清除加载历史
  加载历史记录器.清空();
  加载历史记录器.记录事件('初始化Vue应用', { 
    组件名称: name, 
    组件路径: typeof appURL === 'string' ? appURL : '对象组件'
  });
  
  try {
    console.log(`初始化Vue应用，组件: ${typeof appURL === 'string' ? appURL : '对象组件'}, 名称: ${name}`);
    
    // 创建Vue应用的内部函数
    const createApp = async () => {
      try {
        清空样式元素();
        
        if (oldApp && typeof oldApp.unmount === 'function') {
          oldApp.unmount();
        }
        
        const options = 创建加载器选项(mixinOptions);
        const componentsCache = {};
        
        // 如果appURL已经是组件对象，直接使用它
        if (appURL && typeof appURL === 'object' && appURL.render) {
          加载历史记录器.记录事件('使用预加载的组件对象', name || 'AppComponent');
          console.log('使用预加载的组件对象');
          componentsCache[name || 'AppComponent'] = appURL;
        } else {
          // 直接等待组件加载完成
          try {
            const componentPath = typeof appURL === 'string' ? appURL : JSON.stringify(appURL);
            加载历史记录器.记录事件('开始加载组件', componentPath);
            console.log(`开始加载组件: ${componentPath}`);
            
            // 使用增强版的loadModule
            const loadedComponent = await 增强的加载模块(appURL, options);
            componentsCache[name || 'AppComponent'] = loadedComponent;
            
            加载历史记录器.记录事件('组件加载完成', componentPath);
            console.log(`组件加载完成: ${componentPath}`);
          } catch (错误) {
            const componentPath = typeof appURL === 'string' ? appURL : JSON.stringify(appURL);
            throw await 增强错误信息(错误, componentPath);
          }
        }
        
        console.log(`创建Vue应用，组件名: ${name || 'AppComponent'}`);
        加载历史记录器.记录事件('创建Vue应用', name || 'AppComponent');
        
        const app = Vue.createApp({
          components: componentsCache,
          template: `<${name || 'AppComponent'}></${name || 'AppComponent'}>`,
          setup() {
            const dataReactive = Vue.reactive(data || {});
            app.provide('appData', dataReactive);
            return { data: dataReactive };
          }
        });
        
        return app;
      } catch (错误) {
        const errorDetails = `创建Vue应用失败: ${错误.message}\n组件路径: ${typeof appURL === 'string' ? appURL : JSON.stringify(appURL)}`;
        加载历史记录器.记录错误(错误, errorDetails);
        console.error(errorDetails, 错误);
        
        // 返回旧应用（如果有）或创建一个错误应用
        if (oldApp) {
          console.log('返回旧应用实例');
          return oldApp;
        }
        
        console.log('创建错误提示应用');
        // 确保错误对象包含加载历史
        if (!错误.加载历史) {
          错误.加载历史 = 加载历史记录器.获取完整历史();
        }
        return Vue.createApp(创建错误显示组件(错误, typeof appURL === 'string' ? appURL : JSON.stringify(appURL)));
      }
    };
    
    // 异步创建应用
    oldApp = await createApp();
    
    // 设置热重载 (仅Electron环境)
    if (window.require && directory) {
      try {
        const fs = window.require('fs');
        const path = window.require('path');
        const previousContents = {};
        
        // 保存原始mount方法
        const originalMount = oldApp.mount;
        oldApp.mount = (...args) => {
          mountArgs = args;
          return originalMount.apply(oldApp, args);
        };
        
        // 监视目录并在文件变化时重新加载
        const watchDirectory = (dir) => {
          if (!fs.existsSync(dir)) {
            console.warn(`目录不存在: ${dir}`);
            return;
          }
          
          fs.readdirSync(dir).forEach(file => {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isFile()) {
              previousContents[filePath] = fs.readFileSync(filePath, 'utf-8');
              
              fs.watchFile(filePath, () => {
                const currentContent = fs.readFileSync(filePath, 'utf-8');
                
                if (currentContent !== previousContents[filePath]) {
                  console.log(`文件已更改: ${filePath}`);
                  
                  try {
                    createApp().then(newApp => {
                      oldApp.unmount();
                      oldApp = newApp;
                      oldApp.mount(...mountArgs);
                      previousContents[filePath] = currentContent;
                    }).catch(error => {
                      console.error('热重载失败:', error);
                    });
                  } catch (error) {
                    console.error('热重载失败:', error);
                  }
                }
              });
            } else if (stats.isDirectory()) {
              watchDirectory(filePath);  // 递归监视子目录
            }
          });
        };
        
        if (directory) {
          watchDirectory(directory);
        }
      } catch (error) {
        console.warn('设置热重载失败, 可能不在Electron环境中:', error);
      }
    }
    
    console.log(`Vue应用初始化完成: ${typeof appURL === 'string' ? appURL : '对象组件'}`);
    加载历史记录器.记录事件('应用初始化完成', { 
      组件名称: name, 
      组件路径: typeof appURL === 'string' ? appURL : '对象组件'
    });
    return oldApp;
  } catch (错误) {
    const errorMessage = `Vue应用初始化失败: ${错误.message}, 组件路径: ${typeof appURL === 'string' ? appURL : JSON.stringify(appURL)}`;
    加载历史记录器.记录错误(错误, errorMessage);
    console.error(errorMessage, 错误);

    // 创建一个包含错误信息的Vue应用
    return Vue.createApp(创建错误显示组件(错误, typeof appURL === 'string' ? appURL : JSON.stringify(appURL)));
  }
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
  // 每次创建界面时清除加载历史
  加载历史记录器.清空();
  加载历史记录器.记录事件('开始创建Vue界面', { componentPath, containerId });
  
  try {
    console.log(`开始创建Vue界面组件: ${componentPath}`);
    
    if (!componentPath.startsWith('/')) {
      const error = new Error('组件路径必须是绝对路径，以/开头');
      加载历史记录器.记录错误(error, `组件路径格式错误: ${componentPath}`);
      throw error;
    }
    
    // 准备数据
    const appData = {
      ...(container.data || {}),
      ...extraData,
      tab: container.element ? container : null,
      appData: {
        appMode: true
      }
    };
    
    console.log(`准备创建Vue应用: ${componentPath}`);
    加载历史记录器.记录事件('准备创建应用', { componentPath, 数据: { 有TabData: !!container.data, 有额外数据: !!Object.keys(extraData).length } });
    
    try {
      // 创建应用
      const app = await initVueApp(
        componentPath,
        containerId,
        {},
        undefined,
        appData
      );
      
      // 挂载到容器
      if (app && typeof app.mount === 'function') {
        const mountTarget = container.element || container;
        if (!mountTarget) {
          const error = new Error('无法找到挂载目标容器');
          加载历史记录器.记录错误(error, '挂载失败: 无法找到目标容器');
          throw error;
        }
        
        console.log(`挂载Vue应用到容器: ${componentPath}`);
        加载历史记录器.记录事件('挂载应用', { componentPath, 目标: mountTarget.tagName || '未知元素' });
        app.mount(mountTarget);
        console.log(`Vue界面组件创建完成: ${componentPath}`);
        加载历史记录器.记录事件('创建完成', { componentPath });
        return app;
      } else {
        const errorMsg = `Vue应用创建失败，无法挂载: ${componentPath}`;
        console.error(errorMsg);
        const error = Object.assign(new Error(errorMsg), { fileUrl: componentPath });
        加载历史记录器.记录错误(error, errorMsg);
        throw error;
      }
    } catch (error) {
      throw await 增强错误信息(error, componentPath);
    }
  } catch (error) {
    const errorMsg = `创建Vue界面组件失败: ${error.message}`;
    加载历史记录器.记录错误(error, errorMsg);
    console.error(errorMsg, {
      组件路径: componentPath,
      错误: error,
      加载历史: error.加载历史 || 加载历史记录器.获取完整历史()
    });
    
    // 创建一个显示错误的应用
    const errorApp = Vue.createApp(创建错误显示组件(error, componentPath));
    
    const mountTarget = container.element || container;
    if (mountTarget) {
      errorApp.mount(mountTarget);
    }
    
    throw Object.assign(error, { 
      fileUrl: error.fileUrl || componentPath,
      loadingHistory: error.loadingHistory || 加载历史记录器.获取完整历史()
    });
  }
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
export const cc = (propNames = []) => (strings, ...interpolations) => {
  const template = strings.reduce((result, str, i) => 
    result + str + (i < interpolations.length ? interpolations[i] : ''), '');
  
  return {
    props: propNames.reduce((obj, name) => {
      obj[name] = null;
      return obj;
    }, {}),
    template
  };
};

/**
 * 异步加载Vue组件，并通过NodeSync接口返回
 * @param {string} componentURL - 组件的URL
 * @returns {Object} 包含getNodeDefineScope和getComponent方法的对象
 */
export const loadVueComponentAsNodeSync = (componentURL) => {
  // 缓存组件和作用域
  const scopeCache = {};
  const componentCache = {};
  
  return {
    /**
     * 获取组件的NodeDefine作用域
     * @param {string} id - 组件实例ID
     * @returns {Promise<Object>} 组件作用域
     */
    async getNodeDefineScope(id) {
      const cacheKey = `${componentURL}_${id}`;
      
      if (scopeCache[cacheKey]) {
        return scopeCache[cacheKey];
      }
      
      try {
        const options = 创建加载器选项();
        const component = await loadModule(componentURL, options);
        
        // 创建作用域对象
        const scope = {
          id,
          nodeDefine: component.nodeDefine || {},
          isLoaded: false
        };
        
        scopeCache[cacheKey] = scope;
        return scope;
      } catch (error) {
        console.error('加载组件NodeDefine失败:', error);
        throw error;
      }
    },
    
    /**
     * 获取组件实例
     * @param {Object} scope - 组件作用域
     * @returns {Promise<Object>} Vue组件实例
     */
    async getComponent(scope) {
      const cacheKey = `${componentURL}_${scope.id}`;
      
      if (componentCache[cacheKey]) {
        return componentCache[cacheKey];
      }
      
      try {
        const options = 创建加载器选项();
        const component = await loadModule(componentURL, options);
        
        componentCache[cacheKey] = component;
        return component;
      } catch (error) {
        console.error('加载组件实例失败:', error);
        throw error;
      }
    }
  };
};

// 为保持与前一个实现的兼容性而添加的默认导出
// 注意：按照项目规范，应该避免使用默认导出，这里仅为向后兼容
export default {
  initVueApp,
  createVueInterface,
  clearComponentCache,
  cc,
  loadVueComponentAsNodeSync
}; 