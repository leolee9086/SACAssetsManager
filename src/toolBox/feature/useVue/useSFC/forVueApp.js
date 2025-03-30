/**
 * Vue应用初始化模块
 * 
 * 提供Vue应用创建、挂载和热重载功能
 */

import { 获取模块缓存, 清空样式元素, 添加样式元素, 创建样式管理器 } from './forVueCache.js';
import { 加载历史记录, 创建错误显示组件, 增强错误信息 } from './forVueError.js';
import { 获取文件内容, 处理模块 } from './forVueLoader.js';

/**
 * 创建SFC加载器选项
 * @param {Object} 附加选项 - 额外的加载器选项
 * @param {Object} Vue - Vue实例
 * @param {Object} SfcLoader - SFC加载器实例
 * @param {Object} 样式管理器 - 样式管理器实例
 * @returns {Object} 完整的加载器选项
 */
export const 创建加载器选项 = (附加选项 = {}, Vue, SfcLoader, 样式管理器) => {
  const 选项 = {
    moduleCache: {
      vue: Vue, // 确保"vue"指向Vue库
      ...获取模块缓存(),
      ...附加选项.moduleCache
    },
    
    async getFile(url) {
      return await 获取文件内容(url);
    },
    
    handleModule(type, source, path, options) {
      return 处理模块(type, source, path, options, 选项.moduleCache);
    },
    
    addStyle(textContent) {
      const style = Object.assign(document.createElement('style'), { textContent });
      const ref = document.head.getElementsByTagName('style')[0] || null;
      document.head.insertBefore(style, ref);
      
      // 使用样式管理器来管理样式
      if (样式管理器) {
        样式管理器.添加样式(style);
      } else {
        // 向后兼容，使用旧方法
        添加样式元素(style);
      }
    },
    
    ...附加选项
  };
  
  return 选项;
};

/**
 * 增强的loadModule函数，添加错误处理
 * @param {Object} loadModule - 原始loadModule函数
 * @param {string} url - 组件URL
 * @param {Object} options - 加载选项
 * @returns {Promise<Object>} 加载的组件
 */
export const 增强加载模块 = (loadModule) => async (url, options) => {
  加载历史记录.记录事件('开始加载模块', url);
  
  try {
    const 结果 = await loadModule(url, options);
    加载历史记录.记录事件('模块加载成功', url);
    return 结果;
  } catch (错误) {
    // 增强错误信息
    错误.fileUrl = 错误.fileUrl || url;
    加载历史记录.记录错误(错误, `加载模块失败: ${url}`);
    
    const 安全错误 = 增强错误信息(错误, url, `加载模块失败: ${url}`);
    throw 安全错误;
  }
};

/**
 * 创建子应用包装组件
 * @returns {Object} Vue包装组件
 */
const 创建应用包装器 = () => {
  return {
    name: 'AppWrapper',
    template: '<slot></slot>',
    setup() {
      return {
        mounted() {
          // 初始检查
          const 检查并设置属性 = () => {
            const 窗口元素 = document.querySelectorAll('[data-type="wnd"]');
            if (窗口元素.length === 1) {
              document.body.setAttribute('data-subapp', '');
            } else {
              document.body.removeAttribute('data-subapp');
            }
          };
          
          检查并设置属性();
          
          // 创建 MutationObserver 监听 DOM 变化
          this.observer = new MutationObserver(检查并设置属性);
          
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
};

/**
 * 初始化Vue应用
 * @param {string|Object} appURL - 组件URL或组件对象
 * @param {string} name - 组件名称
 * @param {Object} mixinOptions - 附加选项
 * @param {string} directory - 热重载目录
 * @param {Object} data - 应用数据
 * @param {Object} Vue - Vue实例
 * @param {Object} SfcLoader - SFC加载器实例
 * @returns {Promise<Object>} Vue应用实例
 */
export const 初始化Vue应用 = async (appURL, name = '', mixinOptions = {}, directory = '', data = {}, Vue, SfcLoader) => {
  let 旧应用;
  let 挂载参数;
  
  // 创建应用专属的样式管理器
  const 样式管理器 = 创建样式管理器();
  
  // 每次初始化应用时清除加载历史
  加载历史记录.清除();
  加载历史记录.记录事件('初始化Vue应用', { 
    组件名称: name, 
    组件路径: typeof appURL === 'string' ? appURL : '对象组件'
  });
  
  try {
    console.log(`初始化Vue应用，组件: ${typeof appURL === 'string' ? appURL : '对象组件'}, 名称: ${name}`);
    
    // 创建Vue应用的内部函数
    const 创建应用 = async () => {
      try {
        // 清理旧样式
        if (旧应用 && 旧应用.样式管理器) {
          旧应用.样式管理器.清空样式();
        }
        
        if (旧应用 && typeof 旧应用.unmount === 'function') {
          旧应用.unmount();
        }
        
        const 选项 = 创建加载器选项(mixinOptions, Vue, SfcLoader, 样式管理器);
        const 组件缓存 = {};
        const loadModule = 增强加载模块(SfcLoader.loadModule);
        
        // 如果appURL已经是组件对象，直接使用它
        if (appURL && typeof appURL === 'object' && appURL.render) {
          加载历史记录.记录事件('使用预加载的组件对象', name || 'AppComponent');
          console.log('使用预加载的组件对象');
          组件缓存[name || 'AppComponent'] = appURL;
        } else {
          // 直接等待组件加载完成，不使用defineAsyncComponent
          try {
            const 组件路径 = typeof appURL === 'string' ? appURL : JSON.stringify(appURL);
            加载历史记录.记录事件('开始加载组件', 组件路径);
            console.log(`开始加载组件: ${组件路径}`);
            
            // 使用增强版的loadModule
            const 加载组件 = await loadModule(appURL, 选项);
            组件缓存[name || 'AppComponent'] = 加载组件;
            
            加载历史记录.记录事件('组件加载完成', 组件路径);
            console.log(`组件加载完成: ${组件路径}`);
          } catch (错误) {
            const 组件路径 = typeof appURL === 'string' ? appURL : JSON.stringify(appURL);
            加载历史记录.记录错误(错误, `组件加载失败: ${组件路径}`);
            
            console.error('组件加载详细错误:', {
              组件路径: 组件路径,
              错误类型: 错误.name,
              错误消息: 错误.message,
              错误诊断: 错误.diagnosis || '无特定诊断',
              错误堆栈: 错误.stack,
              文件URL: 错误.fileUrl || 组件路径 || '未知',
              加载历史: 错误.loadingHistory || 加载历史记录.获取历史()
            });
            
            throw 增强错误信息(错误, 组件路径, `组件加载失败: ${组件路径}`);
          }
        }
        
        console.log(`创建Vue应用，组件名: ${name || 'AppComponent'}`);
        加载历史记录.记录事件('创建Vue应用', name || 'AppComponent');
        
        const app = Vue.createApp({
          components: 组件缓存,
          template: `<${name || 'AppComponent'}></${name || 'AppComponent'}>`,
          setup() {
            const dataReactive = Vue.reactive(data || {});
            app.provide('appData', dataReactive);
            return { data: dataReactive };
          }
        });
        
        // 保存样式管理器到应用实例
        app.样式管理器 = 样式管理器;
        
        // 添加卸载钩子
        const 原始卸载 = app.unmount;
        app.unmount = function() {
          // 先清理样式，再卸载应用
          if (app.样式管理器) {
            app.样式管理器.清空样式();
          }
          return 原始卸载.apply(this, arguments);
        };
        
        return app;
      } catch (错误) {
        const 错误详情 = `创建Vue应用失败: ${错误.message}\n组件路径: ${typeof appURL === 'string' ? appURL : JSON.stringify(appURL)}`;
        加载历史记录.记录错误(错误, 错误详情);
        console.error(错误详情, 错误);
        
        // 返回旧应用（如果有）或创建一个错误应用
        if (旧应用) {
          console.log('返回旧应用实例');
          return 旧应用;
        }
        
        console.log('创建错误提示应用');
        // 确保错误对象包含加载历史
        if (!错误.loadingHistory) {
          错误.loadingHistory = 加载历史记录.获取历史();
        }
        return Vue.createApp(创建错误显示组件(错误, typeof appURL === 'string' ? appURL : JSON.stringify(appURL)));
      }
    };
    
    // 创建应用并设置热重载
    旧应用 = await 创建应用();
    
    // 设置热重载 (仅Electron环境)
    if (window.require && directory && typeof window.require === 'function') {
      try {
        const fs = window.require('fs');
        const path = window.require('path');
        
        if (!fs || !path) {
          console.warn('无法加载Node.js模块，热重载不可用');
          return 旧应用;
        }
        
        const 文件内容缓存 = {};
        
        // 保存原始mount方法
        const 原始挂载 = 旧应用.mount;
        旧应用.mount = (...args) => {
          挂载参数 = args;
          return 原始挂载.apply(旧应用, args);
        };
        
        // 监视目录并在文件变化时重新加载
        const 监视目录 = (目录) => {
          if (!fs.existsSync(目录)) {
            console.warn(`目录不存在: ${目录}`);
            return;
          }
          
          fs.readdirSync(目录).forEach(文件 => {
            const 文件路径 = path.join(目录, 文件);
            const 状态 = fs.statSync(文件路径);
            
            if (状态.isFile()) {
              文件内容缓存[文件路径] = fs.readFileSync(文件路径, 'utf-8');
              
              fs.watchFile(文件路径, () => {
                const 当前内容 = fs.readFileSync(文件路径, 'utf-8');
                
                if (当前内容 !== 文件内容缓存[文件路径]) {
                  console.log(`文件已更改: ${文件路径}`);
                  
                  try {
                    旧应用.unmount();
                    // 不能在非异步函数中使用await，修改为Promise处理方式
                    创建应用().then(新应用 => {
                      旧应用 = 新应用;
                      旧应用.mount(...挂载参数);
                      文件内容缓存[文件路径] = 当前内容;
                    }).catch(错误 => {
                      console.error('热重载失败:', 错误);
                    });
                  } catch (错误) {
                    console.error('热重载失败:', 错误);
                  }
                }
              });
            } else if (状态.isDirectory()) {
              监视目录(文件路径);  // 递归监视子目录
            }
          });
        };
        
        if (directory) {
          监视目录(directory);
        }
      } catch (错误) {
        console.warn('设置热重载失败, 可能不在Electron环境中:', 错误);
      }
    }
    
    console.log(`Vue应用初始化完成: ${typeof appURL === 'string' ? appURL : '对象组件'}`);
    加载历史记录.记录事件('应用初始化完成', { 
      组件名称: name, 
      组件路径: typeof appURL === 'string' ? appURL : '对象组件'
    });
    
    return 旧应用;
  } catch (错误) {
    const 错误消息 = `Vue应用初始化失败: ${错误.message}, 组件路径: ${typeof appURL === 'string' ? appURL : JSON.stringify(appURL)}`;
    加载历史记录.记录错误(错误, 错误消息);
    console.error(错误消息, 错误);
    
    // 创建一个包含错误信息的Vue应用
    return Vue.createApp(创建错误显示组件(错误, typeof appURL === 'string' ? appURL : JSON.stringify(appURL)));
  }
};

/**
 * 创建Vue界面组件
 * @param {Object} container - 容器元素或Tab对象
 * @param {string} componentPath - 组件路径
 * @param {string} containerId - 容器ID
 * @param {Object} extraData - 额外数据
 * @param {Object} Vue - Vue实例
 * @param {Object} SfcLoader - SFC加载器实例
 * @returns {Promise<Object>} Vue应用实例
 */
export const 创建Vue界面 = async (container, componentPath, containerId = '', extraData = {}, Vue, SfcLoader) => {
  // 每次创建界面时清除加载历史
  加载历史记录.清除();
  加载历史记录.记录事件('开始创建Vue界面', { componentPath, containerId });
  
  try {
    console.log(`开始创建Vue界面组件: ${componentPath}`);
    
    if (!componentPath.startsWith('/')) {
      const 错误 = new Error('组件路径必须是绝对路径，以/开头');
      加载历史记录.记录错误(错误, `组件路径格式错误: ${componentPath}`);
      throw 错误;
    }
    
    // 检查子应用模式
    const 窗口元素 = document.querySelectorAll('[data-type="wnd"]');
    if (窗口元素.length === 1) {
      document.body.setAttribute('data-subapp', 'true');
      加载历史记录.记录事件('检测到子应用模式', true);
    }
    
    // 准备数据
    const 应用数据 = {
      ...(container.data || {}),
      ...extraData,
      tab: container.element ? container : null,
      appData: {
        appMode: true
      }
    };
    
    console.log(`准备创建Vue应用: ${componentPath}`);
    加载历史记录.记录事件('准备创建应用', { componentPath, 数据: { 有TabData: !!container.data, 有额外数据: !!Object.keys(extraData).length } });
    
    try {
      // 创建应用
      const app = await 初始化Vue应用(
        componentPath,
        containerId,
        { components: { AppWrapper: 创建应用包装器() } },
        undefined,
        应用数据,
        Vue,
        SfcLoader
      );
      
      // 挂载到容器
      if (app && typeof app.mount === 'function') {
        const 挂载目标 = container.element || container;
        if (!挂载目标) {
          const 错误 = new Error('无法找到挂载目标容器');
          加载历史记录.记录错误(错误, '挂载失败: 无法找到目标容器');
          throw 错误;
        }
        
        console.log(`挂载Vue应用到容器: ${componentPath}`);
        加载历史记录.记录事件('挂载应用', { componentPath, 目标: 挂载目标.tagName || '未知元素' });
        app.mount(挂载目标);
        console.log(`Vue界面组件创建完成: ${componentPath}`);
        加载历史记录.记录事件('创建完成', { componentPath });
        return app;
      } else {
        const 错误消息 = `Vue应用创建失败，无法挂载: ${componentPath}`;
        console.error(错误消息);
        const 错误 = Object.assign(new Error(错误消息), { fileUrl: componentPath });
        加载历史记录.记录错误(错误, 错误消息);
        throw 错误;
      }
    } catch (错误) {
      // 增强错误信息
      let 错误消息 = `创建Vue界面组件失败: ${错误.message}`;
      加载历史记录.记录错误(错误, 错误消息);
      
      console.error(错误消息, {
        componentPath,
        错误: 错误,
        错误类型: 错误.name,
        错误信息: 错误.message,
        文件URL: 错误.fileUrl || componentPath,
        错误诊断: 错误.diagnosis || '无特定诊断',
        容器: container,
        containerId,
        加载历史: 错误.loadingHistory || 加载历史记录.获取历史()
      });
      
      // 创建一个显示错误的应用
      const 错误应用 = Vue.createApp(创建错误显示组件(错误, componentPath));
      
      const 挂载目标 = container.element || container;
      if (挂载目标) {
        错误应用.mount(挂载目标);
      }
      
      throw Object.assign(错误, { 
        fileUrl: 错误.fileUrl || componentPath,
        loadingHistory: 错误.loadingHistory || 加载历史记录.获取历史()
      });
    }
  } catch (错误) {
    const 错误消息 = `创建Vue界面组件失败: ${错误.message}`;
    加载历史记录.记录错误(错误, 错误消息);
    console.error(错误消息, {
      组件路径: componentPath,
      错误信息: 错误.message,
      错误堆栈: 错误.stack,
      文件URL: 错误.fileUrl || componentPath,
      加载历史: 错误.loadingHistory || 加载历史记录.获取历史()
    });
    
    throw Object.assign(错误, { 
      fileUrl: 错误.fileUrl || componentPath,
      loadingHistory: 错误.loadingHistory || 加载历史记录.获取历史()
    });
  }
}; 