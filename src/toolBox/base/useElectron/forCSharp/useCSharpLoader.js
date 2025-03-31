/**
 * C#加载工具
 * 提供在Electron环境中加载和调用C#代码的功能
 */

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
 * 加载C#函数
 * 根据C#代码字符串创建可调用的函数
 * 
 * @param {String} 代码字符串 - C#代码字符串
 * @returns {Function} 返回一个可调用的异步函数
 */
export const 加载C井函数 = (代码字符串) => {
    // 懒加载CPU核心数和edge模块
    if (!CPU核心数) {
        try {
            CPU核心数 = require('os').cpus().length;
        } catch (e) {
            CPU核心数 = 4; // 默认值
            console.warn('无法获取CPU核心数，使用默认值4');
        }
    }
    
    let edge;
    try {
        edge = require('electron-edge-js');
    } catch (e) {
        console.error('加载electron-edge-js失败', e);
        // 返回一个始终抛出错误的函数
        return async () => { 
            throw new Error('electron-edge-js模块不可用，无法调用C#函数'); 
        };
    }
    
    // 检查进程映射中是否已有该函数
    const 键 = 代码字符串;
    let 函数列表 = [];
    
    if (进程映射.has(键)) {
        函数列表 = 进程映射.get(键);
    } else {
        // 创建第一个函数实例
        const 函数 = edge.func(代码字符串 + '\n//process:0');
        函数列表.push({ 函数, busy: false, index: 0 });
        进程映射.set(键, 函数列表);
    }
    
    // 返回一个函数，该函数会在调用时选择可用的函数实例
    return async (...参数) => {
        // 查找空闲的函数实例
        let 函数实例 = 函数列表.find(项 => !项.busy);
        
        if (函数实例) {
            // 使用找到的空闲实例
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
        } else {
            // 如果没有空闲实例，且已达到CPU核心数上限，则重用第一个实例
            if (函数列表.length >= CPU核心数) {
                函数列表[0].busy = true;
                let 结果 = null;
                try {
                    结果 = await 创建回调Promise(函数列表[0].函数)(...参数);
                } catch (e) {
                    console.error('C#函数调用出错', e);
                } finally {
                    函数列表[0].busy = false;
                }
                return 结果;
            } else {
                // 创建新的函数实例
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
            }
        }
    };
};

/**
 * 加载C#文件
 * 从文件加载C#代码并创建可调用的函数
 * 
 * @param {String} 文件路径 - C#文件路径
 * @returns {Function} 返回一个可调用的异步函数
 */
export const 加载C井文件 = (文件路径) => {
    let edge;
    let fs;
    
    try {
        edge = require('electron-edge-js');
        fs = require('fs');
    } catch (e) {
        console.error('加载所需模块失败', e);
        // 返回一个始终抛出错误的函数
        return async () => { 
            throw new Error('所需模块不可用，无法调用C#函数'); 
        };
    }
    
    try {
        const 代码字符串 = fs.readFileSync(文件路径, 'utf-8');
        return edge.func(代码字符串);
    } catch (e) {
        console.error(`无法加载C#文件: ${文件路径}`, e);
        // 返回一个始终抛出错误的函数
        return async () => { 
            throw new Error(`无法加载C#文件: ${文件路径}`); 
        };
    }
};

/**
 * 设置dll路径
 * 解决Windows下非ASCII字符路径问题
 * 
 * @returns {void}
 */
export const 设置DLL路径 = () => {
    try {
        const path = require('path');
        const fs = require('fs-extra');
        
        // 思源配置对象需在全局可用
        if (!global.siyuanConfig || !global.siyuanConfig.system) {
            console.warn('无法获取思源配置，DLL路径设置失败');
            return;
        }
        
        // 原始 DLL 文件的路径
        const 思源工作空间路径 = global.siyuanConfig.system.workspaceDir;
        const 原始DLL路径 = path.join(思源工作空间路径, '/data/plugins/SACAssetsManager/node_modules/electron-edge-js/node_modules/edge-cs/lib/').replace(/\\/g, '/');
        
        // 新的软链接位置，位于用户配置目录下
        const 新DLL链接路径 = path.join(process.env.ALLUSERSPROFILE, "sac").replace(/\\/g, '/');
        
        // 创建目录如果不存在
        if (!fs.existsSync(新DLL链接路径)) {
            fs.mkdirSync(新DLL链接路径, { recursive: true });
        }

        // 复制整个目录
        try {
            fs.copySync(原始DLL路径, 新DLL链接路径);
        } catch (e) {
            console.warn('复制DLL文件失败', e);
        }
        
        // 设置环境变量
        process.env.EDGE_CS_NATIVE = (path.join(新DLL链接路径, 'edge-cs.dll')).replace(/\\/g, '/');
    } catch (e) {
        console.error('设置DLL路径失败', e);
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