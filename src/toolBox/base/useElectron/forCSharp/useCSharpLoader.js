/**
 * C#加载工具
 * 提供在Electron环境中加载和调用C#代码的功能
 */
import { 设置DLL路径 } from './forEdgejsFix.js';
await 设置DLL路径()
// CPU核心数，用于并行处理
let CPU核心数;

// 进程映射，用于管理C#函数实例
const 进程映射 = new Map();

/**
 * 创建回调Promise
 * 将回调风格的函数转换为Promise风格
 * 
 * @param {Function} 函数 - 要转换的回调风格函数
 * @returns {Function} 返回一个Promise风格的函数
 */
const 创建回调Promise = (函数) => {
    return (...参数) => {
        return new Promise((resolve, reject) => {
            try {
                函数(...参数, (错误, 结果) => {
                    try {
                        if (错误) {
                            reject(错误);
                        } else {
                            resolve(结果);
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            } catch (e) {
                reject(e);
            }
        });
    };
};

/**
 * 初始化环境
 * 懒加载CPU核心数
 * 
 * @returns {void}
 */
const 初始化环境 = () => {
    if (!CPU核心数) {
        try {
            CPU核心数 = require('os').cpus().length;
        } catch (e) {
            CPU核心数 = 4; // 默认值
            console.warn('无法获取CPU核心数，使用默认值4');
        }
    }
};

/**
 * 加载Edge模块
 * 
 * @returns {Object|null} Edge模块对象或null（如果加载失败）
 */
const 加载Edge模块 = () => {
    try {
        return require('electron-edge-js');
    } catch (e) {
        console.error('加载electron-edge-js失败', e);
        return null;
    }
};

/**
 * 获取函数实例列表
 * 从进程映射中获取函数实例列表，如果不存在则创建
 * 
 * @param {String} 键 - 代码字符串作为键
 * @param {Object} edge - Edge模块对象
 * @returns {Array} 函数实例列表
 */
const 获取函数实例列表 = (键, edge) => {
    let 函数列表 = [];
    
    if (进程映射.has(键)) {
        函数列表 = 进程映射.get(键);
    } else {
        // 创建第一个函数实例
        const 函数 = edge.func(键 + '\n//process:0');
        函数列表.push({ 函数, busy: false, index: 0 });
        进程映射.set(键, 函数列表);
    }
    
    return 函数列表;
};

/**
 * 执行现有函数实例
 * 执行一个已存在的函数实例
 * 
 * @param {Object} 函数实例 - 要执行的函数实例
 * @param {Array} 参数 - 执行参数
 * @returns {Promise<any>} 执行结果
 */
const 执行现有函数实例 = async (函数实例, 参数) => {
    函数实例.busy = true;
    let 结果 = null;
    try {
        结果 = await 创建回调Promise(函数实例.函数)(...参数);
    } catch (e) {
        console.error('C#函数调用出错', e);
    } finally {
        函数实例.busy = false;
    }
    return 结果;
};

/**
 * 创建并执行新函数实例
 * 创建一个新的函数实例并执行
 * 
 * @param {String} 代码字符串 - C#代码字符串
 * @param {Array} 函数列表 - 现有函数实例列表
 * @param {Object} edge - Edge模块对象
 * @param {Array} 参数 - 执行参数
 * @returns {Promise<any>} 执行结果
 */
const 创建并执行新函数实例 = async (代码字符串, 函数列表, edge, 参数) => {
    const 函数 = edge.func(代码字符串 + '\n//process:' + 函数列表.length);
    const 新实例 = { 函数, busy: true, index: 函数列表.length };
    函数列表.push(新实例);
    
    let 结果 = null;
    try {
        结果 = await 创建回调Promise(函数)(...参数);
    } catch (e) {
        console.error('C#函数调用出错', e);
    } finally {
        新实例.busy = false;
    }
    return 结果;
};

/**
 * 加载C#函数
 * 根据C#代码字符串创建可调用的函数
 * 
 * @param {String} 代码字符串 - C#代码字符串
 * @returns {Function} 返回一个可调用的异步函数
 */
export const 加载C井函数 = (代码字符串) => {
    // 初始化环境
    初始化环境();
    
    // 加载Edge模块
    const edge = 加载Edge模块();
    if (!edge) {
        return async () => { 
            throw new Error('electron-edge-js模块不可用，无法调用C#函数'); 
        };
    }
    
    // 获取函数实例列表
    const 函数列表 = 获取函数实例列表(代码字符串, edge);
    
    // 返回一个函数，该函数会在调用时选择可用的函数实例
    return async (...参数) => {
        // 查找空闲的函数实例
        let 函数实例 = 函数列表.find(项 => !项.busy);
        
        if (函数实例) {
            // 使用找到的空闲实例
            return 执行现有函数实例(函数实例, 参数);
        } else {
            // 如果没有空闲实例，且已达到CPU核心数上限，则重用第一个实例
            if (函数列表.length >= CPU核心数) {
                return 执行现有函数实例(函数列表[0], 参数);
            } else {
                // 创建新的函数实例
                return 创建并执行新函数实例(代码字符串, 函数列表, edge, 参数);
            }
        }
    };
};

/**
 * 加载文件所需模块
 * 
 * @returns {Object|null} 包含edge和fs的对象，或null（如果加载失败）
 */
const 加载文件所需模块 = () => {
    try {
        return {
            edge: require('electron-edge-js'),
            fs: require('fs')
        };
    } catch (e) {
        console.error('加载所需模块失败', e);
        return null;
    }
};

/**
 * 读取文件内容
 * 
 * @param {String} 文件路径 - 要读取的文件路径
 * @param {Object} fs - 文件系统模块
 * @returns {String|null} 文件内容或null（如果读取失败）
 */
const 读取文件内容 = (文件路径, fs) => {
    try {
        return fs.readFileSync(文件路径, 'utf-8');
    } catch (e) {
        console.error(`无法读取文件: ${文件路径}`, e);
        return null;
    }
};

/**
 * 加载C#文件
 * 从文件加载C#代码并创建可调用的函数
 * 
 * @param {String} 文件路径 - C#文件路径
 * @returns {Function} 返回一个可调用的异步函数
 */
export const 加载C井文件 = (文件路径) => {
    const 模块 = 加载文件所需模块();
    
    if (!模块) {
        return async () => { 
            throw new Error('所需模块不可用，无法调用C#函数'); 
        };
    }
    
    const 代码字符串 = 读取文件内容(文件路径, 模块.fs);
    
    if (!代码字符串) {
        return async () => { 
            throw new Error(`无法加载C#文件: ${文件路径}`); 
        };
    }
    
    try {
        return 模块.edge.func(代码字符串);
    } catch (e) {
        console.error(`无法编译C#代码: ${文件路径}`, e);
        return async () => { 
            throw new Error(`无法编译C#代码: ${文件路径}`); 
        };
    }
};


await 设置DLL路径()
// 兼容原始导出
export const loadCsharpFunc = 加载C井函数;
export const loadCsharpFile = 加载C井文件;
export const setupDllPaths = 设置DLL路径;

// 导出统一接口
export const 使用C井 = {
    加载C井函数,
    加载C井文件,
    设置DLL路径
}; 