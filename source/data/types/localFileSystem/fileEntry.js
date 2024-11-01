import { 柯里化 } from '../../../utils/functions/currying.js';
const fs = require('fs').promises;
const path = require('path');

// 工具函数：参数校验
const validatePath = (filePath) => {
    if (!filePath || typeof filePath !== 'string') {
        throw new Error('文件路径必须是有效的字符串');
    }
    return path.normalize(filePath);
};

const validateFunction = (fn, name) => {
    if (typeof fn !== 'function') {
        throw new Error(`${name} 必须是一个函数`);
    }
    return fn;
};



// 柯里化添加只读方法
const $addReadOnlyMethod = 柯里化((obj, methodName, fn) => {
    validateFunction(fn, methodName);
    Object.defineProperty(obj, methodName, {
        value: fn,
        writable: false,
        configurable: false
    });
    return obj;
});

// 柯里化批量添加只读方法
const $batchAddReadOnly = 柯里化((obj, methods) => {
    Object.entries(methods).forEach(([name, fn]) => {
        $addReadOnlyMethod(obj)(name)(fn);
    });
    return obj;
});

// 创建基础信息方法
const 创建基础方法 = (当前路径, 文件状态) => ({
    获取名称: () => path.basename(当前路径),
    获取路径: () => 当前路径,
    是目录: () => 文件状态?.isDirectory() || false,
    是文件: () => 文件状态?.isFile() || false,
    获取大小: () => 文件状态?.size || 0,
    获取创建时间: () => 文件状态?.birthtime,
    获取修改时间: () => 文件状态?.mtime,
    获取访问时间: () => 文件状态?.atime
});

// 创建文件操作方法
const 创建文件操作 = (当前路径, 文件实体, 文件状态) => ({
    移动: async (目标路径) => {
        try {
            const 规范化路径 = validatePath(目标路径);
            await fs.rename(当前路径, 规范化路径);
            当前路径 = 规范化路径;
            return 文件实体;
        } catch (错误) {
            throw new Error(`移动文件失败: ${错误.message}`);
        }
    },

    删除: async () => {
        try {
            if (文件状态.isDirectory()) {
                await fs.rmdir(当前路径, { recursive: true });
            } else {
                await fs.unlink(当前路径);
            }
        } catch (错误) {
            throw new Error(`删除文件失败: ${错误.message}`);
        }
    },

    复制: async (目标路径) => {
        try {
            const 规范化路径 = validatePath(目标路径);
            if (文件状态.isDirectory()) {
                await fs.cp(当前路径, 规范化路径, { recursive: true });
            } else {
                await fs.copyFile(当前路径, 规范化路径);
            }
            return 创建本地文件实体(规范化路径);
        } catch (错误) {
            throw new Error(`复制文件失败: ${错误.message}`);
        }
    }
});

// 创建错误处理包装器
const 创建错误处理器 = (函数, 错误信息) => async (...参数) => {
    try {
        return await 函数(...参数);
    } catch (错误) {
        throw new Error(`${错误信息}: ${错误.message}`);
    }
};

const 创建本地文件实体 = async (文件路径) => {
    let 当前路径 = validatePath(文件路径);
    let 文件状态 = null;
    const 文件实体 = {};

    // 初始化文件状态
    const 初始化 = 创建错误处理器(
        async () => {
            文件状态 = await fs.stat(当前路径);
            return 文件实体;
        },
        '无法获取文件信息'
    );

    // 添加基础方法
    const 添加到文件实体 = $batchAddReadOnly(文件实体);

    // 添加基础信息方法
    添加到文件实体(创建基础方法(当前路径, 文件状态));

    // 添加文件操作方法
    添加到文件实体(创建文件操作(当前路径, 文件实体, 文件状态));

    await 初始化();
    return Object.freeze(文件实体);
};
//始终使用esm导出
export const 从描述创建文件实体 = async (描述对象) => {
    // 校验描述对象
    if (!描述对象 || typeof 描述对象 !== 'object') {
        throw new Error('描述对象必须是一个有效的对象');
    }

    // 校验必要的文件路径属性（支持 path 或 localPath）
    const 文件路径 = 描述对象.path || 描述对象.localPath;
    if (!文件路径) {
        throw new Error('描述对象必须包含 path 或 localPath 属性');
    }

    // 调用创建本地文件实体函数
    try {
        return await 创建本地文件实体(文件路径);
    } catch (错误) {
        throw new Error(`从描述创建文件实体失败: ${错误.message}`);
    }
};
