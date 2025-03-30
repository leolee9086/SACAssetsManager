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
import { 创建加载器选项, 初始化Vue应用, 创建Vue界面, 增强加载模块 } from './useSFC/forVueApp.js';
import { 创建组件模板, 加载组件为节点同步 } from './useSFC/forVueUtils.js';
import { 初始化Vite模式 } from './useSFC/forViteMode.js';

// 初始化模块缓存
初始化模块缓存(Vue, { runtime: { plugin } });

// Vite模式配置
const VITE模式配置 = {
  启用: false,                // 全局开关，控制是否默认使用Vite模式
  最小路径长度: 10,           // 最小路径长度，避免对短路径使用Vite模式
  自动预加载: true,           // 是否自动预加载依赖
  启用热重载: true,           // 是否启用热重载
  检测文件变化间隔: 500,       // ms
  缓存Vite应用: new Map(),    // 缓存已创建的Vite应用
  路径黑名单: [],             // 不使用Vite模式的路径列表（支持字符串和正则表达式）
  智能路径修复: true,         // 是否启用智能路径修复
  路径修复表: new Map(),      // 保存已修复的路径映射
  严格模式: false             // 严格模式下不会自动降级到传统模式
};

/**
 * 检测环境是否支持Vite模式
 * @returns {boolean} 是否支持Vite模式
 */
export const isViteModeSupported = () => {
  try {
    // 检查关键API是否可用
    if (
      typeof URL.createObjectURL !== 'function' ||
      typeof Blob !== 'function' ||
      typeof import.meta !== 'object'
    ) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn('检测Vite模式支持时发生错误:', error);
    return false;
  }
};

/**
 * 判断是否应该使用Vite模式
 * @param {string|Object} 路径 - 组件路径或对象
 * @returns {boolean} 是否应该使用Vite模式
 */
const 应该使用Vite模式 = (路径) => {
  // 如果全局禁用了Vite模式，直接返回false
  if (!VITE模式配置.启用) {
    return false;
  }
  
  // 如果环境不支持，返回false
  if (!isViteModeSupported()) {
    console.log('当前环境不支持Vite模式，使用传统模式');
    return false;
  }
  
  // 如果路径不是字符串（例如对象组件），不使用Vite模式
  if (typeof 路径 !== 'string') {
    return false;
  }
  
  // 对于太短的路径，不使用Vite模式
  if (路径.length < VITE模式配置.最小路径长度) {
    return false;
  }
  
  // 检查黑名单
  for (const 项目 of VITE模式配置.路径黑名单) {
    if (typeof 项目 === 'string' && 路径.includes(项目)) {
      console.log(`路径${路径}在黑名单中，使用传统模式`);
      return false;
    }
    if (项目 instanceof RegExp && 项目.test(路径)) {
      console.log(`路径${路径}匹配黑名单正则，使用传统模式`);
      return false;
    }
  }
  
  // 特殊处理没有扩展名的路径
  if (VITE模式配置.智能路径修复 && !(/\.\w+$/.test(路径))) {
    // 尝试给路径添加.vue扩展名，这是最常见的情况
    const 可能的路径 = `${路径}.vue`;
    console.log(`路径可能缺少扩展名，尝试使用: ${可能的路径}`);
    
    // 保存到路径修复表，后续获取组件时使用
    VITE模式配置.路径修复表.set(路径, 可能的路径);
  }
  
  // 其他情况使用Vite模式
  return true;
};

/**
 * 配置Vite模式
 * @param {Object} 配置 - Vite模式配置
 * @returns {Object} 当前配置
 */
export const configureViteMode = (配置 = {}) => {
  // 如果提供了配置，更新配置
  if (Object.keys(配置).length > 0) {
    Object.assign(VITE模式配置, 配置);
    console.log('Vite模式配置已更新:', VITE模式配置);
    
    // 保存配置
    保存配置();
  }
  
  // 返回当前配置的副本
  return {
    启用: VITE模式配置.启用,
    最小路径长度: VITE模式配置.最小路径长度,
    自动预加载: VITE模式配置.自动预加载,
    启用热重载: VITE模式配置.启用热重载,
    检测文件变化间隔: VITE模式配置.检测文件变化间隔,
    路径黑名单: [...VITE模式配置.路径黑名单],
    智能路径修复: VITE模式配置.智能路径修复,
    路径修复表: new Map(VITE模式配置.路径修复表),
    严格模式: VITE模式配置.严格模式
  };
};

/**
 * 获取或创建Vite应用
 * @param {string} 路径 - 组件路径
 * @param {string} 基础路径 - 基础路径
 * @returns {Promise<Object>} Vite应用
 */
const 获取或创建Vite应用 = async (路径, 基础路径 = '/') => {
  // 检查是否有修复路径
  let 实际路径 = 路径;
  if (VITE模式配置.智能路径修复 && VITE模式配置.路径修复表.has(路径)) {
    实际路径 = VITE模式配置.路径修复表.get(路径);
    console.log(`使用修复后的路径: ${实际路径}`);
  }
  
  // 从路径中提取基础目录
  let 实际基础路径 = 基础路径;
  if (!实际基础路径 && 实际路径.includes('/')) {
    const 最后斜杠索引 = 实际路径.lastIndexOf('/');
    实际基础路径 = 实际路径.substring(0, 最后斜杠索引 + 1);
  }
  
  // 检查缓存
  const 缓存键 = 实际基础路径;
  if (VITE模式配置.缓存Vite应用.has(缓存键)) {
    return VITE模式配置.缓存Vite应用.get(缓存键);
  }
  
  // 创建新的Vite应用
  console.log(`创建新的Vite应用，基础路径: ${实际基础路径}`);
  try {
    const viteApp = await 初始化Vite模式(Vue, {
      基础路径: 实际基础路径,
      入口点: VITE模式配置.自动预加载 ? 实际路径 : undefined,
      热重载: VITE模式配置.启用热重载,
      监视目录: VITE模式配置.启用热重载 ? 实际基础路径 : undefined,
      Vue
    });
    
    // 缓存应用
    VITE模式配置.缓存Vite应用.set(缓存键, viteApp);
    
    return viteApp;
  } catch (错误) {
    // 如果初始化失败并且智能路径修复已启用，尝试不同的扩展名
    if (VITE模式配置.智能路径修复 && !实际路径.includes(".vue")) {
      console.warn(`创建Vite应用失败: ${错误.message}，尝试加载不同扩展名`);
      
      // 从黑名单中排除此路径，防止后续尝试Vite模式
      VITE模式配置.路径黑名单.push(路径);
      
      throw 错误;
    }
    
    throw 错误;
  }
};

/**
 * 初始化Vite风格的开发环境
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} Vite环境实例
 */
export const initViteEnvironment = async (options = {}) => {
  return await 初始化Vite模式(Vue, {
    Vue,
    ...options
  });
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
  // 判断是否应该使用Vite模式
  if (应该使用Vite模式(appURL)) {
    console.log(`使用Vite模式加载组件: ${appURL}`);
    try {
      // 获取或创建Vite应用
      const viteApp = await 获取或创建Vite应用(appURL);
      
      // 查找挂载容器
      const mountElement = mixinOptions.mountElement || document.getElementById(name) || document.querySelector(`#${name}`) || document.body;
      
      // 尝试加载并挂载组件
      try {
        // 检查是否有修复路径
        let 实际路径 = appURL;
        if (VITE模式配置.智能路径修复 && VITE模式配置.路径修复表.has(appURL)) {
          实际路径 = VITE模式配置.路径修复表.get(appURL);
          console.log(`使用修复后的路径加载组件: ${实际路径}`);
        }
        
        const app = await viteApp.加载并挂载(实际路径, mountElement, data);
        
        // 增加额外属性以保持API兼容性
        app.isMountedWithVite = true;
        app._viteApp = viteApp;
        
        return app;
      } catch (加载错误) {
        console.error(`Vite模式加载组件失败: ${appURL}`, 加载错误);
        
        // 添加到黑名单，避免后续再尝试Vite模式
        if (!VITE模式配置.路径黑名单.includes(appURL)) {
          VITE模式配置.路径黑名单.push(appURL);
          console.log(`已将路径添加到黑名单: ${appURL}`);
        }
        
        // 严格模式下不回退
        if (VITE模式配置.严格模式) {
          throw 加载错误;
        }
        
        // 出错时回退到传统模式
        console.log(`回退到传统模式加载: ${appURL}`);
        return await 初始化Vue应用(appURL, name, mixinOptions, directory, data, Vue, SfcLoader);
      }
    } catch (错误) {
      console.error('创建Vite应用失败，回退到传统模式:', 错误);
      
      // 严格模式下不回退
      if (VITE模式配置.严格模式) {
        throw 错误;
      }
      
      // 出错时回退到传统模式
      return await 初始化Vue应用(appURL, name, mixinOptions, directory, data, Vue, SfcLoader);
    }
  }
  
  // 使用传统模式
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
  // 判断是否应该使用Vite模式
  if (应该使用Vite模式(componentPath)) {
    console.log(`使用Vite模式创建界面: ${componentPath}`);
    try {
      // 获取或创建Vite应用
      const viteApp = await 获取或创建Vite应用(componentPath);
      
      // 获取挂载容器
      const mountElement = container.element || container;
      
      // 合并数据
      const mergedData = {
        ...(container.data || {}),
        ...extraData,
        tab: container.element ? container : null,
        appData: {
          appMode: true
        }
      };
      
      // 尝试加载并挂载组件
      try {
        // 检查是否有修复路径
        let 实际路径 = componentPath;
        if (VITE模式配置.智能路径修复 && VITE模式配置.路径修复表.has(componentPath)) {
          实际路径 = VITE模式配置.路径修复表.get(componentPath);
          console.log(`使用修复后的路径创建界面: ${实际路径}`);
        }
        
        const app = await viteApp.加载并挂载(实际路径, mountElement, mergedData);
        
        // 增加额外属性以保持API兼容性
        app.isMountedWithVite = true;
        app._viteApp = viteApp;
        
        return app;
      } catch (加载错误) {
        console.error(`Vite模式创建界面失败: ${componentPath}`, 加载错误);
        
        // 添加到黑名单，避免后续再尝试Vite模式
        if (!VITE模式配置.路径黑名单.includes(componentPath)) {
          VITE模式配置.路径黑名单.push(componentPath);
          console.log(`已将路径添加到黑名单: ${componentPath}`);
        }
        
        // 严格模式下不回退
        if (VITE模式配置.严格模式) {
          throw 加载错误;
        }
        
        // 出错时回退到传统模式
        console.log(`回退到传统模式创建界面: ${componentPath}`);
        return await 创建Vue界面(container, componentPath, containerId, extraData, Vue, SfcLoader);
      }
    } catch (错误) {
      console.error('创建Vite应用失败，回退到传统模式:', 错误);
      
      // 严格模式下不回退
      if (VITE模式配置.严格模式) {
        throw 错误;
      }
      
      // 出错时回退到传统模式
      return await 创建Vue界面(container, componentPath, containerId, extraData, Vue, SfcLoader);
    }
  }
  
  // 使用传统模式
  return await 创建Vue界面(container, componentPath, containerId, extraData, Vue, SfcLoader);
};

/**
 * 清除组件缓存
 * @returns {Promise<void>}
 */
export const clearComponentCache = async () => {
  // 清除传统缓存
  await 数据库缓存管理器.清空();
  
  // 清除Vite应用缓存
  VITE模式配置.缓存Vite应用.forEach(viteApp => {
    try {
      viteApp.清理();
    } catch (error) {
      console.warn('清理Vite应用时发生错误:', error);
    }
  });
  VITE模式配置.缓存Vite应用.clear();
  
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
  const enhancedLoader = 增强加载模块(SfcLoader.loadModule);
  const nodeSync = 加载组件为节点同步(componentURL, enhancedLoader, options);
  
  return {
    async getNodeDefineScope(id) {
      return await nodeSync.获取节点定义作用域(id);
    },
    
    async getComponent(scope) {
      return await nodeSync.获取组件(scope);
    }
  };
};

/**
 * 智能修复路径
 * @param {string} 路径 - 需要修复的路径
 * @returns {string} 修复后的路径
 */
const 智能修复路径 = async (路径) => {
  // 如果已经修复过，直接返回
  if (VITE模式配置.路径修复表.has(路径)) {
    return VITE模式配置.路径修复表.get(路径);
  }
  
  // 检查是否有扩展名
  const 有扩展名 = /\.\w+$/.test(路径);
  if (有扩展名) {
    return 路径; // 已有扩展名，无需修复
  }
  
  // 尝试常见扩展名
  const 扩展名列表 = ['.vue', '.js', '.jsx', '.ts', '.tsx', '.json'];
  
  for (const 扩展名 of 扩展名列表) {
    const 修复路径 = `${路径}${扩展名}`;
    
    try {
      // 尝试请求文件
      const 响应 = await fetch(修复路径);
      if (响应.ok) {
        console.log(`路径修复成功: ${路径} -> ${修复路径}`);
        VITE模式配置.路径修复表.set(路径, 修复路径);
        return 修复路径;
      }
    } catch (错误) {
      // 忽略错误，继续尝试下一个扩展名
    }
  }
  
  // 所有尝试失败，返回原路径
  return 路径;
};

/**
 * 保存Vite模式配置到本地存储
 */
const 保存配置 = () => {
  try {
    // 创建可序列化的配置对象
    const 序列化配置 = {
      启用: VITE模式配置.启用,
      最小路径长度: VITE模式配置.最小路径长度,
      自动预加载: VITE模式配置.自动预加载,
      启用热重载: VITE模式配置.启用热重载,
      检测文件变化间隔: VITE模式配置.检测文件变化间隔,
      路径黑名单: VITE模式配置.路径黑名单.filter(项目 => typeof 项目 === 'string'),
      智能路径修复: VITE模式配置.智能路径修复,
      路径修复表: Array.from(VITE模式配置.路径修复表.entries()),
      严格模式: VITE模式配置.严格模式
    };
    
    // 存储到localStorage
    localStorage.setItem('ViteMode配置', JSON.stringify(序列化配置));
    console.log('Vite模式配置已保存');
  } catch (错误) {
    console.warn('保存Vite模式配置失败:', 错误);
  }
};

/**
 * 加载Vite模式配置
 */
const 加载配置 = () => {
  try {
    const 存储配置 = localStorage.getItem('ViteMode配置');
    if (存储配置) {
      const 解析配置 = JSON.parse(存储配置);
      
      // 恢复配置
      Object.keys(解析配置).forEach(键 => {
        if (键 === '路径修复表' && Array.isArray(解析配置[键])) {
          VITE模式配置.路径修复表 = new Map(解析配置[键]);
        } else {
          VITE模式配置[键] = 解析配置[键];
        }
      });
      
      console.log('已加载保存的Vite模式配置');
    }
  } catch (错误) {
    console.warn('加载Vite模式配置失败:', 错误);
  }
};

// 初始化时加载配置
加载配置();

// 导出默认对象以保持兼容性
export default {
  initVueApp,
  createVueInterface,
  clearComponentCache,
  cc,
  loadVueComponentAsNodeSync,
  initViteEnvironment,
  isViteModeSupported,
  configureViteMode
}; 