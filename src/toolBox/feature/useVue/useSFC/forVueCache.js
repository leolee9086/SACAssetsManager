/**
 * Vue组件缓存管理
 * 
 * 提供基于IndexedDB的组件缓存系统，支持组件内容和模块的缓存管理
 */

/**
 * 修复URL格式问题
 * @param {string} url - 需要修复的URL
 * @returns {string} 修复后的URL
 */
export const 修复URL格式 = (url) => {
  if (url.startsWith('http:/') && !url.startsWith('http://')) {
    return url.replace('http:/', 'http://');
  }
  return url;
};

/**
 * 模块缓存对象
 */
export let 模块缓存 = {
  // 将在初始化时填充
};

/**
 * 异步模块缓存
 * 用于存储已动态导入的模块
 */
export const 异步模块缓存 = {};

/**
 * 初始化模块缓存
 * @param {Object} vue - Vue实例
 * @param {Object} options - 额外选项
 */
export const 初始化模块缓存 = (vue, options = {}) => {
  模块缓存 = {
    // 确保vue始终可用
    vue: vue,
    // 添加额外选项
    ...options
  };
};

/**
 * 获取模块缓存
 * @returns {Object} 当前的模块缓存对象
 */
export const 获取模块缓存 = () => {
  return { ...模块缓存 };
};

/**
 * 添加到模块缓存
 * @param {string} 键 - 缓存键名
 * @param {*} 值 - 缓存值
 */
export const 添加到模块缓存 = (键, 值) => {
  模块缓存[键] = 值;
};

/**
 * 样式管理器函数
 * 为每个应用实例创建独立的样式管理
 * @returns {Object} 样式管理器
 */
export const 创建样式管理器 = () => {
  // 当前实例的样式元素集合
  const 元素集合 = new Set();
  
  return {
    /**
     * 添加样式元素
     * @param {HTMLElement} 元素 - 样式元素
     */
    添加样式(元素) {
      元素集合.add(元素);
    },
    
    /**
     * 清空当前实例的样式元素
     */
    清空样式() {
      元素集合.forEach(元素 => {
        if (元素 && 元素.parentNode) {
          元素.parentNode.removeChild(元素);
        }
      });
      元素集合.clear();
    },
    
    /**
     * 获取样式元素数量
     * @returns {number} 样式元素数量
     */
    获取样式数量() {
      return 元素集合.size;
    },
    
    /**
     * 获取样式元素列表
     * @returns {Array} 样式元素列表
     */
    获取样式列表() {
      return Array.from(元素集合);
    }
  };
};

/**
 * 已加载的组件样式元素集合
 * @deprecated 请使用创建样式管理器代替
 */
export let 样式元素集合 = [];

/**
 * 添加样式元素
 * @param {HTMLElement} 元素 - 样式元素
 * @deprecated 请使用创建样式管理器代替
 */
export const 添加样式元素 = (元素) => {
  console.warn('添加样式元素方法已废弃，请使用创建样式管理器代替');
  样式元素集合.push(元素);
};

/**
 * 清空样式元素
 * 移除所有已添加的样式元素
 * @deprecated 请使用创建样式管理器代替
 */
export const 清空样式元素 = () => {
  console.warn('清空样式元素方法已废弃，请使用创建样式管理器代替');
  样式元素集合.forEach(元素 => {
    if (元素 && 元素.parentNode) {
      元素.parentNode.removeChild(元素);
    }
  });
  样式元素集合 = [];
};

/**
 * IndexedDB缓存管理器
 * 提供基于IndexedDB的持久化组件缓存
 */
export const 数据库缓存管理器 = {
  数据库名: 'ComponentCache',
  存储名: 'files',
  版本: 1,
  
  /**
   * 初始化数据库
   * @returns {Promise<IDBDatabase>} 数据库连接
   */
  async 初始化() {
    return new Promise((resolve, reject) => {
      const 请求 = indexedDB.open(this.数据库名, this.版本);
      
      请求.onerror = () => reject(请求.error);
      
      请求.onupgradeneeded = (事件) => {
        const 数据库 = 事件.target.result;
        if (!数据库.objectStoreNames.contains(this.存储名)) {
          数据库.createObjectStore(this.存储名, { keyPath: 'url' });
        }
      };
      
      请求.onsuccess = () => resolve(请求.result);
    });
  },
  
  /**
   * 获取缓存项
   * @param {string} url - 组件URL
   * @returns {Promise<Object|null>} 缓存项或null
   */
  async 获取(url) {
    const 数据库 = await this.初始化();
    return new Promise((resolve, reject) => {
      const 事务 = 数据库.transaction(this.存储名, 'readonly');
      const 存储 = 事务.objectStore(this.存储名);
      const 请求 = 存储.get(url);
      
      请求.onerror = () => reject(请求.error);
      请求.onsuccess = () => resolve(请求.result);
    });
  },
  
  /**
   * 设置缓存项
   * @param {string} url - 组件URL
   * @param {string} 内容 - 组件内容
   * @param {Object} 模块 - 已加载的模块对象
   * @returns {Promise<IDBValidKey>} 操作结果
   */
  async 设置(url, 内容, 模块) {
    const 数据库 = await this.初始化();
    return new Promise((resolve, reject) => {
      const 事务 = 数据库.transaction(this.存储名, 'readwrite');
      const 存储 = 事务.objectStore(this.存储名);
      const 请求 = 存储.put({
        url,
        内容,
        timestamp: Date.now()
      });
      
      请求.onerror = () => reject(请求.error);
      请求.onsuccess = () => resolve(请求.result);
    });
  },
  
  /**
   * 清空缓存
   * @returns {Promise<undefined>} 操作结果
   */
  async 清空() {
    const 数据库 = await this.初始化();
    return new Promise((resolve, reject) => {
      const 事务 = 数据库.transaction(this.存储名, 'readwrite');
      const 存储 = 事务.objectStore(this.存储名);
      const 请求 = 存储.clear();
      
      请求.onerror = () => reject(请求.error);
      请求.onsuccess = () => {
        console.log('组件缓存已清空');
        resolve(请求.result);
      };
    });
  },
  
  /**
   * 获取所有缓存项
   * @returns {Promise<Array>} 所有缓存项
   */
  async 获取所有() {
    // 方法未被使用，保留接口但移除实现
    console.warn('获取所有缓存项方法未被使用');
    return [];
  }
};

/**
 * 异步导入模块并缓存
 * @param {string} url - 模块URL
 * @returns {Promise<Object>} 已加载的模块
 */
export const 导入并缓存模块 = async (url) => {
  if (异步模块缓存[url]) {
    return 异步模块缓存[url];
  }
  
  try {
    console.log(`尝试动态导入模块: ${url}`);
    const 模块 = await import(修复URL格式(url));
    异步模块缓存[url] = 模块;
    return 模块;
  } catch (错误) {
    console.error(`导入模块失败: ${url}`, 错误);
    throw Object.assign(new Error(`导入模块失败: ${url} ${错误.message}`), { 
      原始错误: 错误,
      模块URL: url
    });
  }
};

/**
 * 从缓存或网络获取组件内容
 * @param {string} url - 组件URL
 * @returns {Promise<{内容: string, 从缓存: boolean}>} 组件内容和来源信息
 */
export const 获取组件内容 = async (url) => {
  // 尝试从缓存获取
  const 缓存项 = await 数据库缓存管理器.获取(url);
  if (缓存项 && 缓存项.内容) {
    console.log(`从缓存加载组件: ${url}`);
    
    // 尝试导入关联模块
    if (url.endsWith('.js') || url.includes('esm.sh') || url.includes('cdn')) {
      try {
        await 导入并缓存模块(url);
      } catch (错误) {
        console.warn(`从缓存加载模块内容成功，但导入失败: ${url}`, 错误);
      }
    }
    
    return { 内容: 缓存项.内容, 从缓存: true };
  }
  
  // 从网络获取
  console.log(`从网络加载组件: ${url}`);
  const 响应 = await fetch(修复URL格式(url));
  if (!响应.ok) {
    throw Object.assign(new Error(`获取组件失败: ${url}, 状态码: ${响应.status}`), { 
      状态码: 响应.status,
      组件URL: url
    });
  }
  
  const 内容 = await 响应.text();
  
  // 尝试导入JS模块
  if (url.endsWith('.js') || url.includes('esm.sh') || url.includes('cdn')) {
    try {
      await 导入并缓存模块(url);
      // 成功导入后缓存
      await 数据库缓存管理器.设置(url, 内容);
    } catch (错误) {
      console.warn(`导入模块失败，但已获取内容: ${url}`, 错误);
    }
  } else {
    // 非JS模块直接缓存
    await 数据库缓存管理器.设置(url, 内容);
  }
  
  return { 内容, 从缓存: false };
};

// 英文别名导出
export const fixUrl = 修复URL格式;
export const moduleCache = 模块缓存;
export const asyncModules = 异步模块缓存;
export const initModuleCache = 初始化模块缓存;
export const getModuleCache = 获取模块缓存;
export const addToModuleCache = 添加到模块缓存;
export const styleElements = 样式元素集合;
export const addStyleElement = 添加样式元素;
export const clearStyleElements = 清空样式元素;
export const cacheManager = 数据库缓存管理器;
export const importAndCacheModule = 导入并缓存模块;
export const getComponentContent = 获取组件内容;
export const createStyleManager = 创建样式管理器;

// 默认导出
export default {
  修复URL格式,
  模块缓存,
  异步模块缓存,
  初始化模块缓存,
  获取模块缓存,
  添加到模块缓存,
  样式元素集合,
  添加样式元素,
  清空样式元素,
  创建样式管理器,
  数据库缓存管理器,
  导入并缓存模块,
  获取组件内容,
  // 英文别名
  fixUrl,
  moduleCache,
  asyncModules,
  initModuleCache,
  getModuleCache,
  addToModuleCache,
  styleElements,
  addStyleElement,
  clearStyleElements,
  createStyleManager,
  cacheManager,
  importAndCacheModule,
  getComponentContent
}; 