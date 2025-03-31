import { getColor } from './color.js'
import { diffColor } from '../../../utils/color/Kmeans.js'
import { globalTaskQueue,  添加后进先出后台任务 } from '../queue/taskQueue.js'
import { 内置缩略图生成器序列 } from './loaders/internal.js'
import { getCommonLoader } from './loaders/query.js'
import { tumbnailCache } from './cache/index.js'
import { 写入缩略图缓存 } from './cache/writer.js'
import { 创建缩略图生成上下文 } from './cache/context.js'
import { 从缓存获取缩略图 } from './cache/reader.js'
import { 日志 } from "../../../../src/toolBox/base/useEcma/forLogs/useLogger.js"

const fs = require('fs')
export function listLoaders() {
    const 请求ID = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    日志.调试('获取所有缩略图生成器列表', 'ThumbnailLoader', {
        元数据: {
            请求ID,
            生成器数量: 内置缩略图生成器序列.length
        },
        标签: ['缩略图', '生成器', '列表']
    });
    
    return 内置缩略图生成器序列.map(item => {
        return {
            id: item.id,
            name: item.name,
            match: item.match,
            sys: item.sys,
            support: item.support,
            description: item.description
        }
    })
}

// 生成新缩略图的核心逻辑
async function 生成新缩略图(ctx) {
    const 请求ID = ctx.请求ID || Date.now().toString(36) + Math.random().toString(36).substr(2);
    const 开始时间 = performance.now();
    
    日志.信息(`开始生成新缩略图: ${ctx.fixedPath}`, 'ThumbnailLoader', {
        元数据: {
            请求ID,
            源文件路径: ctx.fixedPath,
            目标路径: ctx.targetPath,
            文件哈希: ctx.hash,
            使用生成器: ctx.loader?.id || '默认'
        },
        标签: ['缩略图', '生成新缩略图', '开始']
    });
    
    try {
        const thumbnailBuffer = await 计算缩略图(ctx);
        
        if (!thumbnailBuffer) {
            const 错误消息 = `未能为${ctx.fixedPath}生成缩略图`;
            日志.错误(错误消息, 'ThumbnailLoader', {
                元数据: {
                    请求ID,
                    源文件路径: ctx.fixedPath,
                    处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
                },
                标签: ['缩略图', '生成新缩略图', '失败']
            });
            throw new Error(错误消息);
        }
        
        日志.信息(`缩略图生成成功，开始写入缓存`, 'ThumbnailLoader', {
            元数据: {
                请求ID,
                源文件路径: ctx.fixedPath,
                目标路径: ctx.targetPath,
                缩略图大小: `${(thumbnailBuffer.length / 1024).toFixed(2)}KB`,
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '生成新缩略图', '成功']
        });
        
        写入缩略图缓存(ctx, thumbnailBuffer);
        tumbnailCache.set(ctx.hash, thumbnailBuffer);
        return thumbnailBuffer;
    } catch (错误) {
        日志.错误(`生成新缩略图失败: ${错误.message}`, 'ThumbnailLoader', {
            元数据: {
                请求ID,
                源文件路径: ctx.fixedPath,
                错误类型: 错误.name,
                错误消息: 错误.message,
                错误栈: 错误.stack,
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '生成新缩略图', '错误']
        });
        throw 错误;
    }
}

// 任务队列控制包装器
async function 执行带队列控制的任务(task) {
    const 请求ID = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const 开始时间 = performance.now();
    
    日志.调试(`暂停全局任务队列执行缩略图生成`, 'ThumbnailLoader', {
        元数据: {
            请求ID,
            任务队列状态: globalTaskQueue.paused ? '已暂停' : '运行中'
        },
        标签: ['缩略图', '任务队列', '暂停']
    });
    
    globalTaskQueue.paused = true;
    try {
        const 结果 = await task();
        
        日志.调试(`缩略图生成任务完成，恢复任务队列`, 'ThumbnailLoader', {
            元数据: {
                请求ID,
                任务耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`,
                结果大小: 结果 ? (Buffer.isBuffer(结果) ? `${(结果.length / 1024).toFixed(2)}KB` : '对象') : '无结果'
            },
            标签: ['缩略图', '任务队列', '恢复']
        });
        
        return 结果;
    } catch (错误) {
        日志.错误(`缩略图生成任务执行失败: ${错误.message}`, 'ThumbnailLoader', {
            元数据: {
                请求ID,
                错误类型: 错误.name,
                错误消息: 错误.message,
                错误栈: 错误.stack,
                任务耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '任务队列', '错误']
        });
        throw 错误;
    } finally {
        globalTaskQueue.paused = false;
    }
}

export const 生成文件缩略图 = async (imagePath, loaderID = null) => {
    const 请求ID = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const 开始时间 = performance.now();
    
    日志.信息(`开始生成文件缩略图: ${imagePath}`, 'ThumbnailLoader', {
        元数据: {
            请求ID,
            源文件路径: imagePath,
            指定生成器ID: loaderID
        },
        标签: ['缩略图', '生成器入口', '开始']
    });
    
    try {
        const ctx = await 创建缩略图生成上下文(imagePath, loaderID);
        ctx.请求ID = 请求ID;
        
        日志.调试(`缩略图生成上下文创建完成`, 'ThumbnailLoader', {
            元数据: {
                请求ID,
                源文件路径: imagePath,
                修正后路径: ctx.fixedPath,
                目标路径: ctx.targetPath,
                文件哈希: ctx.hash,
                使用生成器: ctx.loader?.id || '默认',
                文件扩展名: ctx.extension,
                使用原始图片: ctx.useRaw ? '是' : '否'
            },
            标签: ['缩略图', '生成器入口', '上下文']
        });
        
        return 执行带队列控制的任务(async () => {
            // 尝试从缓存获取
            const cacheResult = await 从缓存获取缩略图(ctx);
            
            if (cacheResult) {
                日志.信息(`从缓存找到缩略图`, 'ThumbnailLoader', {
                    元数据: {
                        请求ID,
                        源文件路径: imagePath,
                        缓存结果类型: typeof cacheResult === 'object' ? (cacheResult.data ? 'data对象' : '对象') : 'Buffer',
                        处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
                    },
                    标签: ['缩略图', '生成器入口', '使用缓存']
                });
                return cacheResult;
            }
            
            // 判断是否使用原始图片
            if (ctx.useRaw) {
                日志.信息(`使用原始图片作为缩略图`, 'ThumbnailLoader', {
                    元数据: {
                        请求ID,
                        源文件路径: imagePath,
                        处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
                    },
                    标签: ['缩略图', '生成器入口', '使用原图']
                });
                return await 处理原始图片(ctx);
            }
            
            // 生成新缩略图
            日志.信息(`无缓存，开始生成新缩略图`, 'ThumbnailLoader', {
                元数据: {
                    请求ID,
                    源文件路径: imagePath,
                    处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
                },
                标签: ['缩略图', '生成器入口', '无缓存']
            });
            return await 生成新缩略图(ctx);
        });
    } catch (错误) {
        日志.错误(`生成文件缩略图失败: ${错误.message}`, 'ThumbnailLoader', {
            元数据: {
                请求ID,
                源文件路径: imagePath,
                错误类型: 错误.name,
                错误消息: 错误.message,
                错误栈: 错误.stack,
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '生成器入口', '错误']
        });
        throw 错误;
    }
}

async function 计算缩略图(ctx) {
    const 请求ID = ctx.请求ID || Date.now().toString(36) + Math.random().toString(36).substr(2);
    const 开始时间 = performance.now();
    
    日志.信息(`计算缩略图开始: ${ctx.fixedPath}`, 'ThumbnailLoader', {
        元数据: {
            请求ID,
            源文件路径: ctx.fixedPath,
            目标路径: ctx.targetPath,
            使用生成器: ctx.loader?.id || '默认'
        },
        标签: ['缩略图', '计算', '开始']
    });
    
    try {
        const 结果 = await ctx.loader.generateThumbnail(ctx.fixedPath, ctx.targetPath);
        
        日志.信息(`缩略图计算成功`, 'ThumbnailLoader', {
            元数据: {
                请求ID,
                源文件路径: ctx.fixedPath,
                目标路径: ctx.targetPath,
                结果大小: 结果 ? `${(结果.length / 1024).toFixed(2)}KB` : '无结果',
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '计算', '成功']
        });
        
        return 结果;
    } catch (错误) {
        日志.警告(`使用默认生成器重试: ${错误.message}`, 'ThumbnailLoader', {
            元数据: {
                请求ID,
                源文件路径: ctx.fixedPath,
                失败生成器: ctx.loader?.id || '默认',
                错误消息: 错误.message,
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '计算', '重试']
        });
        
        try {
            const 默认生成器 = getCommonLoader();
            const 结果 = await 默认生成器.generateThumbnail(ctx.fixedPath, ctx.targetPath, 错误);
            
            日志.信息(`使用默认生成器计算缩略图成功`, 'ThumbnailLoader', {
                元数据: {
                    请求ID,
                    源文件路径: ctx.fixedPath,
                    目标路径: ctx.targetPath,
                    默认生成器ID: 默认生成器.id,
                    结果大小: 结果 ? `${(结果.length / 1024).toFixed(2)}KB` : '无结果',
                    处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
                },
                标签: ['缩略图', '计算', '默认生成器成功']
            });
            
            return 结果;
        } catch (再次错误) {
            日志.错误(`默认生成器也失败: ${再次错误.message}`, 'ThumbnailLoader', {
                元数据: {
                    请求ID,
                    源文件路径: ctx.fixedPath,
                    原始错误: 错误.message,
                    再次错误: 再次错误.message,
                    错误栈: 再次错误.stack,
                    处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
                },
                标签: ['缩略图', '计算', '全部失败']
            });
            throw 再次错误;
        }
    }
}

async function 处理原始图片(ctx) {
    const { fixedPath, hash, extension } = ctx;
    const 请求ID = ctx.请求ID || Date.now().toString(36) + Math.random().toString(36).substr(2);
    const 开始时间 = performance.now();
    
    日志.信息(`处理原始图片作为缩略图: ${fixedPath}`, 'ThumbnailLoader', {
        元数据: {
            请求ID,
            源文件路径: fixedPath,
            文件哈希: hash,
            文件扩展名: extension
        },
        标签: ['缩略图', '原始图片', '开始']
    });
    
    try {
        const rawBuffer = fs.readFileSync(fixedPath);
        
        日志.信息(`原始图片读取成功，设置为缓存`, 'ThumbnailLoader', {
            元数据: {
                请求ID,
                源文件路径: fixedPath,
                文件大小: `${(rawBuffer.length / 1024).toFixed(2)}KB`,
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '原始图片', '成功']
        });
        
        tumbnailCache.set(hash, rawBuffer);
        return {
            data: rawBuffer,
            type: extension,
            isImage: true,
        };
    } catch (错误) {
        日志.错误(`未能从磁盘读取原始图片: ${fixedPath}`, 'ThumbnailLoader', {
            元数据: {
                请求ID,
                源文件路径: fixedPath,
                错误类型: 错误.name,
                错误消息: 错误.message,
                错误栈: 错误.stack,
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '原始图片', '错误']
        });
        
        throw new Error('未能从磁盘读取缩略图: ' + fixedPath);
    }
}

export const 准备缩略图 = async (imagePath, loaderID = null) => {
    const 请求ID = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    日志.调试(`准备缩略图（后台任务）: ${imagePath}`, 'ThumbnailLoader', {
        元数据: {
            请求ID,
            源文件路径: imagePath,
            指定生成器ID: loaderID
        },
        标签: ['缩略图', '准备', '后台任务']
    });
    
    let 缩略图任务函数 = async () => {
        const 开始时间 = performance.now();
        try {
            日志.调试(`开始执行后台缩略图任务: ${imagePath}`, 'ThumbnailLoader', {
                元数据: {
                    请求ID,
                    源文件路径: imagePath
                },
                标签: ['缩略图', '准备', '执行中']
            });
            
            await genThumbnailColor(imagePath, loaderID);
            
            日志.调试(`后台缩略图任务完成: ${imagePath}`, 'ThumbnailLoader', {
                元数据: {
                    请求ID,
                    源文件路径: imagePath,
                    处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
                },
                标签: ['缩略图', '准备', '完成']
            });
        } catch (错误) {
            日志.错误(`后台缩略图任务失败: ${错误.message}`, 'ThumbnailLoader', {
                元数据: {
                    请求ID,
                    源文件路径: imagePath,
                    错误类型: 错误.name,
                    错误消息: 错误.message,
                    错误栈: 错误.stack,
                    处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
                },
                标签: ['缩略图', '准备', '错误']
            });
        } finally {
            return imagePath;
        }
    };
    添加后进先出后台任务(缩略图任务函数);
}

export async function genThumbnailColor(filePath, loaderID = null) {
    const 请求ID = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const 开始时间 = performance.now();
    
    日志.调试(`开始获取缩略图颜色: ${filePath}`, 'ThumbnailLoader', {
        元数据: {
            请求ID,
            源文件路径: filePath,
            指定生成器ID: loaderID
        },
        标签: ['缩略图', '颜色提取', '开始']
    });
    
    try {
        const thumbnailBuffer = await 生成文件缩略图(filePath, loaderID);
        
        if (!thumbnailBuffer) {
            日志.警告(`无法获取缩略图颜色: 缩略图生成失败`, 'ThumbnailLoader', {
                元数据: {
                    请求ID,
                    源文件路径: filePath,
                    处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
                },
                标签: ['缩略图', '颜色提取', '无缩略图']
            });
            return null;
        }
        
        const 颜色结果 = await getColor(thumbnailBuffer, filePath);
        
        日志.调试(`缩略图颜色提取完成`, 'ThumbnailLoader', {
            元数据: {
                请求ID,
                源文件路径: filePath,
                颜色结果: 颜色结果 ? `提取了${颜色结果.length}种颜色` : '无结果',
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '颜色提取', '成功']
        });
        
        return 颜色结果;
    } catch (错误) {
        日志.错误(`获取缩略图颜色失败: ${错误.message}`, 'ThumbnailLoader', {
            元数据: {
                请求ID,
                源文件路径: filePath,
                错误类型: 错误.name,
                错误消息: 错误.message,
                错误栈: 错误.stack,
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '颜色提取', '错误']
        });
        return null;
    }
}

export async function diffFileColor(filePath, color) {
    const 请求ID = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const 开始时间 = performance.now();
    
    日志.调试(`开始比较文件颜色: ${filePath}`, 'ThumbnailLoader', {
        元数据: {
            请求ID,
            源文件路径: filePath,
            目标颜色: color
        },
        标签: ['缩略图', '颜色比较', '开始']
    });
    
    try {
        let simiColor = await genThumbnailColor(filePath);
        
        if (!simiColor) {
            日志.警告(`颜色比较失败: 无法获取文件颜色`, 'ThumbnailLoader', {
                元数据: {
                    请求ID,
                    源文件路径: filePath,
                    处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
                },
                标签: ['缩略图', '颜色比较', '无颜色数据']
            });
            return false;
        }
        
        for await (let item of simiColor) {
            if (diffColor(item.color, color)) {
                日志.调试(`找到匹配颜色`, 'ThumbnailLoader', {
                    元数据: {
                        请求ID,
                        源文件路径: filePath,
                        匹配颜色: item.color,
                        目标颜色: color,
                        处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
                    },
                    标签: ['缩略图', '颜色比较', '匹配']
                });
                return true;
            }
        }
        
        日志.调试(`未找到匹配颜色`, 'ThumbnailLoader', {
            元数据: {
                请求ID,
                源文件路径: filePath,
                颜色数量: simiColor.length,
                目标颜色: color,
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '颜色比较', '不匹配']
        });
        
        return false;
    } catch (错误) {
        日志.错误(`颜色比较过程中出错: ${错误.message}`, 'ThumbnailLoader', {
            元数据: {
                请求ID,
                源文件路径: filePath,
                目标颜色: color,
                错误类型: 错误.name,
                错误消息: 错误.message,
                错误栈: 错误.stack,
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '颜色比较', '错误']
        });
        return false;
    }
}