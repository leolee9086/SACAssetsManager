import { getCachePath } from "../processors/fs/cached/fs.js"
import { buildCache } from "../processors/cache/cache.js"
import { statWithCatch } from "../processors/fs/stat.js"
import { 获取哈希并写入数据库 } from "../processors/fs/stat.js"
import { globalTaskQueue } from "./runtime_queue.js"
import { 生成文件缩略图 } from "../processors/thumbnail/loader.js"
import { 日志 } from "../utils/logger.js"

export const sendDefaultIcon = (req, res) => {
    const 请求ID = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const iconPath = process.execPath.replace('SiYuan.exe', 'resources\\stage\\icon-large.png');
    
    日志.信息(`发送默认图标: ${iconPath}`, 'Thumbnail', {
        元数据: {
            请求ID,
            图标路径: iconPath,
            请求URL: req.url,
            请求参数: req.query,
            客户端IP: req.ip || req.connection.remoteAddress
        },
        标签: ['缩略图', '默认图标', '回退处理']
    });
    
    res.sendFile(iconPath);
    return;
}

export const 默认图片响应 = async (req, res, next) => {
    const 请求ID = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    日志.信息("使用默认图片响应", 'Thumbnail', {
        元数据: {
            请求ID,
            请求URL: req.url,
            请求参数: req.query,
            源文件路径: req.sourcePath,
            客户端IP: req.ip || req.connection.remoteAddress
        },
        标签: ['缩略图', '默认图片', '回退处理']
    });
    
    sendDefaultIcon(req, res);
    next();
}

export const getSourcePath = (req, res, next) => {
    const 请求ID = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const 开始时间 = performance.now();
    
    globalTaskQueue.paused = true;
    const path = require('path');
    let 源文件地址 = '';
    
    日志.信息(`开始处理缩略图请求`, 'Thumbnail', {
        元数据: {
            请求ID,
            请求URL: req.url,
            请求参数: req.query,
            客户端IP: req.ip || req.connection.remoteAddress
        },
        标签: ['缩略图', '请求开始']
    });
    
    if (req.query.localPath) {
        源文件地址 = req.query.localPath;
        日志.调试(`使用本地路径参数: ${源文件地址}`, 'Thumbnail', {
            元数据: {
                请求ID,
                参数类型: 'localPath',
                原始路径: req.query.localPath
            },
            标签: ['缩略图', '路径解析']
        });
    } else {
        源文件地址 = path.join(siyuanConfig.system.workspaceDir, 'data', req.query.path);
        日志.调试(`使用工作区路径参数: ${源文件地址}`, 'Thumbnail', {
            元数据: {
                请求ID,
                参数类型: 'path',
                原始路径: req.query.path,
                工作区路径: siyuanConfig.system.workspaceDir
            },
            标签: ['缩略图', '路径解析']
        });
    }
    
    源文件地址 = 源文件地址.replace(/\//g, '\\');
    
    // 检查文件是否存在
    const fs = require('fs');
    try {
        const 文件存在 = fs.existsSync(源文件地址);
        if (!文件存在) {
            日志.警告(`源文件不存在: ${源文件地址}`, 'Thumbnail', {
                元数据: {
                    请求ID,
                    源文件地址,
                    处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
                },
                标签: ['缩略图', '路径解析', '文件不存在']
            });
        } else {
            const 文件状态 = fs.statSync(源文件地址);
            日志.信息(`源文件已找到: ${源文件地址}`, 'Thumbnail', {
                元数据: {
                    请求ID,
                    源文件地址,
                    文件大小: `${(文件状态.size / 1024).toFixed(2)}KB`,
                    文件类型: path.extname(源文件地址),
                    最后修改时间: 文件状态.mtime,
                    处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
                },
                标签: ['缩略图', '路径解析', '文件存在']
            });
        }
    } catch (错误) {
        日志.错误(`检查源文件时出错: ${错误.message}`, 'Thumbnail', {
            元数据: {
                请求ID,
                源文件地址,
                错误类型: 错误.name,
                错误消息: 错误.message,
                错误栈: 错误.stack,
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '路径解析', '错误']
        });
    }
    
    req.sourcePath = 源文件地址;
    req.thumbnailRequestID = 请求ID;
    req.thumbnailStartTime = 开始时间;
    next();
}

export const 生成默认缩略图路径 = async (path) => {
    const 开始时间 = performance.now();
    const 请求ID = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    日志.信息(`开始生成缩略图缓存路径: ${path}`, 'Thumbnail', {
        元数据: {
            请求ID,
            源文件路径: path
        },
        标签: ['缩略图', '缓存路径']
    });
    
    try {
        const stat = await statWithCatch(path);
        const hashedName = await 获取哈希并写入数据库(stat) + '.thumbnail.png';
        const 缓存目录 = (await getCachePath(path, 'thumbnails', true)).cachePath;
        let 缓存路径 = require('path').join(缓存目录, hashedName);
        
        日志.信息(`缩略图缓存路径生成完成`, 'Thumbnail', {
            元数据: {
                请求ID,
                源文件路径: path,
                文件哈希: hashedName.replace('.thumbnail.png', ''),
                缓存目录,
                缓存路径,
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '缓存路径', '成功']
        });
        
        return 缓存路径;
    } catch (错误) {
        日志.错误(`生成缩略图缓存路径失败: ${错误.message}`, 'Thumbnail', {
            元数据: {
                请求ID,
                源文件路径: path,
                错误类型: 错误.name,
                错误消息: 错误.message,
                错误栈: 错误.stack,
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '缓存路径', '错误']
        });
        throw 错误;
    }
}    

export const 生成缩略图响应 = async (req, res, next) => {
    const 请求ID = req.thumbnailRequestID || Date.now().toString(36) + Math.random().toString(36).substr(2);
    const 开始时间 = req.thumbnailStartTime || performance.now();
    const 源文件地址 = req.sourcePath;
    
    日志.信息(`开始生成缩略图响应`, 'Thumbnail', {
        元数据: {
            请求ID,
            源文件路径: 源文件地址,
            请求大小: req.query.size || '默认',
            缩略图生成器ID: req.query.loaderID || '默认'
        },
        标签: ['缩略图', '响应', '开始']
    });
    
    try {
        const stat = await statWithCatch(源文件地址);
        const hash = await 获取哈希并写入数据库(stat);
        const thumbnailCache = buildCache('thumbnailCache');
        
        // 检查缓存
        const 缓存结果 = thumbnailCache.get(hash);
        if (缓存结果) {
            日志.信息(`使用缓存的缩略图数据`, 'Thumbnail', {
                元数据: {
                    请求ID,
                    源文件路径: 源文件地址,
                    文件哈希: hash,
                    缓存类型: typeof 缓存结果 === 'object' ? (缓存结果.type || '未知') : 'Buffer',
                    处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
                },
                标签: ['缩略图', '响应', '使用缓存']
            });
            
            if (Buffer.isBuffer(缓存结果)) {
                res.type('image/png');
                res.send(缓存结果);
                return;
            } else if (typeof 缓存结果 === 'object' && 缓存结果.data) {
                res.type(缓存结果.type || 'image/png');
                res.send(缓存结果.data);
                return;
            }
        }
        
        // 如果没有缓存，生成新的缩略图
        日志.信息(`开始生成新的缩略图`, 'Thumbnail', {
            元数据: {
                请求ID,
                源文件路径: 源文件地址,
                使用生成器ID: req.query.loaderID || '默认'
            },
            标签: ['缩略图', '响应', '无缓存']
        });
        
        const result = await 生成文件缩略图(源文件地址, req.query.loaderID);
        
        if (result) {
            const type = result.type || 'image/png';
            const data = Buffer.isBuffer(result) ? result : result.data;
            
            日志.信息(`缩略图生成成功`, 'Thumbnail', {
                元数据: {
                    请求ID,
                    源文件路径: 源文件地址,
                    缩略图类型: type,
                    数据长度: data ? data.length : '未知',
                    处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
                },
                标签: ['缩略图', '响应', '成功']
            });
            
            res.type(type);
            res.send(data);
            return;
        } else {
            日志.警告(`缩略图生成结果为空`, 'Thumbnail', {
                元数据: {
                    请求ID,
                    源文件路径: 源文件地址,
                    处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
                },
                标签: ['缩略图', '响应', '无结果']
            });
        }
        
        next();
    } catch (error) {
        日志.错误(`缩略图生成失败: ${error.message}`, 'Thumbnail', {
            元数据: {
                请求ID,
                源文件路径: 源文件地址,
                错误类型: error.name,
                错误消息: error.message,
                错误栈: error.stack,
                处理耗时: `${(performance.now() - 开始时间).toFixed(2)}ms`
            },
            标签: ['缩略图', '响应', '错误']
        });
        next(error);
    }
};
