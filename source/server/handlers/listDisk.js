import {listLocalDisks} from '../processors/fs/disk/diskInfo.js'
import { 日志 } from '../../../src/toolBox/base/useEcma/forLogs/useLogger.js';

export async function listDisk(req,res,next){
    const 请求ID = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    日志.信息('开始获取本地磁盘列表', 'DiskHandler', {
        元数据: {
            请求ID,
            请求方法: req.method,
            请求路径: req.path,
            客户端IP: req.ip || req.connection.remoteAddress
        },
        标签: ['磁盘操作', '请求开始']
    });
    
    const 开始时间 = performance.now();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    
    try {
        let data = await listLocalDisks();
        const 处理时间 = performance.now() - 开始时间;
        
        日志.信息(`获取本地磁盘列表完成: 找到${data.length}个磁盘`, 'DiskHandler', {
            元数据: {
                请求ID,
                磁盘数量: data.length,
                处理时间: `${处理时间.toFixed(2)}ms`,
                磁盘概览: data.map(disk => ({
                    名称: disk.name,
                    卷标: disk.volumeName,
                    总空间: `${(disk.total / 1024).toFixed(2)}GB`,
                    可用空间: `${(disk.free / 1024).toFixed(2)}GB`,
                    使用率: `${disk.usedPercentage.toFixed(2)}%`
                }))
            },
            标签: ['磁盘操作', '请求完成', '成功']
        });
        
        res.end(JSON.stringify(data));
    } catch (错误) {
        const 处理时间 = performance.now() - 开始时间;
        日志.错误(`获取本地磁盘列表失败: ${错误.message}`, 'DiskHandler', {
            元数据: {
                请求ID,
                处理时间: `${处理时间.toFixed(2)}ms`,
                错误类型: 错误.name,
                错误消息: 错误.message,
                错误栈: 错误.stack
            },
            标签: ['磁盘操作', '请求失败', '错误']
        });
        
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '获取磁盘列表失败' }));
    }
}

export async function isManagedDisk(req, res, next) {
    const path = require('path');
    const fs = require('fs');
    const 请求ID = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    try {
        const diskRoot = path.parse(req.path).root;
        const sacFolderPath = path.join(diskRoot, '.sac');
        
        日志.信息(`检查磁盘是否受管理: ${diskRoot}`, 'DiskHandler', {
            元数据: {
                请求ID,
                请求方法: req.method,
                请求路径: req.path,
                磁盘根路径: diskRoot,
                SAC文件夹路径: sacFolderPath,
                客户端IP: req.ip || req.connection.remoteAddress
            },
            标签: ['磁盘管理', '请求开始']
        });

        fs.access(sacFolderPath, fs.constants.F_OK, (err) => {
            if (err) {
                日志.信息(`磁盘未受管理: ${diskRoot}`, 'DiskHandler', {
                    元数据: {
                        请求ID,
                        磁盘根路径: diskRoot,
                        检查结果: '未受管理',
                        错误代码: err.code
                    },
                    标签: ['磁盘管理', '未受管理']
                });
                
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ managed: false }));
            } else {
                日志.信息(`磁盘受管理: ${diskRoot}`, 'DiskHandler', {
                    元数据: {
                        请求ID,
                        磁盘根路径: diskRoot,
                        检查结果: '受管理'
                    },
                    标签: ['磁盘管理', '受管理']
                });
                
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ managed: true }));
            }
        });
    } catch (error) {
        日志.错误(`检查磁盘管理状态时出错: ${error.message}`, 'DiskHandler', {
            元数据: {
                请求ID,
                请求路径: req.path,
                错误类型: error.name,
                错误消息: error.message,
                错误栈: error.stack
            },
            标签: ['磁盘管理', '错误']
        });
        
        next(error);
    }
}