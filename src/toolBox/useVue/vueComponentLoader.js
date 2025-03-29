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

// 创建加载历史记录器，确保只有一个全局实例
const loadingHistory = (() => {
  // 私有状态
  let events = [];
  let errors = [];
  
  return {
    // 记录加载事件
    logEvent(event, data) {
      events.push({
        时间: new Date().toISOString(),
        事件: event,
        数据: data
      });
      console.log(`[加载事件] ${event}:`, data);
    },
    
    // 记录错误
    logError(error, context) {
      const errorInfo = {
        时间: new Date().toISOString(),
        错误类型: error.name,
        错误消息: error.message,
        上下文: context,
        堆栈: error.stack,
        // 不保存原始错误对象，避免循环引用
        // 原始错误: error
      };
      errors.push(errorInfo);
      console.error(`[加载错误] ${context}:`, error);
      return errorInfo;
    },
    
    // 清除历史记录
    clear() {
      events = [];
      errors = [];
      console.log('[加载历史] 已清除所有记录');
      return this;
    },
    
    // 获取完整历史
    getFullHistory() {
      return {
        加载事件: [...events], // 返回副本而不是引用
        错误记录: [...errors]
      };
    }
  };
})();

/**
 * 修改loadModule调用部分，增强错误处理
 * @param {string} url - 组件的URL
 * @param {Object} options - 加载器选项
 * @returns {Promise<Object>} 加载后的组件对象
 */
const enhancedLoadModule = async (url, options) => {
  loadingHistory.logEvent('开始加载模块', url);
  
  try {
    const result = await loadModule(url, options);
    loadingHistory.logEvent('模块加载成功', url);
    return result;
  } catch (error) {
    // 增强错误信息
    error.fileUrl = error.fileUrl || url;
    loadingHistory.logError(error, `加载模块失败: ${url}`);
    
    // 如果是导入错误，获取完整堆栈
    if (error.importError && error.cause) {
      console.error(`捕获到导入错误的完整堆栈:`, error.cause);
      loadingHistory.logEvent('导入错误详情', {
        类型: error.cause.name,
        消息: error.cause.message,
        堆栈: error.cause.stack
      });
    }
    
    // 特殊处理模块相关错误
    if (error.message && error.message.includes('sourceType: "module"')) {
      error.codeIssue = true;
      error.scriptTagIssue = true;
      error.diagnosis = `Vue文件的<script>标签需要添加setup属性或type="module"属性`;
      
      // 尝试获取文件内容以进行进一步诊断
      try {
        loadingHistory.logEvent('获取文件内容尝试诊断', url);
        const response = await fetch(fixURL(url));
        if (response.ok) {
        const text = await response.text();
          loadingHistory.logEvent('获取文件成功', { url, 大小: text.length });
          
        // 检查script标签
        const scriptMatch = text.match(/<script(\s[^>]*)?>/i);
        if (scriptMatch) {
          const scriptTag = scriptMatch[0];
            loadingHistory.logEvent('发现script标签', scriptTag);
            
          if (!scriptTag.includes('setup') && !scriptTag.includes('type="module"')) {
              error.diagnosis += `\n发现标签: ${scriptTag}`;
              error.foundScriptTag = scriptTag;
              loadingHistory.logEvent('script标签问题', `缺少setup或type="module"属性: ${scriptTag}`);
          }
          } else {
            loadingHistory.logEvent('未找到script标签', { url });
        }
        } else {
          loadingHistory.logError(new Error(`获取文件失败: ${response.status} ${response.statusText}`), `获取文件失败: ${url}`);
        }
      } catch (diagError) {
        loadingHistory.logError(diagError, `无法获取文件内容进行诊断: ${url}`);
      }
    }
    
    // 检查路径问题
    if (error.message && (error.message.includes('404') || error.message.includes('Failed to fetch'))) {
      error.pathIssue = true;
      loadingHistory.logEvent('检测到路径问题', { url, 错误类型: '404或Failed to fetch' });
      
      // 检查是否是已知的路径问题文件
      const knownProblematicFiles = [
        '/plugins/SACAssetsManager/source/UI/pannels/imagePreviewer/brushModeUtils.js'
      ];
      
      if (error.message.includes('brushModeUtils.js')) {
        error.diagnosis = (error.diagnosis || '') + 
          "\n已知问题: brushModeUtils.js文件路径错误，可能需要修复导入路径";
        loadingHistory.logEvent('已知路径问题', { 文件: 'brushModeUtils.js', 问题: '路径错误' });
      }
      
      // 分析路径问题
      if (url.includes('/src/base/') && !url.includes('/src/toolBox/base/')) {
        error.diagnosis = (error.diagnosis || '') + "\n路径问题: 使用了 '/src/base/' 而不是 '/src/toolBox/base/'";
        error.suggestedFix = url.replace('/src/base/', '/src/toolBox/base/');
        loadingHistory.logEvent('路径修正建议', { 
          原始路径: url, 
          建议路径: error.suggestedFix,
          问题: "使用了 '/src/base/' 而不是 '/src/toolBox/base/'" 
        });
      } else if (url.includes('/base/') && !url.includes('/toolBox/base/')) {
        error.diagnosis = (error.diagnosis || '') + "\n路径问题: 可能缺少 '/toolBox' 部分";
        error.suggestedFix = url.replace('/base/', '/toolBox/base/');
        loadingHistory.logEvent('路径修正建议', { 
          原始路径: url, 
          建议路径: error.suggestedFix,
          问题: "可能缺少 '/toolBox' 部分" 
        });
        } else {
        // 尝试诊断其他路径问题
        const pathParts = url.split('/');
        const fileName = pathParts[pathParts.length - 1];
        const possibleIssues = [];
        
        // 检查常见问题
        if (pathParts.includes('src') && !pathParts.includes('toolBox')) {
          possibleIssues.push('路径中可能缺少 "toolBox" 部分');
        }
        if (pathParts.length > 3) {
          possibleIssues.push('路径层级可能不正确，请检查 "../" 的数量');
        }
        
        if (possibleIssues.length > 0) {
          error.diagnosis = (error.diagnosis || '') + "\n可能的路径问题: " + possibleIssues.join(', ');
        }
        
        loadingHistory.logEvent('路径分析', {
          原始路径: url,
          文件名: fileName,
          可能问题: possibleIssues
        });
      }
      
      // 尝试进行备选路径请求测试
      try {
        loadingHistory.logEvent('测试相关路径', { url });
        
        const testPaths = [];
        // 测试1: 如果路径包含src/base，尝试src/toolBox/base
        if (url.includes('/src/base/')) {
          testPaths.push(url.replace('/src/base/', '/src/toolBox/base/'));
        }
        // 测试2: 如果路径包含/base/，尝试/toolBox/base/
        else if (url.includes('/base/')) {
          testPaths.push(url.replace('/base/', '/toolBox/base/'));
        }
        
        for (const testPath of testPaths) {
          try {
            loadingHistory.logEvent('尝试备选路径', testPath);
            const testResponse = await fetch(fixURL(testPath));
            if (testResponse.ok) {
              loadingHistory.logEvent('备选路径有效', { 路径: testPath, 状态: testResponse.status });
              error.validAlternativePath = testPath;
              error.diagnosis = (error.diagnosis || '') + `\n备选路径测试成功: ${testPath}`;
              break;
            } else {
              loadingHistory.logEvent('备选路径无效', { 路径: testPath, 状态: testResponse.status });
            }
          } catch (testError) {
            loadingHistory.logError(testError, `测试备选路径失败: ${testPath}`);
          }
        }
      } catch (pathTestError) {
        loadingHistory.logError(pathTestError, `路径测试过程中发生错误`);
      }
    }
    
    // 添加历史记录到错误对象
    error.loadingHistory = loadingHistory.getFullHistory();
    
    // 创建安全的错误对象副本，避免循环引用
    const safeError = new Error(error.message);
    safeError.name = error.name;
    safeError.stack = error.stack;
    safeError.fileUrl = error.fileUrl;
    safeError.diagnosis = error.diagnosis;
    safeError.suggestedFix = error.suggestedFix;
    safeError.pathIssue = error.pathIssue;
    safeError.scriptTagIssue = error.scriptTagIssue;
    safeError.codeIssue = error.codeIssue;
    safeError.foundScriptTag = error.foundScriptTag;
    safeError.validAlternativePath = error.validAlternativePath;
    safeError.moduleFetchError = error.moduleFetchError;
    
    // 安全处理加载历史
    const history = loadingHistory.getFullHistory();
    if (history && history.错误记录) {
      // 移除可能导致循环引用的原始错误字段
      history.错误记录 = history.错误记录.map(err => ({
        时间: err.时间,
        错误类型: err.错误类型,
        错误消息: err.错误消息,
        上下文: err.上下文,
        堆栈: err.堆栈
      }));
    }
    safeError.loadingHistory = history;
    
    throw safeError;
  }
};

/**
 * 创建错误显示组件
 * @param {Error} error - 错误对象
 * @param {string} componentPath - 组件路径
 * @returns {Object} Vue组件对象
 */
const createErrorDisplay = (error, componentPath) => {
  // 提取错误历史
  const loadingHistory = error.loadingHistory || { 加载事件: [], 错误记录: [] };
  
  // 格式化错误信息为JSON
  const errorObj = {
    错误类型: error.name,
    错误消息: error.message,
    组件路径: componentPath,
    文件URL: error.fileUrl || componentPath || '未知',
    诊断信息: error.diagnosis || '无特定诊断',
    建议修复: error.suggestedFix || '',
    发生时间: new Date().toISOString(),
    错误堆栈: error.stack || '无错误堆栈',
    加载历史: {
      加载事件: loadingHistory.加载事件 || [],
      错误记录: loadingHistory.错误记录 ? loadingHistory.错误记录.map(err => ({
        时间: err.时间,
        错误类型: err.错误类型,
        错误消息: err.错误消息,
        上下文: err.上下文
      })) : []
    }
  };
  
  // 使用replacer函数防止循环引用
  const getCircularReplacer = () => {
    const seen = new WeakSet();
    return (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[循环引用]';
        }
        seen.add(value);
      }
      return value;
    };
  };
  
  const errorJSON = JSON.stringify(errorObj, getCircularReplacer(), 2);
  
  // 返回组件对象而不是模板字符串
  return {
    data() {
      return {
        errorObj,
        errorJSON,
        loadingHistory: errorObj.加载历史,
        copyBtnText: '复制错误信息',
        isCopied: false,
        showHistory: false
      };
    },
    computed: {
      hasErrors() {
        return this.loadingHistory.错误记录 && this.loadingHistory.错误记录.length > 0;
      },
      hasEvents() {
        return this.loadingHistory.加载事件 && this.loadingHistory.加载事件.length > 0;
      },
      formattedDiagnosis() {
        return this.errorObj.诊断信息.split('\n').join('<br>');
      }
    },
    methods: {
      copyErrorToClipboard() {
        const errorText = this.errorJSON;
        navigator.clipboard.writeText(errorText)
          .then(() => {
            this.copyBtnText = '已复制!';
            setTimeout(() => { 
              this.copyBtnText = '复制错误信息'; 
            }, 2000);
          })
          .catch(err => {
            console.error('复制失败:', err);
            alert('复制失败: ' + err);
          });
      },
      toggleHistory() {
        this.showHistory = !this.showHistory;
      },
      formatTime(timeString) {
        try {
          const date = new Date(timeString);
          return date.toLocaleTimeString();
        } catch (e) {
          return timeString;
        }
      }
    },
    template: `
      <div class="error-container" style="padding: 20px; background-color: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #d32f2f; font-family: system-ui, -apple-system, sans-serif;">
        <h3 style="margin-top: 0; color: #b71c1c;">组件加载失败</h3>
        
        <div style="margin-bottom: 10px;"><b>错误信息:</b> {{ errorObj.错误消息 }}</div>
        <div style="margin-bottom: 10px;"><b>组件路径:</b> {{ errorObj.组件路径 }}</div>
        <div style="margin-bottom: 10px;"><b>文件URL:</b> {{ errorObj.文件URL }}</div>
        
        <div v-if="errorObj.诊断信息 !== '无特定诊断'" style="margin-bottom: 10px;">
          <b>错误诊断:</b>
          <div v-html="formattedDiagnosis"></div>
        </div>
        
        <div v-if="errorObj.pathIssue" style="margin: 15px 0; padding: 10px; background-color: #fff3e0; border-left: 4px solid #ff9800;">
          <b>路径问题:</b> 可能的路径错误，通常是缺少 'toolBox' 部分或路径层级不正确
          <div v-if="errorObj.建议修复"><b>建议路径:</b> {{ errorObj.建议修复 }}</div>
        </div>
        
        <div v-if="errorObj.scriptTagIssue" style="margin: 15px 0; padding: 10px; background-color: #e8f5e9; border-left: 4px solid #4caf50;">
          <b>建议修复:</b> 将 &lt;script&gt; 标签修改为 &lt;script setup&gt; 或 &lt;script type="module"&gt;
        </div>
        
        <div v-if="errorObj.moduleFetchError" style="margin: 15px 0; padding: 10px; background-color: #fff3e0; border-left: 4px solid #ff9800;">
          <b>模块导入错误:</b> 动态导入JavaScript模块失败
          <div><b>模块路径:</b> {{ errorObj.文件URL }}</div>
          <div v-if="errorObj.诊断信息 !== '无特定诊断'"><b>可能原因:</b> {{ errorObj.诊断信息 }}</div>
          <div style="margin-top: 8px;">
            <b>解决方法:</b>
            <ul style="margin-top: 5px;">
              <li>检查模块文件是否存在于指定路径</li>
              <li>验证模块没有语法错误</li>
              <li>确保模块可通过网络访问且没有CORS限制</li>
            </ul>
          </div>
        </div>
        
        <!-- 加载历史摘要 -->
        <div v-if="hasErrors || hasEvents" style="margin: 15px 0; padding: 12px; background-color: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <b>加载过程:</b>
            <button @click="toggleHistory" style="background: none; border: none; color: #1565c0; cursor: pointer; font-weight: bold; text-decoration: underline;">
              {{ showHistory ? '隐藏详情' : '查看详情' }}
            </button>
          </div>
          
          <div v-if="showHistory">
            <!-- 错误历史记录 -->
            <div v-if="hasErrors" style="margin-top: 10px;">
              <div style="font-weight: bold; margin-bottom: 5px; color: #d32f2f;">错误记录 ({{ loadingHistory.错误记录.length }}条):</div>
              <ul style="margin: 0; padding-left: 20px;">
                <li v-for="(err, index) in loadingHistory.错误记录" :key="'err-'+index" style="margin-bottom: 8px;">
                  <div><b>时间:</b> {{ formatTime(err.时间) }}</div>
                  <div><b>上下文:</b> {{ err.上下文 }}</div>
                  <div><b>错误:</b> {{ err.错误类型 }}: {{ err.错误消息 }}</div>
                </li>
              </ul>
            </div>

            <!-- 加载事件历史 -->
            <div v-if="hasEvents" style="margin-top: 10px;">
              <div style="font-weight: bold; margin-bottom: 5px; color: #1565c0;">加载事件 ({{ loadingHistory.加载事件.length }}条):</div>
              <ul style="margin: 0; padding-left: 20px;">
                <li v-for="(event, index) in loadingHistory.加载事件" :key="'evt-'+index" style="margin-bottom: 5px;">
                  {{ formatTime(event.时间) }} - {{ event.事件 }}: {{ typeof event.数据 === 'string' ? event.数据 : JSON.stringify(event.数据) }}
                </li>
              </ul>
            </div>
          </div>
          <div v-else>
            <div>共 {{ loadingHistory.加载事件.length }} 条事件记录，{{ loadingHistory.错误记录.length }} 条错误记录</div>
          </div>
        </div>
        
        <div style="margin: 15px 0;">
          <button @click="copyErrorToClipboard" style="padding: 8px 16px; background-color: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
            {{ copyBtnText }}
          </button>
        </div>
        
        <div style="margin-top: 15px;">
          <details>
            <summary style="cursor: pointer; color: #b71c1c; font-weight: bold; margin-bottom: 8px;">
              查看完整错误信息
            </summary>
            <pre style="background-color: #fff; padding: 12px; border-radius: 4px; overflow: auto; max-height: 300px; white-space: pre-wrap; word-break: break-word; font-family: monospace;">{{ errorJSON }}</pre>
          </details>
          </div>
        </div>
      `
  };
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
  loadingHistory.clear();
  loadingHistory.logEvent('开始创建Vue界面', { componentPath, containerId });
  
  try {
    console.log(`开始创建Vue界面组件: ${componentPath}`);
    
    if (!componentPath.startsWith('/')) {
      const error = new Error('组件路径必须是绝对路径，以/开头');
      loadingHistory.logError(error, `组件路径格式错误: ${componentPath}`);
      throw error;
    }
    
    // 检查子应用模式
    const wndElements = document.querySelectorAll('[data-type="wnd"]');
    if (wndElements.length === 1) {
      document.body.setAttribute('data-subapp', 'true');
      loadingHistory.logEvent('检测到子应用模式', true);
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
    loadingHistory.logEvent('准备创建应用', { componentPath, 数据: { 有TabData: !!container.data, 有额外数据: !!Object.keys(extraData).length } });
    
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
          const error = new Error('无法找到挂载目标容器');
          loadingHistory.logError(error, '挂载失败: 无法找到目标容器');
          throw error;
        }
        
        console.log(`挂载Vue应用到容器: ${componentPath}`);
        loadingHistory.logEvent('挂载应用', { componentPath, 目标: mountTarget.tagName || '未知元素' });
        app.mount(mountTarget);
        console.log(`Vue界面组件创建完成: ${componentPath}`);
        loadingHistory.logEvent('创建完成', { componentPath });
        return app;
      } else {
        const errorMsg = `Vue应用创建失败，无法挂载: ${componentPath}`;
        console.error(errorMsg);
        const error = Object.assign(new Error(errorMsg), { fileUrl: componentPath });
        loadingHistory.logError(error, errorMsg);
        throw error;
      }
    } catch (error) {
      // 增强错误信息
      let errorMsg = `创建Vue界面组件失败: ${error.message}`;
      loadingHistory.logError(error, errorMsg);
      
      if (error.message && error.message.includes('sourceType: "module"')) {
        errorMsg += '\n可能原因: 组件文件的<script>标签需要添加setup属性或type="module"属性';
      }
      
      console.error(errorMsg, {
        componentPath,
        错误: error,
        错误类型: error.name,
        错误信息: error.message,
        文件URL: error.fileUrl || componentPath,
        错误诊断: error.diagnosis || '无特定诊断',
        容器: container,
        containerId,
        加载历史: error.loadingHistory || loadingHistory.getFullHistory()
      });
      
      // 创建一个显示错误的应用
      const errorApp = Vue.createApp(createErrorDisplay(error, componentPath));
      
      const mountTarget = container.element || container;
      if (mountTarget) {
        errorApp.mount(mountTarget);
      }
      
      throw Object.assign(error, { 
        fileUrl: error.fileUrl || componentPath,
        loadingHistory: error.loadingHistory || loadingHistory.getFullHistory()
      });
    }
  } catch (error) {
    const errorMsg = `创建Vue界面组件失败: ${error.message}`;
    loadingHistory.logError(error, errorMsg);
    console.error(errorMsg, {
      组件路径: componentPath,
      错误信息: error.message,
      错误堆栈: error.stack,
      文件URL: error.fileUrl || componentPath,
      加载历史: error.loadingHistory || loadingHistory.getFullHistory()
    });
    
    throw Object.assign(error, { 
      fileUrl: error.fileUrl || componentPath,
      loadingHistory: error.loadingHistory || loadingHistory.getFullHistory()
    });
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

export const initVueApp = async (appURL, name = '', mixinOptions = {}, directory = '', data = {}) => {
  let oldApp;
  let mountArgs;
  let styleElements = [];
  
  // 每次初始化应用时清除加载历史
  loadingHistory.clear();
  loadingHistory.logEvent('初始化Vue应用', { 
    组件名称: name, 
    组件路径: typeof appURL === 'string' ? appURL : '对象组件'
  });
  
  try {
    console.log(`初始化Vue应用，组件: ${typeof appURL === 'string' ? appURL : '对象组件'}, 名称: ${name}`);
    
    // 清理旧样式
    const cleanupStyles = () => {
      styleElements.forEach(el => el.remove());
      styleElements = [];
    };
    
    // 创建Vue应用的内部函数
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
          loadingHistory.logEvent('使用预加载的组件对象', name || 'AppComponent');
          console.log('使用预加载的组件对象');
          componentsCache[name || 'AppComponent'] = appURL;
        } else {
          // 直接等待组件加载完成，不使用defineAsyncComponent
          try {
            const componentPath = typeof appURL === 'string' ? appURL : JSON.stringify(appURL);
            loadingHistory.logEvent('开始加载组件', componentPath);
            console.log(`开始加载组件: ${componentPath}`);
            
            // 使用增强版的loadModule
            const loadedComponent = await enhancedLoadModule(appURL, options);
            componentsCache[name || 'AppComponent'] = loadedComponent;
            
            loadingHistory.logEvent('组件加载完成', componentPath);
            console.log(`组件加载完成: ${componentPath}`);
          } catch (error) {
            const componentPath = typeof appURL === 'string' ? appURL : JSON.stringify(appURL);
            loadingHistory.logError(error, `组件加载失败: ${componentPath}`);
            
            // 增强错误信息
            let enhancedMessage = `加载组件失败: ${error.message}\n组件路径: ${componentPath}`;
            if (error.scriptTagIssue) {
              enhancedMessage += `\n\n可能的解决方案: 将<script>标签修改为<script setup>或<script type="module">`;
            } else if (error.pathIssue) {
              enhancedMessage += `\n\n可能的路径问题: ${error.diagnosis || '路径不正确'}`;
            }
            
            console.error(enhancedMessage, error);
            
            // 记录更详细的错误信息
            console.error('组件加载详细错误:', {
              组件路径: componentPath,
              错误类型: error.name,
              错误消息: error.message,
              错误诊断: error.diagnosis || '无特定诊断',
              错误堆栈: error.stack,
              文件URL: error.fileUrl || componentPath || '未知',
              加载历史: error.loadingHistory || loadingHistory.getFullHistory()
            });
            
            throw Object.assign(new Error(enhancedMessage), { 
              originalError: error,
              componentPath,
              fileUrl: error.fileUrl || componentPath,
              loadingHistory: loadingHistory.getFullHistory(),
              diagnosis: error.diagnosis || '',
              scriptTagIssue: error.scriptTagIssue || false,
              pathIssue: error.pathIssue || false,
              suggestedFix: error.suggestedFix || ''
            });
          }
        }
        
        console.log(`创建Vue应用，组件名: ${name || 'AppComponent'}`);
        loadingHistory.logEvent('创建Vue应用', name || 'AppComponent');
        
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
        loadingHistory.logError(error, errorDetails);
        console.error(errorDetails, error);
        
        // 返回旧应用（如果有）或创建一个错误应用
        if (oldApp) {
          console.log('返回旧应用实例');
          return oldApp;
        }
        
        console.log('创建错误提示应用');
        // 确保错误对象包含加载历史
        if (!error.loadingHistory) {
          error.loadingHistory = loadingHistory.getFullHistory();
        }
        return Vue.createApp(createErrorDisplay(error, typeof appURL === 'string' ? appURL : JSON.stringify(appURL)));
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
    loadingHistory.logEvent('应用初始化完成', { 
      组件名称: name, 
      组件路径: typeof appURL === 'string' ? appURL : '对象组件'
    });
    return oldApp;
  } catch (error) {
    const errorMessage = `Vue应用初始化失败: ${error.message}, 组件路径: ${typeof appURL === 'string' ? appURL : JSON.stringify(appURL)}`;
    loadingHistory.logError(error, errorMessage);
    console.error(errorMessage, error);
    
    // 创建一个包含错误信息的Vue应用
    return Vue.createApp(createErrorDisplay(error, typeof appURL === 'string' ? appURL : JSON.stringify(appURL)));
  }
};

export default {
  initVueApp,
  createVueInterface,
  clearComponentCache,
  cc,
  loadVueComponentAsNodeSync
}; 