/**
 * 日志数据库工具
 * 提供日志存储和检索的数据库接口
 */

/**
 * 日志数据库配置项
 * @typedef {Object} 日志数据库配置
 * @property {string} [数据库名='logs'] - 数据库名称
 * @property {string} [存储对象='logEntries'] - 对象存储名称
 * @property {number} [版本=1] - 数据库版本
 * @property {number} [最大条目数=10000] - 最大日志条目数
 * @property {number} [清理阈值=9000] - 触发清理的日志条目数阈值
 */

// 数据库引用，用于单例模式
let 数据库实例 = null;

/**
 * 打开日志数据库
 * @param {日志数据库配置} 配置 - 数据库配置选项
 * @returns {Promise<IDBDatabase>} 数据库对象
 */
export function 打开日志数据库(配置 = {}) {
  const 默认配置 = {
    数据库名: 'logs',
    存储对象: 'logEntries',
    版本: 1,
    最大条目数: 10000,
    清理阈值: 9000
  };

  // 合并配置
  const 实际配置 = { ...默认配置, ...配置 };
  
  return new Promise((resolve, reject) => {
    if (数据库实例) {
      resolve(数据库实例);
      return;
    }
    
    const 请求 = indexedDB.open(实际配置.数据库名, 实际配置.版本);
    
    请求.onerror = (事件) => {
      console.error('打开日志数据库失败:', 事件.target.error);
      reject(事件.target.error);
    };
    
    请求.onsuccess = (事件) => {
      数据库实例 = 事件.target.result;
      
      // 设置数据库配置到实例上，方便后续使用
      数据库实例.配置 = 实际配置;
      
      console.log('日志数据库打开成功');
      resolve(数据库实例);
    };
    
    请求.onupgradeneeded = (事件) => {
      const 数据库 = 事件.target.result;
      
      // 创建日志条目存储
      if (!数据库.objectStoreNames.contains(实际配置.存储对象)) {
        const 存储 = 数据库.createObjectStore(实际配置.存储对象, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        
        // 创建索引
        存储.createIndex('timestamp', 'timestamp', { unique: false });
        存储.createIndex('level', 'level', { unique: false });
        存储.createIndex('category', 'category', { unique: false });
        
        console.log('日志存储对象创建成功');
      }
    };
  });
}

/**
 * 添加日志条目
 * @param {Object} 日志条目 - 要添加的日志条目
 * @param {Object} [配置] - 可选配置
 * @returns {Promise<number>} 新增日志的ID
 */
export async function 添加日志条目(日志条目, 配置 = {}) {
  const 数据库 = await 打开日志数据库(配置);
  const 实际配置 = 数据库.配置;
  
  return new Promise((resolve, reject) => {
    const 事务 = 数据库.transaction([实际配置.存储对象], 'readwrite');
    const 存储 = 事务.objectStore(实际配置.存储对象);
    
    // 确保日志条目有时间戳
    if (!日志条目.timestamp) {
      日志条目.timestamp = Date.now();
    }
    
    const 请求 = 存储.add(日志条目);
    
    请求.onsuccess = (事件) => {
      const 新ID = 事件.target.result;
      
      // 检查是否需要清理旧日志
      检查并清理旧日志(数据库, 实际配置).catch(错误 => {
        console.warn('清理旧日志失败:', 错误);
      });
      
      resolve(新ID);
    };
    
    请求.onerror = (事件) => {
      console.error('添加日志条目失败:', 事件.target.error);
      reject(事件.target.error);
    };
  });
}

/**
 * 批量添加日志条目
 * @param {Array<Object>} 日志条目列表 - 要添加的日志条目数组
 * @param {Object} [配置] - 可选配置
 * @returns {Promise<number[]>} 新增日志的ID数组
 */
export async function 批量添加日志条目(日志条目列表, 配置 = {}) {
  if (!Array.isArray(日志条目列表) || 日志条目列表.length === 0) {
    return [];
  }
  
  const 数据库 = await 打开日志数据库(配置);
  const 实际配置 = 数据库.配置;
  
  return new Promise((resolve, reject) => {
    const 事务 = 数据库.transaction([实际配置.存储对象], 'readwrite');
    const 存储 = 事务.objectStore(实际配置.存储对象);
    const 结果IDs = [];
    
    let 计数器 = 0;
    
    // 为每个日志条目添加一个请求
    日志条目列表.forEach(条目 => {
      // 确保日志条目有时间戳
      if (!条目.timestamp) {
        条目.timestamp = Date.now();
      }
      
      const 请求 = 存储.add(条目);
      
      请求.onsuccess = (事件) => {
        结果IDs.push(事件.target.result);
        计数器++;
        
        if (计数器 === 日志条目列表.length) {
          // 所有添加完成后，检查是否需要清理
          检查并清理旧日志(数据库, 实际配置).catch(错误 => {
            console.warn('清理旧日志失败:', 错误);
          });
          
          resolve(结果IDs);
        }
      };
      
      请求.onerror = (事件) => {
        console.error('批量添加日志条目失败:', 事件.target.error);
        reject(事件.target.error);
      };
    });
  });
}

/**
 * 查询日志条目
 * @param {Object} 查询条件 - 查询过滤条件
 * @param {Object} [配置] - 可选配置
 * @returns {Promise<Array<Object>>} 查询结果
 */
export async function 查询日志条目(查询条件 = {}, 配置 = {}) {
  const 数据库 = await 打开日志数据库(配置);
  const 实际配置 = 数据库.配置;
  
  return new Promise((resolve, reject) => {
    const 事务 = 数据库.transaction([实际配置.存储对象], 'readonly');
    const 存储 = 事务.objectStore(实际配置.存储对象);
    
    // 使用索引或游标根据查询条件过滤
    let 请求;
    
    if (查询条件.level) {
      const 索引 = 存储.index('level');
      请求 = 索引.getAll(查询条件.level);
    } else if (查询条件.category) {
      const 索引 = 存储.index('category');
      请求 = 索引.getAll(查询条件.category);
    } else if (查询条件.startTime && 查询条件.endTime) {
      const 范围 = IDBKeyRange.bound(查询条件.startTime, 查询条件.endTime);
      const 索引 = 存储.index('timestamp');
      请求 = 索引.getAll(范围);
    } else {
      请求 = 存储.getAll();
    }
    
    请求.onsuccess = (事件) => {
      let 结果 = 事件.target.result;
      
      // 应用其他过滤条件
      if (查询条件.limit) {
        结果 = 结果.slice(0, 查询条件.limit);
      }
      
      if (查询条件.offset) {
        结果 = 结果.slice(查询条件.offset);
      }
      
      if (查询条件.orderBy === 'desc') {
        结果.reverse();
      }
      
      resolve(结果);
    };
    
    请求.onerror = (事件) => {
      console.error('查询日志条目失败:', 事件.target.error);
      reject(事件.target.error);
    };
  });
}

/**
 * 清理旧日志条目
 * @param {IDBDatabase} 数据库 - 数据库实例
 * @param {Object} 配置 - 数据库配置
 * @returns {Promise<number>} 删除的日志条目数量
 */
async function 检查并清理旧日志(数据库, 配置) {
  return new Promise((resolve, reject) => {
    const 事务 = 数据库.transaction([配置.存储对象], 'readonly');
    const 存储 = 事务.objectStore(配置.存储对象);
    const 计数请求 = 存储.count();
    
    计数请求.onsuccess = (事件) => {
      const 总数 = 事件.target.result;
      
      // 如果日志数量超过阈值，进行清理
      if (总数 > 配置.清理阈值) {
        执行清理(数据库, 配置, 总数 - 配置.最大条目数 + 配置.清理阈值)
          .then(删除数量 => resolve(删除数量))
          .catch(错误 => reject(错误));
      } else {
        resolve(0);
      }
    };
    
    计数请求.onerror = (事件) => {
      reject(事件.target.error);
    };
  });
}

/**
 * 执行日志清理操作
 * @param {IDBDatabase} 数据库 - 数据库实例
 * @param {Object} 配置 - 数据库配置
 * @param {number} 要删除的数量 - 要删除的日志条目数量
 * @returns {Promise<number>} 实际删除的日志条目数量
 */
async function 执行清理(数据库, 配置, 要删除的数量) {
  return new Promise((resolve, reject) => {
    const 事务 = 数据库.transaction([配置.存储对象], 'readwrite');
    const 存储 = 事务.objectStore(配置.存储对象);
    const 索引 = 存储.index('timestamp');
    let 删除计数 = 0;
    
    // 使用游标查找最早的N条记录并删除
    const 游标请求 = 索引.openCursor();
    
    游标请求.onsuccess = (事件) => {
      const 游标 = 事件.target.result;
      
      if (游标 && 删除计数 < 要删除的数量) {
        // 删除当前记录
        const 删除请求 = 存储.delete(游标.primaryKey);
        删除请求.onsuccess = () => {
          删除计数++;
        };
        
        // 移动到下一条记录
        游标.continue();
      } else {
        // 完成清理
        resolve(删除计数);
      }
    };
    
    游标请求.onerror = (事件) => {
      reject(事件.target.error);
    };
  });
}

/**
 * 清空所有日志
 * @param {Object} [配置] - 可选配置
 * @returns {Promise<boolean>} 操作成功标志
 */
export async function 清空日志(配置 = {}) {
  const 数据库 = await 打开日志数据库(配置);
  const 实际配置 = 数据库.配置;
  
  return new Promise((resolve, reject) => {
    const 事务 = 数据库.transaction([实际配置.存储对象], 'readwrite');
    const 存储 = 事务.objectStore(实际配置.存储对象);
    const 清空请求 = 存储.clear();
    
    清空请求.onsuccess = () => {
      console.log('日志已清空');
      resolve(true);
    };
    
    清空请求.onerror = (事件) => {
      console.error('清空日志失败:', 事件.target.error);
      reject(事件.target.error);
    };
  });
}

/**
 * 获取日志统计信息
 * @param {Object} [配置] - 可选配置
 * @returns {Promise<Object>} 统计信息
 */
export async function 获取日志统计(配置 = {}) {
  const 数据库 = await 打开日志数据库(配置);
  const 实际配置 = 数据库.配置;
  
  return new Promise((resolve, reject) => {
    const 事务 = 数据库.transaction([实际配置.存储对象], 'readonly');
    const 存储 = 事务.objectStore(实际配置.存储对象);
    
    const 统计 = {
      总数: 0,
      各级别数量: {},
      各分类数量: {},
      最早记录时间: null,
      最新记录时间: null
    };
    
    // 获取总数
    const 计数请求 = 存储.count();
    
    计数请求.onsuccess = (事件) => {
      统计.总数 = 事件.target.result;
      
      // 如果没有记录，直接返回
      if (统计.总数 === 0) {
        resolve(统计);
        return;
      }
      
      // 使用游标遍历获取统计
      const 游标请求 = 存储.openCursor();
      
      游标请求.onsuccess = (事件) => {
        const 游标 = 事件.target.result;
        
        if (游标) {
          const 日志 = 游标.value;
          
          // 统计各级别数量
          if (日志.level) {
            统计.各级别数量[日志.level] = (统计.各级别数量[日志.level] || 0) + 1;
          }
          
          // 统计各分类数量
          if (日志.category) {
            统计.各分类数量[日志.category] = (统计.各分类数量[日志.category] || 0) + 1;
          }
          
          // 更新时间范围
          if (日志.timestamp) {
            if (!统计.最早记录时间 || 日志.timestamp < 统计.最早记录时间) {
              统计.最早记录时间 = 日志.timestamp;
            }
            
            if (!统计.最新记录时间 || 日志.timestamp > 统计.最新记录时间) {
              统计.最新记录时间 = 日志.timestamp;
            }
          }
          
          游标.continue();
        } else {
          // 遍历完成，返回统计结果
          resolve(统计);
        }
      };
      
      游标请求.onerror = (事件) => {
        reject(事件.target.error);
      };
    };
    
    计数请求.onerror = (事件) => {
      reject(事件.target.error);
    };
  });
}

/**
 * 关闭日志数据库
 * @returns {Promise<boolean>} 操作成功标志
 */
export function 关闭日志数据库() {
  return new Promise((resolve) => {
    if (数据库实例) {
      数据库实例.close();
      数据库实例 = null;
      console.log('日志数据库已关闭');
    }
    resolve(true);
  });
}

/**
 * 初始化数据库
 * @param {Object} [配置] - 数据库配置
 * @returns {Promise<IDBDatabase>} 数据库实例
 */
export async function 初始化数据库(配置 = {}) {
  return await 打开日志数据库(配置);
} 