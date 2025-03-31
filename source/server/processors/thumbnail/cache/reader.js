import { tumbnailCache, 查询所有缓存 } from './index.js'
import { 日志 } from "../../../../../src/toolBox/base/useEcma/forLogs/useLogger.js"

async function 从缓存获取缩略图(ctx) {
    const 请求ID = ctx.请求ID || Date.now().toString(36) + Math.random().toString(36).substr(2);
    const 开始时间 = performance.now();
    
    日志.调试(`开始从缓存查询缩略图: ${ctx.fixedPath}`, 'ThumbnailCache', {
        元数据: {
            请求ID,
            源文件路径: ctx.fixedPath,
            文件哈希: ctx.hash,
            生成器ID: ctx.loader?.id || '默认'
        },
        标签: ['缩略图', '缓存', '查询开始']
    });
    
    try {
        const cacheResult = await 查询所有缓存(ctx);
        
        if (cacheResult) {
            const 大小 = Buffer.isBuffer(cacheResult) 
                ? `${(cacheResult.length / 1024).toFixed(2)}KB`
                : (cacheResult.data ? `${(cacheResult.data.length / 1024).toFixed(2)}KB` : '未知');
                
            日志.信息(`缓存命中，找到缩略图: ${ctx.fixedPath}`, 'ThumbnailCache', {
                元数据: {
                    请求ID,
                    源文件路径: ctx.fixedPath,
                    缓存类型: Buffer.isBuffer(cacheResult) ? 'Buffer' : '对象',
                    缓存大小: 大小,
                    处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
                },
                标签: ['缩略图', '缓存', '命中']
            });
            
            tumbnailCache.set(ctx.hash, cacheResult);
            return cacheResult;
        }
        
        日志.调试(`缓存未命中: ${ctx.fixedPath}`, 'ThumbnailCache', {
            元数据: {
                请求ID,
                源文件路径: ctx.fixedPath,
                文件哈希: ctx.hash,
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '缓存', '未命中']
        });
        
        return null;
    } catch (错误) {
        日志.错误(`查询缩略图缓存失败: ${错误.message}`, 'ThumbnailCache', {
            元数据: {
                请求ID,
                源文件路径: ctx.fixedPath,
                文件哈希: ctx.hash,
                错误类型: 错误.name,
                错误消息: 错误.message,
                错误栈: 错误.stack,
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '缓存', '错误']
        });
        
        return null;
    }
}

export { 从缓存获取缩略图 }
