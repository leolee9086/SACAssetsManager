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
import { 创建加载器选项, 初始化Vue应用, 创建Vue界面 } from './useSFC/forVueApp.js';
import { 创建组件模板, 加载组件为节点同步 } from './useSFC/forVueUtils.js';

// 初始化模块缓存
初始化模块缓存(Vue, { runtime: { plugin } });

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
        // 处理特定文件路径映射
        const pathMap = {
          // 特殊处理brushModeUtils.js文件的加载路径
          '/plugins/SACAssetsManager/source/UI/pannels/imagePreviewer/brushModeUtils.js': 
            '/plugins/SACAssetsManager/source/UI/pannels/imagePreviewer/brushModeUtils.js',
          // 如果还有其他可能路径问题的文件也可以添加映射
          '/plugins/SACAssetsManager/source/UI/pannels/imagePreviewer/index.vue':
            '/plugins/SACAssetsManager/source/UI/pannels/imagePreviewer/index.vue'
        };
        
        // 检查是否有特殊路径映射
        const mappedUrl = pathMap[url] || url;
        
        // 处理来自CDN的请求
        if (mappedUrl.includes('esm.sh') || mappedUrl.includes('cdn')) {
          try {
            // 尝试从缓存获取
            const cached = await cacheManager.get(mappedUrl);
            if (cached) {
              console.log(`从缓存加载模块: ${mappedUrl}`);
              let module;
              if (!asyncModules[mappedUrl]) {
                module = await import(mappedUrl);
                asyncModules[mappedUrl] = module;
              } else {
                module = asyncModules[mappedUrl];
              }
              
              return {
                getContentData: asBinary => asBinary ? 
                  new TextEncoder().encode(cached.content).buffer : 
                  cached.content,
              };
            }

            // 如果没有缓存，则从网络获取
            console.log(`从网络加载模块: ${mappedUrl}`);
            const res = await fetch(fixURL(mappedUrl));
            if (!res.ok) {
              // 特别处理404错误
              if (res.status === 404) {
                console.error(`模块404错误: ${mappedUrl} - 文件未找到`);
                throw Object.assign(new Error(`模块未找到(404): ${mappedUrl}`), { status: 404, fileUrl: mappedUrl });
              }
              const errorMsg = `网络请求失败: ${mappedUrl}, 状态码: ${res.status} ${res.statusText}`;
              console.error(errorMsg);
              throw new Error(errorMsg);
            }
            
            const content = await res.text();
            
            try {
              console.log(`尝试动态导入CDN模块: ${mappedUrl}`);
              let module = await import(mappedUrl);
              asyncModules[mappedUrl] = module;
              
              // 存储到缓存
              await cacheManager.set(mappedUrl, content, module);
              console.log(`模块已缓存: ${mappedUrl}`);
            } catch (error) {
              console.warn(`导入模块失败，但已获取内容: ${mappedUrl}`, error);
              // 捕获完整错误堆栈
              const fullError = {
                message: `导入CDN模块失败: ${mappedUrl} ${error.message}`,
                name: error.name,
                stack: error.stack,
                importError: true,
                cause: error,
                status: error.status || 0,
                fileUrl: mappedUrl,
                moduleFetchError: true,
                diagnosis: `动态导入CDN模块失败，可能是由于CORS问题、网络问题或模块语法错误`,
                originalError: error
              };
              
              // 使用Error构造函数创建可抛出的错误对象
              const throwableError = new Error(fullError.message);
              Object.assign(throwableError, fullError);
              
              // 确保错误能够传播到顶层错误处理
              throw throwableError;
            }

            return {
              getContentData: asBinary => asBinary ? 
                new TextEncoder().encode(content).buffer : 
                content,
            };
          } catch (error) {
            console.error(`加载CDN模块失败: ${mappedUrl}`, error);
            throw Object.assign(new Error(`加载CDN模块失败: ${mappedUrl}, 错误: ${error.message}`), { 
              originalError: error,
              status: error.status || 0,
              fileUrl: mappedUrl
            });
          }
        }
        
        console.log(`尝试加载文件: ${mappedUrl}`);
        try {
          const res = await fetch(fixURL(mappedUrl));
          if (!res.ok) {
            // 特别处理404错误，增加更详细的诊断
            if (res.status === 404) {
              // 记录未找到的文件
              console.error(`文件404错误: ${mappedUrl} - 文件未找到`);
              
              // 尝试分析路径问题
              const urlParts = mappedUrl.split('/');
              const fileName = urlParts[urlParts.length - 1];
              const dirPath = urlParts.slice(0, -1).join('/');
              
              // 尝试检查目录是否存在
              try {
                const dirCheck = await fetch(dirPath);
                console.log(`目录 ${dirPath} 状态: ${dirCheck.status}`);
                
                // 如果目录也不存在，提供更具体的错误信息
                if (dirCheck.status === 404) {
                  console.error(`目录路径不存在: ${dirPath}`);
                  throw Object.assign(new Error(`目录路径不存在(404): ${dirPath}`), { 
                    directoryMissing: true,
                    fileName,
                    dirPath,
                    fileUrl: mappedUrl,
                    status: 404
                  });
                }
              } catch (e) {
                console.warn('目录检查失败', e);
              }
              
              throw Object.assign(new Error(`文件未找到(404): ${mappedUrl}`), { 
                status: 404, 
                fileUrl: mappedUrl,
                fileName
              });
            }
            
            const errorMsg = `文件请求失败: ${mappedUrl}, 状态码: ${res.status} ${res.statusText}`;
            console.error(errorMsg);
            throw Object.assign(new Error(errorMsg), { status: res.status, fileUrl: mappedUrl });
          }
          
          const content = await res.text();
          
          if (mappedUrl.endsWith('.vue')) {
            // 分析Vue文件内容，检查常见问题
            const scriptMatch = content.match(/<script(\s[^>]*)?>/i);
            if (scriptMatch) {
              const scriptTag = scriptMatch[0];
              if (!scriptTag.includes('setup') && !scriptTag.includes('type="module"')) {
                console.warn(`警告: ${mappedUrl} 的script标签可能需要添加setup属性或指定type="module"`, {
                  scriptTag,
                  recommendation: '建议修改为 <script setup> 或 <script type="module">'
                });
              }
            }
          }
          
          if (mappedUrl.endsWith('.js')) {
            if (!asyncModules[mappedUrl]) {
              try {
                console.log(`尝试动态导入JS模块: ${mappedUrl}`);
                let module = await import(mappedUrl);
                asyncModules[mappedUrl] = module;
                console.log(`成功加载JS模块: ${mappedUrl}`);
              } catch (error) {
                console.error(`导入JS模块失败: ${mappedUrl}`, error);
                // 捕获完整错误堆栈
                const fullError = {
                  message: `导入JS模块失败: ${mappedUrl} ${error.message}`,
                  name: error.name,
                  stack: error.stack,
                  importError: true,
                  cause: error,
                  status: error.status || 0,
                  fileUrl: mappedUrl,
                  moduleFetchError: true,
                  diagnosis: `动态导入JS模块失败，可能是由于网络问题或模块语法错误`,
                  originalError: error
                };
                
                // 使用Error构造函数创建可抛出的错误对象
                const throwableError = new Error(fullError.message);
                Object.assign(throwableError, fullError);
                
                // 确保错误能够传播到顶层错误处理
                throw throwableError;
              }
            }
          }
          
          return {
            getContentData: asBinary => asBinary ? 
              new TextEncoder().encode(content).buffer : 
              content,
          };
        } catch (fetchError) {
          if (fetchError.directoryMissing) {
            // 重新抛出目录错误，保留更详细的诊断信息
            throw fetchError;
          }
          
          console.error(`无法获取文件: ${mappedUrl}`, fetchError);
          throw Object.assign(new Error(`获取文件失败: ${mappedUrl}, 错误: ${fetchError.message}`), { 
            originalError: fetchError,
            status: fetchError.status || 0,
            fileUrl: mappedUrl
          });
        }
      } catch (error) {
        // 在顶层捕获所有错误，添加更多上下文信息
        // 由于mappedUrl可能未定义，这里使用原始url
        const processedUrl = url;  // 使用原始url替代可能未定义的mappedUrl
        const enhancedError = new Error(`获取文件失败: ${processedUrl}, 错误: ${error.message}`);
        enhancedError.originalError = error;
        enhancedError.url = processedUrl;
        enhancedError.fileUrl = processedUrl;
        enhancedError.status = error.status || 0;
        
        // 特别处理目录错误
        if (error.directoryMissing) {
          enhancedError.directoryMissing = true;
          enhancedError.dirPath = error.dirPath;
          enhancedError.fileName = error.fileName;
          console.error(`目录路径错误: 需要创建目录 ${error.dirPath}`, {
            missingDirectory: error.dirPath,
            fileName: error.fileName,
            fullPath: processedUrl
          });
        }
        
        // 记录错误详情，确保不包含循环引用
        console.error(`文件加载错误详情:`, { 
          url: processedUrl, 
          errorMessage: error.message,
          status: error.status || 0,
          stack: error.stack
        });
        
        // 确保没有循环引用
        enhancedError.safeOriginalError = {
          message: error.message,
          name: error.name,
          stack: error.stack,
          status: error.status,
          fileName: error.fileName,
          directoryMissing: error.directoryMissing,
          dirPath: error.dirPath
        };
        
        // 记录到加载历史
        if (loadingHistory && typeof loadingHistory.logError === 'function') {
          loadingHistory.logError(enhancedError, `获取文件失败: ${processedUrl}`);
        }
        
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
 * 修改loadModule调用部分，增强错误处理
 * @param {string} url - 组件的URL
 * @param {Object} options - 加载器选项
 * @returns {Promise<Object>} 加载后的组件对象
 */
const enhancedLoadModule = async (url, options) => {
  加载历史记录.记录事件('开始加载模块', url);
  
  try {
    const result = await loadModule(url, options);
    加载历史记录.记录事件('模块加载成功', url);
    return result;
  } catch (error) {
    // 确保错误中包含URL信息
    error.fileUrl = error.fileUrl || url;
    加载历史记录.记录错误(error, `加载模块失败: ${url}`);
    throw error;
  }
};

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
  const nodeSync = 加载组件为节点同步(componentURL, enhancedLoadModule, options);
  
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