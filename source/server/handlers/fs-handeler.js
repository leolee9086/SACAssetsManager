/**
 * 这里需要实现文件系统的原子操作
 * 需要支持撤销和重做
 */
import { 提取所有子目录文件扩展名 } from "../dataBase/mainDb.js";
import { 日志 } from '../../../src/toolBox/base/useEcma/forLogs/useLogger.js';
const path = require('path')
const 图片扩展名列表 = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];

const 是图片文件 = (文件名) => {
    return 图片扩展名列表.includes(path.extname(文件名).toLowerCase());
};

const 查找第一个图片 = async (目录路径) => {
    const fs = require('fs').promises;
    const path = require('path');
    const 扫描开始时间 = performance.now();
    
    try {
        日志.调试(`开始扫描目录查找图片: ${目录路径}`, 'FSScanner', {
            元数据: { 目录路径 },
            标签: ['文件扫描', '图片查找', '开始']
        });
        
        const 文件列表 = await fs.readdir(目录路径);
        
        日志.调试(`扫描到 ${文件列表.length} 个文件/目录`, 'FSScanner', {
            元数据: { 
                目录路径,
                文件数量: 文件列表.length,
                前10个文件: 文件列表.slice(0, 10),
                扫描耗时: `${(performance.now() - 扫描开始时间).toFixed(2)}ms`
            },
            标签: ['文件扫描', '扫描完成']
        });
        
        for (const 文件名 of 文件列表) {
            const 完整路径 = path.join(目录路径, 文件名);
            const 文件信息 = await fs.stat(完整路径);
            
            if (文件信息.isFile() && 是图片文件(文件名)) {
                日志.调试(`找到图片文件: ${文件名}`, 'FSScanner', {
                    元数据: { 
                        完整路径, 
                        文件大小: `${(文件信息.size / 1024).toFixed(2)}KB`,
                        文件类型: path.extname(文件名),
                        扫描耗时: `${(performance.now() - 扫描开始时间).toFixed(2)}ms`
                    },
                    标签: ['文件扫描', '图片查找', '成功']
                });
                return 完整路径;
            }
        }
        
        日志.信息(`目录中未找到图片: ${目录路径}`, 'FSScanner', {
            元数据: { 
                目录路径, 
                文件数量: 文件列表.length,
                扫描耗时: `${(performance.now() - 扫描开始时间).toFixed(2)}ms` 
            },
            标签: ['文件扫描', '图片查找', '未找到']
        });
        
        // 如果没有图片，返回第一个文件
        return 文件列表.length > 0 ? path.join(目录路径, 文件列表[0]) : null;
    } catch (错误) {
        日志.错误(`扫描目录查找图片失败: ${错误.message}`, 'FSScanner', {
            元数据: { 
                目录路径, 
                错误类型: 错误.name,
                错误消息: 错误.message,
                错误栈: 错误.stack,
                扫描耗时: `${(performance.now() - 扫描开始时间).toFixed(2)}ms`
            },
            标签: ['文件扫描', '图片查找', '错误']
        });
        return null;
    }
};

const 读取图片并发送 = async (图片路径, res) => {
    const fs = require('fs').promises;
    const path = require('path');
    const 读取开始时间 = performance.now();
    
    try {
        const 图片数据 = await fs.readFile(图片路径);
        const 文件类型 = `image/${path.extname(图片路径).slice(1)}`;
        const 文件大小 = 图片数据.length;
        
        日志.调试(`成功读取图片: ${图片路径}`, 'FSScanner', {
            元数据: { 
                图片路径, 
                文件类型,
                文件大小: `${(文件大小 / 1024).toFixed(2)}KB`,
                读取耗时: `${(performance.now() - 读取开始时间).toFixed(2)}ms`
            },
            标签: ['文件读取', '图片', '成功']
        });
        
        res.set('Content-Type', 文件类型);
        return res.send(图片数据);
    } catch (错误) {
        日志.错误(`读取图片失败: ${错误.message}`, 'FSScanner', {
            元数据: { 
                图片路径, 
                错误类型: 错误.name,
                错误消息: 错误.message,
                错误栈: 错误.stack,
                读取耗时: `${(performance.now() - 读取开始时间).toFixed(2)}ms`
            },
            标签: ['文件读取', '图片', '错误']
        });
        throw 错误;
    }
};

export const 响应文件夹扩展名请求 = async (req,res,next) => {
    const { dirPath } = req.query;
    const 请求ID = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const 开始时间 = performance.now();
    
    if (!dirPath) {
        日志.警告('dirPath 参数缺失', 'FSHandler', {
            元数据: {
                请求ID,
                请求URL: req.url,
                客户端IP: req.ip || req.connection.remoteAddress
            },
            标签: ['参数错误', '文件夹扩展名']
        });
        return res.status(400).json({ error: 'dirPath 参数是必须的' });
    }
    
    try {
        日志.信息(`开始提取文件夹扩展名: ${dirPath}`, 'FSHandler', {
            元数据: {
                请求ID,
                目录路径: dirPath,
                请求URL: req.url,
                客户端IP: req.ip || req.connection.remoteAddress
            },
            标签: ['文件夹扩展名', '请求开始']
        });
        
        const extensions = await 提取所有子目录文件扩展名(dirPath);
        const 处理时间 = performance.now() - 开始时间;
        
        日志.信息(`成功提取文件夹扩展名: ${dirPath}`, 'FSHandler', {
            元数据: {
                请求ID,
                目录路径: dirPath,
                扩展名数量: extensions.length,
                扩展名列表: extensions,
                处理耗时: `${处理时间.toFixed(2)}ms`
            },
            标签: ['文件夹扩展名', '成功']
        });
        
        res.json({ extensions });
    } catch (error) {
        const 处理时间 = performance.now() - 开始时间;
        
        日志.错误(`提取文件扩展名时出错: ${error.message}`, 'FSHandler', {
            元数据: {
                请求ID,
                目录路径: dirPath,
                错误类型: error.name,
                错误消息: error.message,
                错误栈: error.stack,
                处理耗时: `${处理时间.toFixed(2)}ms`
            },
            标签: ['文件夹扩展名', '错误']
        });
        
        res.status(500).json({ error: '服务器内部错误' });
    }
}

export const 获取文件夹第一张图片 = async (req, res, next) => {
    const { dirPath } = req.query;
    const 请求ID = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const 开始时间 = performance.now();
    
    if (!dirPath) {
        日志.警告('dirPath 参数缺失', 'FSHandler', {
            元数据: {
                请求ID,
                请求URL: req.url,
                客户端IP: req.ip || req.connection.remoteAddress
            },
            标签: ['参数错误', '文件夹图片']
        });
        return res.status(400).json({ error: 'dirPath 参数是必须的' });
    }
    
    try {
        日志.信息(`开始查找文件夹第一张图片: ${dirPath}`, 'FSHandler', {
            元数据: {
                请求ID,
                目录路径: dirPath,
                请求URL: req.url,
                客户端IP: req.ip || req.connection.remoteAddress
            },
            标签: ['文件夹图片', '请求开始']
        });
        
        const 找到的图片路径 = await 查找第一个图片(dirPath);
        const 处理时间 = performance.now() - 开始时间;
        
        if (!找到的图片路径) {
            日志.警告(`文件夹为空: ${dirPath}`, 'FSHandler', {
                元数据: {
                    请求ID,
                    目录路径: dirPath,
                    处理耗时: `${处理时间.toFixed(2)}ms`
                },
                标签: ['文件夹图片', '目录为空']
            });
            return res.status(404).json({ error: '文件夹为空' });
        }
        
        if (是图片文件(找到的图片路径)) {
            日志.信息(`找到图片文件: ${找到的图片路径}`, 'FSHandler', {
                元数据: {
                    请求ID,
                    目录路径: dirPath,
                    图片路径: 找到的图片路径,
                    图片类型: path.extname(找到的图片路径),
                    处理耗时: `${处理时间.toFixed(2)}ms`
                },
                标签: ['文件夹图片', '成功', '直接返回']
            });
            
            // 添加图片 URL 作为元数据
            const fs = require('fs').promises;
            const stats = await fs.stat(找到的图片路径);
            
            // 创建缩略图数据
            const 图片URL = `/api/file?path=${encodeURIComponent(找到的图片路径)}`;
            
            // 通过元数据传递图片URL，可能会在日志界面显示图片预览
            日志.信息(`发送图片文件: ${path.basename(找到的图片路径)}`, 'FSHandler', {
                元数据: {
                    请求ID,
                    图片名称: path.basename(找到的图片路径),
                    图片路径: 找到的图片路径,
                    图片大小: `${(stats.size / 1024).toFixed(2)}KB`,
                    图片URL: 图片URL,
                    处理耗时: `${处理时间.toFixed(2)}ms`
                },
                标签: ['文件夹图片', '发送', '图片预览']
            });
            
            await 读取图片并发送(找到的图片路径, res);
        } else {
            日志.信息(`重定向到缩略图: ${找到的图片路径}`, 'FSHandler', {
                元数据: {
                    请求ID,
                    目录路径: dirPath,
                    文件路径: 找到的图片路径,
                    文件类型: path.extname(找到的图片路径),
                    处理耗时: `${处理时间.toFixed(2)}ms`
                },
                标签: ['文件夹图片', '缩略图重定向']
            });
            res.redirect(`/thumbnail?localPath=${encodeURIComponent(找到的图片路径)}`);
        }
    } catch (error) {
        const 处理时间 = performance.now() - 开始时间;
        
        日志.错误(`获取文件夹第一张图片时出错: ${error.message}`, 'FSHandler', {
            元数据: {
                请求ID,
                目录路径: dirPath,
                错误类型: error.name,
                错误消息: error.message,
                错误栈: error.stack,
                处理耗时: `${处理时间.toFixed(2)}ms`
            },
            标签: ['文件夹图片', '错误']
        });
        
        res.status(500).json({ error: '服务器内部错误' });
    }
};