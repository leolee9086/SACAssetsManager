import { buildCache } from '../../cache/cache.js'
import { asyncReadFile } from '../../fs/utils/withExists.js'
import { 日志 } from "../../../../../src/toolBox/base/useEcma/forLogs/useLogger.js"

const tumbnailCache = buildCache('thumbnailCache')

// 处理内存缓存查询
async function 查询内存缓存(ctx) {
    const { hash, fixedPath } = ctx;
    const 请求ID = ctx.请求ID || Date.now().toString(36) + Math.random().toString(36).substr(2);
    const 开始时间 = performance.now();
    
    日志.调试(`开始查询内存缓存: ${fixedPath}`, 'ThumbnailCache', {
        元数据: {
            请求ID,
            源文件路径: fixedPath,
            文件哈希: hash
        },
        标签: ['缩略图', '缓存', '内存查询']
    });
    
    const cacheResult = tumbnailCache.get(hash);
    if (cacheResult) {
        const 大小 = Buffer.isBuffer(cacheResult) 
            ? `${(cacheResult.length / 1024).toFixed(2)}KB`
            : (cacheResult.data ? `${(cacheResult.data.length / 1024).toFixed(2)}KB` : '未知');
            
        日志.调试(`内存缓存命中: ${fixedPath}`, 'ThumbnailCache', {
            元数据: {
                请求ID,
                源文件路径: fixedPath,
                缓存大小: 大小,
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '缓存', '内存命中']
        });
        return cacheResult;
    }
    
    日志.调试(`内存缓存未命中: ${fixedPath}`, 'ThumbnailCache', {
        元数据: {
            请求ID,
            源文件路径: fixedPath,
            处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
        },
        标签: ['缩略图', '缓存', '内存未命中']
    });
    return null;
}

async function 查询eagle缩略图(ctx) {
    const imageName = ctx.fixedPath;
    const 请求ID = ctx.请求ID || Date.now().toString(36) + Math.random().toString(36).substr(2);
    const 开始时间 = performance.now();
    const eagle缩略图名 = imageName.replace(`.${ctx.extension}`,'').trim()+'_thumbnail.png';
    
    日志.调试(`开始查询Eagle缩略图: ${eagle缩略图名}`, 'ThumbnailCache', {
        元数据: {
            请求ID,
            源文件路径: ctx.fixedPath,
            Eagle缩略图路径: eagle缩略图名
        },
        标签: ['缩略图', '缓存', 'Eagle查询']
    });
    
    let fromFile = await asyncReadFile(eagle缩略图名, true);
    if (fromFile && fromFile.length >= 100) {
        日志.信息(`发现Eagle格式缩略图: ${eagle缩略图名}`, 'ThumbnailCache', {
            元数据: {
                请求ID,
                源文件路径: ctx.fixedPath,
                Eagle缩略图路径: eagle缩略图名,
                缓存大小: `${(fromFile.length / 1024).toFixed(2)}KB`,
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '缓存', 'Eagle命中']
        });
        return fromFile;
    }
    
    日志.调试(`Eagle缩略图未找到: ${eagle缩略图名}`, 'ThumbnailCache', {
        元数据: {
            请求ID,
            源文件路径: ctx.fixedPath,
            处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
        },
        标签: ['缩略图', '缓存', 'Eagle未命中']
    });
    return null;
}

async function 查询缩略图硬盘缓存(ctx) {
    const 请求ID = ctx.请求ID || Date.now().toString(36) + Math.random().toString(36).substr(2);
    const 开始时间 = performance.now();
    
    日志.调试(`开始查询硬盘缓存: ${ctx.targetPath}`, 'ThumbnailCache', {
        元数据: {
            请求ID,
            源文件路径: ctx.fixedPath,
            目标缓存路径: ctx.targetPath
        },
        标签: ['缩略图', '缓存', '硬盘查询']
    });
    
    let fromFile = await asyncReadFile(ctx.targetPath, true);
    if (fromFile && fromFile.length >= 100) {
        日志.信息(`硬盘缓存命中: ${ctx.targetPath}`, 'ThumbnailCache', {
            元数据: {
                请求ID,
                源文件路径: ctx.fixedPath,
                缓存路径: ctx.targetPath,
                缓存大小: `${(fromFile.length / 1024).toFixed(2)}KB`,
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '缓存', '硬盘命中']
        });
        return fromFile;
    }
    
    日志.调试(`硬盘缓存未命中: ${ctx.targetPath}`, 'ThumbnailCache', {
        元数据: {
            请求ID,
            源文件路径: ctx.fixedPath,
            处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
        },
        标签: ['缩略图', '缓存', '硬盘未命中']
    });
    return null;
}

async function 查询扩展名缩略图硬盘缓存(ctx) {
    const 请求ID = ctx.请求ID || Date.now().toString(36) + Math.random().toString(36).substr(2);
    const 开始时间 = performance.now();
    
    日志.调试(`开始查询扩展名缩略图缓存: ${ctx.extensionThumbnailPath}`, 'ThumbnailCache', {
        元数据: {
            请求ID,
            源文件路径: ctx.fixedPath,
            扩展名: ctx.extension,
            扩展名缓存路径: ctx.extensionThumbnailPath
        },
        标签: ['缩略图', '缓存', '扩展名查询']
    });
    
    let fromFile = await asyncReadFile(ctx.extensionThumbnailPath, true);
    if (fromFile && fromFile.length >= 100) {
        日志.信息(`扩展名缩略图缓存命中: ${ctx.extensionThumbnailPath}`, 'ThumbnailCache', {
            元数据: {
                请求ID,
                源文件路径: ctx.fixedPath,
                扩展名: ctx.extension,
                缓存大小: `${(fromFile.length / 1024).toFixed(2)}KB`,
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '缓存', '扩展名命中']
        });
        return fromFile;
    }
    
    日志.调试(`扩展名缩略图缓存未命中: ${ctx.extensionThumbnailPath}`, 'ThumbnailCache', {
        元数据: {
            请求ID,
            源文件路径: ctx.fixedPath,
            处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
        },
        标签: ['缩略图', '缓存', '扩展名未命中']
    });
    return null;
}

async function 查询所有缓存(ctx) {
    const 请求ID = ctx.请求ID || Date.now().toString(36) + Math.random().toString(36).substr(2);
    const 开始时间 = performance.now();
    
    日志.调试(`开始查询所有可能的缓存: ${ctx.fixedPath}`, 'ThumbnailCache', {
        元数据: {
            请求ID,
            源文件路径: ctx.fixedPath,
            文件哈希: ctx.hash,
            扩展名: ctx.extension,
            使用扩展名缩略图: ctx.useExtension ? '是' : '否'
        },
        标签: ['缩略图', '缓存', '全面查询']
    });
    
    // 按优先级查询各类缓存
    const memoryCache = await 查询内存缓存(ctx);
    if (memoryCache) {
        日志.信息(`内存缓存命中，跳过其他缓存查询`, 'ThumbnailCache', {
            元数据: {
                请求ID,
                源文件路径: ctx.fixedPath,
                缓存类型: '内存缓存',
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '缓存', '查询完成']
        });
        return memoryCache;
    }
    
    const eagleCache = await 查询eagle缩略图(ctx);
    if (eagleCache) {
        日志.信息(`Eagle缓存命中，跳过其他缓存查询`, 'ThumbnailCache', {
            元数据: {
                请求ID,
                源文件路径: ctx.fixedPath,
                缓存类型: 'Eagle缓存',
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '缓存', '查询完成']
        });
        return eagleCache;
    }
    
    const diskCache = await 查询缩略图硬盘缓存(ctx);
    if (diskCache) {
        日志.信息(`硬盘缓存命中，跳过其他缓存查询`, 'ThumbnailCache', {
            元数据: {
                请求ID,
                源文件路径: ctx.fixedPath,
                缓存类型: '硬盘缓存',
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '缓存', '查询完成']
        });
        return diskCache;
    }
    
    if (ctx.useExtension) {
        const extensionCache = await 查询扩展名缩略图硬盘缓存(ctx);
        if (extensionCache) {
            日志.信息(`扩展名缓存命中`, 'ThumbnailCache', {
                元数据: {
                    请求ID,
                    源文件路径: ctx.fixedPath,
                    缓存类型: '扩展名缓存',
                    扩展名: ctx.extension,
                    处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
                },
                标签: ['缩略图', '缓存', '查询完成']
            });
            return extensionCache;
        }
    }
    
    日志.信息(`所有缓存均未命中，需要生成新缩略图`, 'ThumbnailCache', {
        元数据: {
            请求ID,
            源文件路径: ctx.fixedPath,
            处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
        },
        标签: ['缩略图', '缓存', '全部未命中']
    });
    return null;
}

export { tumbnailCache, 查询所有缓存 }