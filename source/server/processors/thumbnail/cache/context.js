import { statWithCatch } from '../../fs/stat.js'
import { 获取哈希并写入数据库 } from '../../fs/stat.js'
import { imageExtensions, 是否不需要单独缩略图 } from '../utils/lists.js'
import { getCommonLoader, getLoader } from '../loaders/query.js'
import { getCachePath } from '../../fs/cached/fs.js'
import { getFileExtension } from '../../../../utils/fs/extension.js'
import { 内置缩略图生成器序列 } from '../loaders/internal.js'
import { 日志 } from "../../../../../src/toolBox/base/useEcma/forLogs/useLogger.js"

const fs = require('fs')
export const 创建缩略图生成上下文 = async (imagePath, loaderID = null) => {
    const 请求ID = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const 开始时间 = performance.now();
    
    日志.调试(`开始创建缩略图生成上下文: ${imagePath}`, 'ThumbnailContext', {
        元数据: {
            请求ID,
            源文件路径: imagePath,
            指定生成器ID: loaderID
        },
        标签: ['缩略图', '上下文', '开始']
    });
    
    imagePath = imagePath.replace(/\\/g, '/');
    const extension = getFileExtension(imagePath);
    let useExtension = 是否不需要单独缩略图(extension);
    
    日志.调试(`解析文件扩展名: ${extension}`, 'ThumbnailContext', {
        元数据: {
            请求ID,
            源文件路径: imagePath,
            扩展名: extension,
            使用扩展名缩略图: useExtension ? '是' : '否'
        },
        标签: ['缩略图', '上下文', '扩展名']
    });
    
    let loader = await getLoader(imagePath, loaderID, 内置缩略图生成器序列);
    if (!loader) {
        日志.警告(`未找到适配的生成器，使用默认生成器`, 'ThumbnailContext', {
            元数据: {
                请求ID,
                源文件路径: imagePath,
                指定生成器ID: loaderID
            },
            标签: ['缩略图', '上下文', '生成器回退']
        });
        loader = await getCommonLoader();
    } else {
        日志.调试(`找到适配的生成器: ${loader.id}`, 'ThumbnailContext', {
            元数据: {
                请求ID,
                源文件路径: imagePath,
                生成器ID: loader.id,
                生成器名称: loader.name,
                支持系统: loader.sys
            },
            标签: ['缩略图', '上下文', '生成器匹配']
        });
    }
    
    const stat = await statWithCatch(imagePath);
    if (!stat) {
        // 如果是空目录，使用默认的目录状态
        const 默认目录状态 = {
            type: 'dir',
            size: 0,
            birthtime: new Date(),
            mtime: new Date(),
            ctime: new Date(),
            atime: new Date()
        };
        
        日志.调试(`使用默认目录状态`, 'ThumbnailContext', {
            元数据: {
                请求ID,
                源文件路径: imagePath,
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '上下文', '默认目录状态']
        });
        
        return {
            extension: 'dir',
            useExtension: true,
            useRaw: false,
            loader: await getCommonLoader(),
            stat: 默认目录状态,
            hash: 'dir_' + Date.now(),
            fixedPath: imagePath,
            cacheDir: (await getCachePath(imagePath, 'thumbnails')).cachePath,
            hashedName: 'dir.thumbnail.png',
            targetPath: null,
            extensionThumbnailPath: null,
            请求ID
        };
    }
    
    // 如果是文件夹,直接返回一个特殊的上下文
    if (stat.type === 'dir') {
        日志.调试(`检测到文件夹,使用文件夹缩略图`, 'ThumbnailContext', {
            元数据: {
                请求ID,
                源文件路径: imagePath,
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '上下文', '文件夹处理']
        });
        return {
            extension: 'dir',
            useExtension: true,
            useRaw: false,
            loader: await getCommonLoader(),
            stat,
            hash: 'dir_' + Date.now(),
            fixedPath: imagePath,
            cacheDir: (await getCachePath(imagePath, 'thumbnails')).cachePath,
            hashedName: 'dir.thumbnail.png',
            targetPath: null,
            extensionThumbnailPath: null,
            请求ID
        };
    }
    
    日志.调试(`获取到文件状态信息`, 'ThumbnailContext', {
        元数据: {
            请求ID,
            源文件路径: imagePath,
            文件大小: `${(stat.size / 1024).toFixed(2)}KB`,
            创建时间: stat.birthtime,
            修改时间: stat.mtime
        },
        标签: ['缩略图', '上下文', '文件状态']
    });
    
    let useRaw = false;
    if (imageExtensions.includes(extension) && stat.size < 1024 * 1024 * 1) {
        useRaw = true;
        日志.调试(`文件符合直接使用条件，将使用原始图片`, 'ThumbnailContext', {
            元数据: {
                请求ID,
                源文件路径: imagePath,
                文件大小: `${(stat.size / 1024).toFixed(2)}KB`,
                扩展名: extension
            },
            标签: ['缩略图', '上下文', '使用原图']
        });
    }
    
    const hash = await 获取哈希并写入数据库(stat);
    
    日志.调试(`计算文件哈希完成: ${hash}`, 'ThumbnailContext', {
        元数据: {
            请求ID,
            源文件路径: imagePath,
            文件哈希: hash
        },
        标签: ['缩略图', '上下文', '哈希计算']
    });
    
    const cacheDir = (await getCachePath(imagePath, 'thumbnails')).cachePath;
    
    if (!fs.existsSync(cacheDir)) {
        日志.信息(`缓存目录不存在，创建目录: ${cacheDir}`, 'ThumbnailContext', {
            元数据: {
                请求ID,
                缓存目录: cacheDir
            },
            标签: ['缩略图', '上下文', '创建目录']
        });
        fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    const hashedName = hash + '.thumbnail.png';
    const targetPath = require('path').join(cacheDir, hashedName);
    const extensionThumbnailPath = require('path').join(cacheDir, `${extension}.thumbnail.png`);
    
    const 上下文 = {
        extension,
        useExtension,
        useRaw,
        loader,
        stat,
        hash,
        fixedPath: imagePath,
        cacheDir,
        hashedName,
        targetPath,
        extensionThumbnailPath
    };
    
    日志.信息(`缩略图上下文创建完成`, 'ThumbnailContext', {
        元数据: {
            请求ID,
            源文件路径: imagePath,
            目标路径: targetPath,
            使用原图: useRaw ? '是' : '否',
            生成器ID: loader.id,
            处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
        },
        标签: ['缩略图', '上下文', '完成']
    });
    
    return 上下文;
}

