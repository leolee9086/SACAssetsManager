/**
 * 图片文件读取和发送工具
 */

import { 日志 } from '../forLogs/useLogger.js';

/**
 * 读取图片并发送到HTTP响应
 * @param {string} 图片路径 - 图片文件的完整路径
 * @param {object} res - HTTP响应对象，必须支持set()和send()方法
 * @param {object} [选项] - 可选配置
 * @param {string} [选项.日志标识='ImageSender'] - 日志标识符
 * @returns {Promise<void>} 发送完成的Promise
 * @throws {Error} 如果读取或发送失败
 */
export const 读取图片并发送 = async (图片路径, res, 选项 = {}) => {
    // 获取文件系统和路径模块
    const fs = typeof window !== 'undefined' && window.fs ? window.fs.promises : 
               typeof require !== 'undefined' ? require('fs').promises : null;
    
    const path = typeof window !== 'undefined' && window.path ? window.path : 
                 typeof require !== 'undefined' ? require('path') : null;
    
    if (!fs || !path) {
        throw new Error('无法获取文件系统或路径模块');
    }
    
    const 日志标识 = 选项.日志标识 || 'ImageSender';
    const 读取开始时间 = performance.now();
    
    try {
        // 读取图片数据
        const 图片数据 = await fs.readFile(图片路径);
        const 扩展名 = path.extname(图片路径).slice(1).toLowerCase();
        
        // 根据扩展名设置正确的MIME类型
        let 文件类型 = 'image/jpeg'; // 默认值
        
        switch (扩展名) {
            case 'png': 文件类型 = 'image/png'; break;
            case 'gif': 文件类型 = 'image/gif'; break;
            case 'bmp': 文件类型 = 'image/bmp'; break;
            case 'webp': 文件类型 = 'image/webp'; break;
            case 'svg': 文件类型 = 'image/svg+xml'; break;
            case 'ico': 文件类型 = 'image/x-icon'; break;
            case 'tiff':
            case 'tif': 文件类型 = 'image/tiff'; break;
            case 'heic': 文件类型 = 'image/heic'; break;
            case 'heif': 文件类型 = 'image/heif'; break;
            default:
                if (['jpg', 'jpeg'].includes(扩展名)) {
                    文件类型 = 'image/jpeg';
                } else {
                    文件类型 = `image/${扩展名}`;
                }
        }
        
        const 文件大小 = 图片数据.length;
        
        日志.调试(`成功读取图片: ${图片路径}`, 日志标识, {
            元数据: { 
                图片路径, 
                文件类型,
                文件大小: `${(文件大小 / 1024).toFixed(2)}KB`,
                读取耗时: `${(performance.now() - 读取开始时间).toFixed(2)}ms`
            },
            标签: ['文件读取', '图片', '成功']
        });
        
        // 设置内容类型并发送响应
        res.set('Content-Type', 文件类型);
        return res.send(图片数据);
    } catch (错误) {
        日志.错误(`读取图片失败: ${错误.message}`, 日志标识, {
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