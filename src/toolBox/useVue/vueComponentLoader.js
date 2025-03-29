/**
 * Vue组件加载工具
 * 
 * 提供用于动态加载Vue组件的工具函数
 * 支持SFC文件加载、组件缓存和热重载
 */

// 直接导入Vue和SFC Loader
import * as Vue from '../../../static/vue.esm-browser.js';
import * as SfcLoader from '../../../static/vue3-sfc-loader.esm.js';
import { plugin } from '../../../source/asyncModules.js';

// 获取loadModule函数
const loadModule = SfcLoader.loadModule;

/**
 * 修复URL格式问题
 * @param {string} url - 需要修复的URL
 * @returns {string} 修复后的URL
 */
const fixURL = (url) => {
  if (url.startsWith('http:/') && !url.startsWith('http://')) {
    return url.replace('http:/', 'http://');
  }
  return url;
};

/**
 * 模块缓存对象
 */
let moduleCache = {
  // 确保vue始终可用
  vue: Vue,
  // 添加runtime模块，直接从asyncModules导入plugin
  runtime: {
    plugin
  }
};

/**
 * 已加载的组件样式元素集合
 */
let styleElements = [];

/**
 * 异步模块缓存
 */
const asyncModules = {};

/**
 * 组件缓存管理器（使用IndexedDB）
 */
const cacheManager = {
  dbName: 'ComponentCache',
  storeName: 'files',
  version: 1,
  
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'url' });
        }
      };
      
      request.onsuccess = () => resolve(request.result);
    });
  },
  
  async get(url) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(url);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  },
  
  async set(url, content, module) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put({
        url,
        content,
        timestamp: Date.now()
      });
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  },
  
  async clear() {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
};

/**
 * 创建SFC加载器选项
 * @param {Object} mixinOptions - 附加选项
 * @returns {Object} 完整的加载器选项
 */
const createLoaderOptions = (mixinOptions = {}) => {
  const options = {
    moduleCache: {
      vue: Vue, // 确保"vue"指向Vue库
      ...moduleCache,
      ...mixinOptions.moduleCache
    },
    
    async getFile(url) {
      try {
        // 处理来自CDN的请求
        if (url.includes('esm.sh') || url.includes('cdn')) {
          try {
            // 尝试从缓存获取
            const cached = await cacheManager.get(url);
            if (cached) {
              console.log(`从缓存加载模块: ${url}`);
              let module;
              if (!asyncModules[url]) {
                module = await import(url);
                asyncModules[url] = module;
              } else {
                module = asyncModules[url];
              }
              
              return {
                getContentData: asBinary => asBinary ? 
                  new TextEncoder().encode(cached.content).buffer : 
                  cached.content,
              };
            }
    
            // 如果没有缓存，则从网络获取
            console.log(`从网络加载模块: ${url}`);
            const res = await fetch(fixURL(url));
            if (!res.ok) {
              const errorMsg = `网络请求失败: ${url}, 状态码: ${res.status} ${res.statusText}`;
              console.error(errorMsg);
              throw new Error(errorMsg);
            }
            
            const content = await res.text();
            
            try {
              let module = await import(url);
              asyncModules[url] = module;
              
              // 存储到缓存
              await cacheManager.set(url, content, module);
              console.log(`模块已缓存: ${url}`);
            } catch (error) {
              console.warn(`导入模块失败，但已获取内容: ${url}`, error);
            }
    
            return {
              getContentData: asBinary => asBinary ? 
                new TextEncoder().encode(content).buffer : 
                content,
            };
          } catch (error) {
            console.error(`加载CDN模块失败: ${url}`, error);
            throw new Error(`加载CDN模块失败: ${url}, 错误: ${error.message}`);
          }
        }
        
        console.log(`尝试加载文件: ${url}`);
        const res = await fetch(fixURL(url));
        if (!res.ok) {
          const errorMsg = `文件请求失败: ${url}, 状态码: ${res.status} ${res.statusText}`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        }
        
        if (url.endsWith('.js')) {
          if (!asyncModules[url]) {
            try {
              let module = await import(url);
              asyncModules[url] = module;
              console.log(`成功加载JS模块: ${url}`);
            } catch (error) {
              console.error(`导入JS模块失败: ${url}`, error);
              // 仍然返回文本内容
            }
          }
        }
        
        return {
          getContentData: asBinary => asBinary ? res.arrayBuffer() : res.text(),
        };
      } catch (error) {
        // 在顶层捕获所有错误，添加更多上下文信息
        const enhancedError = new Error(`获取文件失败: ${url}, 错误: ${error.message}`);
        enhancedError.originalError = error;
        enhancedError.url = url;
        console.error(`文件加载错误详情:`, { 
          url, 
          errorMessage: error.message,
          stack: error.stack
        });
        throw enhancedError;
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
        return moduleCache.runtime;
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
        return asyncModules[path] || moduleCache[path];
      }
      
      // 处理CDN模块
      if (path.includes('esm.sh') || path.includes('cdn')) {
        return asyncModules[path];
      }
    },
    
    addStyle(textContent) {
      const style = Object.assign(document.createElement('style'), { textContent });
      const ref = document.head.getElementsByTagName('style')[0] || null;
      document.head.insertBefore(style, ref);
      styleElements.push(style);
    },
    
    ...mixinOptions
  };
  
  return options;
};

/**
 * 初始化Vue应用程序
 * @param {string|Object} appURL - 组件URL或组件对象
 * @param {string} [name=''] - 组件ID或名称
 * @param {Object} [mixinOptions={}] - 附加选项
 * @param {string} [directory=''] - 监视的目录路径（用于热重载）
 * @param {Object} [data={}] - 提供给组件的数据
 * @returns {Promise<Vue.App>} Vue应用实例
 */
export const initVueApp = async (appURL, name = '', mixinOptions = {}, directory = '', data = {}) => {
  let oldApp;
  let mountArgs;
  
  try {
    console.log(`初始化Vue应用，组件: ${typeof appURL === 'string' ? appURL : '对象组件'}, 名称: ${name}`);
    
    // 清理旧样式
    const cleanupStyles = () => {
      styleElements.forEach(el => el.remove());
      styleElements = [];
    };
    
    // 创建Vue应用
    const createApp = async () => {
      try {
        cleanupStyles();
        
        if (oldApp && typeof oldApp.unmount === 'function') {
          oldApp.unmount();
        }
        
        const options = createLoaderOptions(mixinOptions);
        const componentsCache = {};
        
        // 如果appURL已经是组件对象，直接使用它
        if (appURL && typeof appURL === 'object' && appURL.render) {
          console.log('使用预加载的组件对象');
          componentsCache[name || 'AppComponent'] = appURL;
        } else {
          // 直接等待组件加载完成，不使用defineAsyncComponent
          try {
            console.log(`开始加载组件: ${typeof appURL === 'string' ? appURL : '非字符串组件'}`);
            const loadedComponent = await loadModule(appURL, options);
            componentsCache[name || 'AppComponent'] = loadedComponent;
            console.log(`组件加载完成: ${typeof appURL === 'string' ? appURL : '非字符串组件'}`);
          } catch (error) {
            const componentPath = typeof appURL === 'string' ? appURL : JSON.stringify(appURL);
            const errorMessage = `加载组件失败: ${error.message}\n组件路径: ${componentPath}`;
            console.error(errorMessage, error);
            
            // 记录更详细的错误信息
            console.error('组件加载详细错误:', {
              组件路径: componentPath,
              错误类型: error.name,
              错误信息: error.message,
              错误堆栈: error.stack,
              文件URL: error.url || '未知'
            });
            
            throw new Error(errorMessage);
          }
        }
        
        console.log(`创建Vue应用，组件名: ${name || 'AppComponent'}`);
        const app = Vue.createApp({
          components: componentsCache,
          template: `<${name || 'AppComponent'}></${name || 'AppComponent'}>`,
          setup() {
            const dataReactive = Vue.reactive(data || {});
            app.provide('appData', dataReactive);
            return { data: dataReactive };
          }
        });
        
        // 设置样式引用，用于热重载时清理
        app.styleElements = styleElements;
        
        return app;
      } catch (error) {
        const errorDetails = `创建Vue应用失败: ${error.message}\n组件路径: ${typeof appURL === 'string' ? appURL : JSON.stringify(appURL)}`;
        console.error(errorDetails, error);
        
        // 返回旧应用（如果有）或创建一个错误应用
        if (oldApp) {
          console.log('返回旧应用实例');
          return oldApp;
        }
        
        console.log('创建错误提示应用');
        return Vue.createApp({
          template: `
            <div class="error-container" style="padding: 20px; background-color: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #d32f2f;">
              <h3 style="margin-top: 0; color: #b71c1c;">组件加载失败</h3>
              <div style="margin-bottom: 10px;"><b>错误信息:</b> ${error.message}</div>
              <div style="margin-bottom: 10px;"><b>组件路径:</b> ${typeof appURL === 'string' ? appURL : JSON.stringify(appURL)}</div>
              ${error.url ? `<div style="margin-bottom: 10px;"><b>资源URL:</b> ${error.url}</div>` : ''}
              <div>
                <span style="cursor: pointer; color: #b71c1c;" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
                  查看详细错误
                </span>
                <pre style="display: none; background-color: #fff; padding: 10px; overflow: auto; max-height: 200px;">${error.stack || '无堆栈信息'}</pre>
              </div>
            </div>
          `
        });
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
                    oldApp.styleElements.forEach(el => el.remove());
                    oldApp.unmount();
                    // 不能在非异步函数中使用await，修改为Promise处理方式
                    createApp().then(newApp => {
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
    return oldApp;
  } catch (error) {
    const errorMessage = `Vue应用初始化失败: ${error.message}, 组件路径: ${typeof appURL === 'string' ? appURL : JSON.stringify(appURL)}`;
    console.error(errorMessage, error);
    
    // 创建一个包含错误信息的Vue应用
    return Vue.createApp({
      template: `
        <div class="error-container" style="padding: 20px; background-color: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #d32f2f;">
          <h3 style="margin-top: 0; color: #b71c1c;">Vue应用初始化失败</h3>
          <div style="margin-bottom: 10px;"><b>错误信息:</b> ${error.message}</div>
          <div style="margin-bottom: 10px;"><b>组件路径:</b> ${typeof appURL === 'string' ? appURL : JSON.stringify(appURL)}</div>
          <div>
            <span style="cursor: pointer; color: #b71c1c;" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
              查看详细错误
            </span>
            <pre style="display: none; background-color: #fff; padding: 10px; overflow: auto; max-height: 200px;">${error.stack || '无堆栈信息'}</pre>
          </div>
        </div>
      `
    });
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
  try {
    console.log(`开始创建Vue界面组件: ${componentPath}`);
    
    if (!componentPath.startsWith('/')) {
      throw new Error('组件路径必须是绝对路径，以/开头');
    }
    
    // 检查子应用模式
    const wndElements = document.querySelectorAll('[data-type="wnd"]');
    if (wndElements.length === 1) {
      document.body.setAttribute('data-subapp', 'true');
    }
    
    // 创建包装组件 (处理子应用模式)
    const AppWrapper = {
      name: 'AppWrapper',
      template: '<slot></slot>',
      setup() {
        return {
          mounted() {
            // 初始检查
            const checkAndSetAttribute = () => {
              const wndElements = document.querySelectorAll('[data-type="wnd"]');
              if (wndElements.length === 1) {
                document.body.setAttribute('data-subapp', '');
              } else {
                document.body.removeAttribute('data-subapp');
              }
            };
            
            checkAndSetAttribute();
            
            // 创建 MutationObserver 监听 DOM 变化
            this.observer = new MutationObserver(checkAndSetAttribute);
            
            // 配置观察选项
            this.observer.observe(document.body, {
              childList: true,      // 监听子节点的增删
              subtree: true,        // 监听所有后代节点
              attributes: true,      // 监听属性变化
              attributeFilter: ['data-type']  // 只监听 data-type 属性
            });
          },
          unmounted() {
            // 断开观察器
            if (this.observer) {
              this.observer.disconnect();
            }
            document.body.removeAttribute('data-subapp');
          }
        };
      }
    };
    
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
    
    try {
      // 创建应用
      const app = await initVueApp(
        componentPath,
        containerId,
        { components: { AppWrapper } },
        undefined,
        appData
      );
      
      // 挂载到容器
      if (app && typeof app.mount === 'function') {
        const mountTarget = container.element || container;
        if (!mountTarget) {
          throw new Error('无法找到挂载目标容器');
        }
        
        console.log(`挂载Vue应用到容器: ${componentPath}`);
        app.mount(mountTarget);
        console.log(`Vue界面组件创建完成: ${componentPath}`);
        return app;
      } else {
        const errorMsg = `Vue应用创建失败，无法挂载: ${componentPath}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      const errorMsg = `创建Vue界面组件失败: ${error.message}`;
      console.error(errorMsg, {
        componentPath,
        错误: error,
        容器: container,
        containerId
      });
      
      // 创建一个显示错误的应用
      const errorApp = Vue.createApp({
        template: `
          <div class="error-container" style="padding: 20px; background-color: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #d32f2f;">
            <h3 style="margin-top: 0; color: #b71c1c;">组件创建失败</h3>
            <div style="margin-bottom: 10px;"><b>错误信息:</b> ${error.message}</div>
            <div style="margin-bottom: 10px;"><b>组件路径:</b> ${componentPath}</div>
            <div>
              <span style="cursor: pointer; color: #b71c1c;" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
                查看详细错误
              </span>
              <pre style="display: none; background-color: #fff; padding: 10px; overflow: auto; max-height: 200px;">${error.stack || '无堆栈信息'}</pre>
            </div>
          </div>
        `
      });
      
      const mountTarget = container.element || container;
      if (mountTarget) {
        errorApp.mount(mountTarget);
      }
      
      throw error;
    }
  } catch (error) {
    const errorMsg = `创建Vue界面组件失败: ${error.message}`;
    console.error(errorMsg, {
      组件路径: componentPath,
      错误信息: error.message,
      错误堆栈: error.stack
    });
    throw error;
  }
};

/**
 * 清除组件缓存
 * @returns {Promise<void>}
 */
export const clearComponentCache = async () => {
  await cacheManager.clear();
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
        const options = createLoaderOptions();
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
        const options = createLoaderOptions();
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

export default {
  initVueApp,
  createVueInterface,
  clearComponentCache,
  cc,
  loadVueComponentAsNodeSync
}; 