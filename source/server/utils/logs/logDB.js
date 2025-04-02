/**
 * 日志数据库模块
 * 提供基于IndexedDB的高性能日志存储功能
 */

// 数据库配置
const 数据库配置 = {
    名称: 'SACAssetsManager_日志数据库',
    版本: 1,
    存储名称: '日志存储'
};

// 全局数据库连接对象
let 日志数据库;
console.log("初始化日志数据库")
/**
 * 初始化日志数据库
 * @returns {Promise} 返回表示数据库是否成功初始化的Promise
 */
export const 初始化数据库 = () => {
    return new Promise((resolve, reject) => {
        try {
            const 请求 = indexedDB.open(数据库配置.名称, 数据库配置.版本);
            
            请求.onerror = (事件) => {
                console.error('打开日志数据库失败:', 事件.target.error);
                reject(事件.target.error);
            };
            
            请求.onsuccess = (事件) => {
                日志数据库 = 事件.target.result;
                resolve();
            };
            
            请求.onupgradeneeded = (事件) => {
                const 数据库 = 事件.target.result;
                
                // 创建日志对象存储
                if (!数据库.objectStoreNames.contains(数据库配置.存储名称)) {
                    const 存储 = 数据库.createObjectStore(数据库配置.存储名称, { keyPath: 'id' });
                    
                    // 创建索引以便高效查询
                    存储.createIndex('时间', '时间', { unique: false });
                    存储.createIndex('级别', '级别', { unique: false });
                    存储.createIndex('来源', '来源', { unique: false });
                    
                }
            };
        } catch (错误) {
            console.error('初始化日志数据库失败:', 错误);
            reject(错误);
        }
    });
};

/**
 * 安全序列化对象
 * @param {any} 值 - 要序列化的值
 * @returns {string} 序列化后的字符串
 */
export const 安全序列化 = (值) => {
    if (值 === undefined) return '[未定义]';
    if (值 === null) return '[空]';
    if (typeof 值 === 'function') return '[函数]';
    if (typeof 值 === 'symbol') return 值.toString();
    
    if (typeof 值 === 'object' && 值 !== null) {
        try {
            JSON.stringify(值);
            return 值;
        } catch (e) {
            return '[复杂对象]';
        }
    }
    
    return 值;
};

/**
 * 序列化日志对象
 * @param {Object} 日志 - 原始日志对象
 * @returns {Object} 可序列化的日志对象
 */
export const 序列化日志 = (日志) => {
    try {
        const 可序列化日志 = {
            id: 日志.id || Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            时间: 日志.时间 || new Date().toISOString(),
            级别: 日志.级别 || 'info',
            内容: typeof 日志.内容 === 'object' ? 
                JSON.stringify(日志.内容, (key, value) => 安全序列化(value)) 
                : String(日志.内容 || ''),
            来源: String(日志.来源 || ''),
            元数据: 日志.元数据 ? 
                JSON.stringify(日志.元数据, (key, value) => 安全序列化(value)) 
                : null,
            标签: Array.isArray(日志.标签) ? JSON.stringify(日志.标签) : null,
            包含结构化数据: !!日志.元数据
        };
        
        // 移除所有不可序列化的字段
        delete 可序列化日志._elId;
        
        return 可序列化日志;
    } catch (错误) {
        console.error('序列化日志失败:', 错误);
        throw 错误;
    }
};

/**
 * 反序列化日志
 * @param {Object} 日志 - 数据库中的日志对象
 * @returns {Object} 反序列化后的日志对象
 */
export const 反序列化日志 = (日志) => {
    return {
        ...日志,
        元数据: 日志.元数据 ? JSON.parse(日志.元数据) : null,
        标签: 日志.标签 ? JSON.parse(日志.标签) : null
    };
};

/**
 * 保存日志到数据库（支持批量保存）
 * @param {Array} 日志列表 - 要保存的日志列表
 * @returns {Promise} 保存操作的Promise
 */
export const 保存日志 = (日志列表) => {
    return new Promise((resolve, reject) => {
        if (!日志数据库) {
            reject(new Error('日志数据库未初始化'));
            return;
        }
        
        const 事务 = 日志数据库.transaction([数据库配置.存储名称], 'readwrite');
        const 存储 = 事务.objectStore(数据库配置.存储名称);
        
        let 待完成计数 = 日志列表.length;
        let 出错 = false;
        
        // 监听事务完成
        事务.oncomplete = () => {
            if (!出错) resolve();
        };
        
        事务.onerror = (事件) => {
            出错 = true;
            reject(事件.target.error);
        };
        
        // 批量添加日志
        for (const 日志 of 日志列表) {
            try {
                const 可序列化日志 = 序列化日志(日志);
                
                const 请求 = 存储.add(可序列化日志);
                
                请求.onsuccess = () => {
                    待完成计数--;
                    if (待完成计数 === 0 && !出错) {
                        resolve();
                    }
                };
                
                请求.onerror = (事件) => {
                    console.error('保存日志失败:', 事件.target.error);
                    出错 = true;
                    reject(事件.target.error);
                };
            } catch (序列化错误) {
                console.error('序列化日志失败:', 序列化错误);
                出错 = true;
                reject(序列化错误);
            }
        }
    });
};

/**
 * 从数据库加载日志（支持分页）
 * @param {Number} 页码 - 起始页码
 * @param {Number} 每页数量 - 每页返回的日志数量
 * @returns {Promise<Array>} 返回日志列表的Promise
 */
export const 加载日志 = (页码 = 0, 每页数量 = 100) => {
    return new Promise((resolve, reject) => {
        if (!日志数据库) {
            reject(new Error('日志数据库未初始化'));
            return;
        }
        
        try {
            const 事务 = 日志数据库.transaction([数据库配置.存储名称], 'readonly');
            const 存储 = 事务.objectStore(数据库配置.存储名称);
            const 索引 = 存储.index('时间');
            
            // 使用游标进行分页
            const 日志列表 = [];
            let 跳过数量 = 页码 * 每页数量;
            let 已获取数量 = 0;
            
            const 请求 = 索引.openCursor(null, 'prev'); // 降序排列，最新的日志在前
            
            请求.onsuccess = (事件) => {
                const 游标 = 事件.target.result;
                
                if (游标) {
                    if (跳过数量 > 0) {
                        跳过数量--;
                        游标.continue();
                    } else if (已获取数量 < 每页数量) {
                        // 反序列化数据
                        const 反序列化日志对象 = 反序列化日志(游标.value);
                        日志列表.push(反序列化日志对象);
                        已获取数量++;
                        游标.continue();
                    } else {
                        resolve(日志列表);
                    }
                } else {
                    resolve(日志列表);
                }
            };
            
            请求.onerror = (事件) => {
                reject(事件.target.error);
            };
        } catch (错误) {
            reject(错误);
        }
    });
};

/**
 * 加载早于指定时间戳的日志
 * @param {String} 时间戳 - 时间戳
 * @param {Number} 数量 - 返回的最大日志数量
 * @returns {Promise<Array>} 返回日志列表的Promise
 */
export const 加载早于时间戳的日志 = (时间戳, 数量 = 100) => {
    return new Promise((resolve, reject) => {
        if (!日志数据库) {
            reject(new Error('日志数据库未初始化'));
            return;
        }
        
        try {
            const 事务 = 日志数据库.transaction([数据库配置.存储名称], 'readonly');
            const 存储 = 事务.objectStore(数据库配置.存储名称);
            const 索引 = 存储.index('时间');
            
            // 设置时间范围，查找早于指定时间戳的日志
            const 范围 = IDBKeyRange.upperBound(时间戳, true);
            
            const 日志列表 = [];
            let 已获取数量 = 0;
            
            const 请求 = 索引.openCursor(范围, 'prev'); // 降序排列
            
            请求.onsuccess = (事件) => {
                const 游标 = 事件.target.result;
                
                if (游标 && 已获取数量 < 数量) {
                    // 反序列化数据
                    const 反序列化日志对象 = 反序列化日志(游标.value);
                    日志列表.push(反序列化日志对象);
                    已获取数量++;
                    游标.continue();
                } else {
                    resolve(日志列表);
                }
            };
            
            请求.onerror = (事件) => {
                reject(事件.target.error);
            };
        } catch (错误) {
            reject(错误);
        }
    });
};

/**
 * 按级别过滤日志
 * @param {Array} 日志列表 - 原始日志列表
 * @param {string} 级别 - 日志级别
 * @returns {Array} 过滤后的日志列表
 */
export const 按级别过滤 = (日志列表, 级别) => {
    if (!级别) return 日志列表;
    return 日志列表.filter(日志 => 日志.级别 === 级别);
};

/**
 * 按时间范围过滤日志
 * @param {Array} 日志列表 - 原始日志列表
 * @param {string} 开始时间 - 开始时间
 * @param {string} 结束时间 - 结束时间
 * @returns {Array} 过滤后的日志列表
 */
export const 按时间范围过滤 = (日志列表, 开始时间, 结束时间) => {
    let 结果 = 日志列表;
    
    if (开始时间) {
        结果 = 结果.filter(日志 => new Date(日志.时间) >= new Date(开始时间));
    }
    
    if (结束时间) {
        结果 = 结果.filter(日志 => new Date(日志.时间) <= new Date(结束时间));
    }
    
    return 结果;
};

/**
 * 按来源过滤日志
 * @param {Array} 日志列表 - 原始日志列表
 * @param {string} 来源 - 日志来源
 * @returns {Array} 过滤后的日志列表
 */
export const 按来源过滤 = (日志列表, 来源) => {
    if (!来源) return 日志列表;
    return 日志列表.filter(日志 => 日志.来源 === 来源);
};

/**
 * 按内容过滤日志
 * @param {Array} 日志列表 - 原始日志列表
 * @param {string} 内容 - 搜索内容
 * @returns {Array} 过滤后的日志列表
 */
export const 按内容过滤 = (日志列表, 内容) => {
    if (!内容) return 日志列表;
    
    const 搜索词 = 内容.toLowerCase();
    return 日志列表.filter(日志 => 
        日志.内容 && String(日志.内容).toLowerCase().includes(搜索词)
    );
};

/**
 * 按条件查询日志
 * @param {Object} 条件 - 查询条件
 * @param {Number} 数量 - 返回的最大日志数量
 * @returns {Promise<Array>} 返回日志列表的Promise
 */
export const 按条件查询日志 = (条件 = {}, 数量 = 100) => {
    return new Promise((resolve, reject) => {
        if (!日志数据库) {
            reject(new Error('日志数据库未初始化'));
            return;
        }
        
        try {
            // 首先加载所有日志，然后在内存中筛选
            加载日志(0, 数量 * 10).then(日志列表 => {
                // 应用各种过滤器
                let 过滤后日志 = 日志列表;
                过滤后日志 = 按级别过滤(过滤后日志, 条件.级别);
                过滤后日志 = 按时间范围过滤(过滤后日志, 条件.开始时间, 条件.结束时间);
                过滤后日志 = 按来源过滤(过滤后日志, 条件.来源);
                过滤后日志 = 按内容过滤(过滤后日志, 条件.内容);
                
                // 限制返回数量
                resolve(过滤后日志.slice(0, 数量));
            }).catch(错误 => {
                reject(错误);
            });
        } catch (错误) {
            reject(错误);
        }
    });
};

/**
 * 获取数据库中的日志总数
 * @returns {Promise<Number>} 返回日志总数的Promise
 */
export const 获取日志计数 = () => {
    return new Promise((resolve, reject) => {
        if (!日志数据库) {
            reject(new Error('日志数据库未初始化'));
            return;
        }
        
        try {
            const 事务 = 日志数据库.transaction([数据库配置.存储名称], 'readonly');
            const 存储 = 事务.objectStore(数据库配置.存储名称);
            
            const 计数请求 = 存储.count();
            
            计数请求.onsuccess = () => {
                resolve(计数请求.result);
            };
            
            计数请求.onerror = (事件) => {
                reject(事件.target.error);
            };
        } catch (错误) {
            reject(错误);
        }
    });
};

/**
 * 清空日志数据库
 * @returns {Promise} 清空操作的Promise
 */
export const 清空日志数据库 = () => {
    return new Promise((resolve, reject) => {
        if (!日志数据库) {
            reject(new Error('日志数据库未初始化'));
            return;
        }
        
        try {
            const 事务 = 日志数据库.transaction([数据库配置.存储名称], 'readwrite');
            const 存储 = 事务.objectStore(数据库配置.存储名称);
            
            const 请求 = 存储.clear();
            
            请求.onsuccess = () => {
                resolve();
            };
            
            请求.onerror = (事件) => {
                reject(事件.target.error);
            };
        } catch (错误) {
            reject(错误);
        }
    });
};

/**
 * 获取数据库状态
 * @returns {Object} 数据库状态对象
 */
export const 获取数据库状态 = () => {
    return {
        已连接: !!日志数据库,
        数据库名称: 数据库配置.名称,
        数据库版本: 数据库配置.版本
    };
};

// 导出数据库配置
export const 配置 = 数据库配置; 