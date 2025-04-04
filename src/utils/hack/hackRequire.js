/**
 * 自定义require实现模块
 * 
 * 提供了扩展的require功能，能够从指定的外部路径加载模块。
 * 主要功能：
 * 1. 保存原始require引用
 * 2. 提供自定义搜索路径机制
 * 3. 允许设置外部依赖目录
 */

// 基础依赖
const path = require("path");
const fs = require("fs");

// 保存原始require引用
const 原始Require = window.require;
window.realRequire = 原始Require;

/**
 * 从外部依赖路径中查找模块
 * @param {string} 模块名称 - 要查找的模块名称
 * @returns {Object} 包含是否找到标志和模块路径的对象
 */
const 从外部路径查找模块 = (模块名称) => {
    if (!global.ExternalDepPathes || global.ExternalDepPathes.length === 0) {
        return { 找到: false };
    }

    let 找到 = false;
    let 模块路径 = null;
    let 最终模块路径 = null;

    // 遍历所有外部依赖路径
    global.ExternalDepPathes.forEach((依赖路径) => {
        const 当前路径 = path.join(依赖路径, 模块名称);
        
        if (fs.existsSync(当前路径) && !找到) {
            console.warn(`模块${模块名称}未找到，重定向到${当前路径}`);
            最终模块路径 = 当前路径;
            模块路径 = 当前路径;
            找到 = true;
        } else if (fs.existsSync(当前路径) && 找到) {
            console.warn(
                `模块${模块名称}在${模块路径}已经找到，请检查外部路径${当前路径}是否重复安装`
            );
        }
    });

    return { 找到, 模块路径: 最终模块路径 };
};

/**
 * 修改模块加载机制
 */
const 修改模块加载机制 = () => {
    // 确保module对象存在
    if (!module) return;
    
    // 保存原始load方法
    const 原始Load = module.__proto__.load;
    
    // 如果已经被hack过，不再重复hack
    if (原始Load.hacked) return;
    
    // 重写模块加载方法
    module.__proto__.load = function(文件名) {
        let 原始文件名 = 文件名;
        
        try {
            // 尝试使用原始方法加载
            原始Load.bind(this)(文件名);
        } catch (错误) {
            // 处理模块未找到的情况
            if (
                错误.message.indexOf("Cannot find module") >= 0 &&
                错误.message.indexOf(文件名) >= 0
            ) {
                // 从外部依赖路径查找
                const { 找到, 模块路径 } = 从外部路径查找模块(文件名);
                
                if (找到) {
                    try {
                        原始Load.bind(this)(模块路径);
                    } catch (内部错误) {
                        console.error("加载重定向模块失败", 内部错误);
                        throw new Error(`无法加载模块${原始文件名}`);
                    }
                } else {
                    console.error(错误);
                    throw new Error(`无法加载模块${原始文件名}`);
                }
            } else {
                throw 错误;
            }
        }
    };
    
    // 标记为已hack
    module.__proto__.load.hacked = true;
};

/**
 * 自定义require函数
 * @param {string} 模块名称 - 要加载的模块名称
 * @param {string} 基础路径 - 基础路径（可选）
 * @returns {any} 加载的模块
 */
const 自定义Require = function(模块名称, 基础路径) {
    // 修改模块加载机制
    修改模块加载机制();
    
    // 确保realRequire在window对象上存在
    if (!window.realRequire) {
        window.realRequire = 原始Require;
    }
    
    // 确定this上下文
    let 上下文 = window;
    if (this) {
        上下文 = this;
    }
    
    // 处理基础路径
    if (基础路径) {
        模块名称 = path.resolve(基础路径, 模块名称);
    }
    
    try {
        // 尝试常规加载
        if (上下文.realRequire) {
            return 上下文.realRequire(模块名称);
        } else {
            return window.realRequire(模块名称);
        }
    } catch (错误) {
        // 处理模块未找到的情况
        if (错误.message.indexOf("Cannot find module") >= 0) {
            // 对非路径模块名进行处理
            if (
                !(
                    模块名称.startsWith("/") ||
                    模块名称.startsWith("./") ||
                    模块名称.startsWith("../")
                )
            ) {
                // 从外部依赖路径查找
                const { 找到, 模块路径 } = 从外部路径查找模块(模块名称);
                
                if (找到) {
                    模块名称 = 模块路径;
                }
            } else {
                // 处理相对路径
                模块名称 = path.resolve(module.path, 模块名称);
            }
            
            // 重新尝试加载
            try {
                return 上下文.realRequire(模块名称);
            } catch (内部错误) {
                throw 内部错误;
            }
        } else {
            throw 错误;
        }
    }
};

// 替换window.require
window.require = 自定义Require;

// 修复electron模块中的require
if (window.realRequire && window.realRequire.cache) {
    window.realRequire.cache.electron.__proto__.realRequire =
        window.realRequire.cache.electron.__proto__.require;
    window.realRequire.cache.electron.__proto__.require = 自定义Require;
}

/**
 * 设置外部依赖路径
 * @param {string} 依赖路径 - 外部依赖目录路径
 */
window.require.setExternalDeps = (依赖路径) => {
    if (!global.ExternalDepPathes) {
        global.ExternalDepPathes = [];
    }
    
    if (依赖路径 && !global.ExternalDepPathes.indexOf(依赖路径) >= 0) {
        global.ExternalDepPathes.push(依赖路径);
        // 去重
        global.ExternalDepPathes = Array.from(new Set(global.ExternalDepPathes));
    }
};

/**
 * 设置外部基础路径（只能设置一次）
 * @param {string} 基础路径 - 外部依赖基础目录路径
 */
window.require.setExternalBase = (基础路径) => {
    if (!global.ExternalDepPathes) {
        global.ExternalDepPathes = [];
    }
    
    if (!global.ExternalBase) {
        global.ExternalBase = 基础路径;
        global.ExternalDepPathes.push(基础路径);
    } else {
        console.error("不能重复设置外部依赖基础路径");
    }
};