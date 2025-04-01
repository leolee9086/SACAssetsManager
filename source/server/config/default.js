/**
 * 默认配置文件
 * 定义应用程序的默认配置
 */

import path from 'path';
import os from 'os';

/**
 * 应用默认配置
 */
export const DEFAULT_CONFIG = {
    /**
     * 服务器设置
     */
    server: {
        // 服务端口
        port: 3000,
        // 允许的跨域源
        allowedOrigins: ['http://localhost:3000'],
        // 请求体大小限制
        bodyLimit: '50mb',
        // 是否启用压缩
        compression: true,
        // 超时设置（毫秒）
        timeout: 30000
    },

    /**
     * 日志设置
     */
    logger: {
        // 日志级别 (debug, info, warn, error)
        level: 'info',
        // 日志文件路径
        filePath: path.join(os.homedir(), 'sacassetsmanager', 'logs'),
        // 是否在控制台输出
        console: true,
        // 是否记录到文件
        file: true,
        // 最大日志文件大小（字节）
        maxSize: 10 * 1024 * 1024, // 10MB
        // 最大历史文件数量
        maxFiles: 5
    },

    /**
     * 文件系统服务设置
     */
    fs: {
        // 缓存设置
        cache: {
            // 是否启用缓存
            enabled: true,
            // 缓存有效期（毫秒）
            ttl: 5 * 60 * 1000, // 5分钟
            // 最大缓存项目数
            maxItems: 1000
        },
        // 文件操作设置
        operations: {
            // 读取文件时的默认编码
            defaultEncoding: 'utf8',
            // 读取二进制文件的扩展名列表
            binaryExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.pdf', '.zip', '.rar'],
            // 最大读取文件大小（字节）
            maxReadSize: 100 * 1024 * 1024 // 100MB
        }
    },

    /**
     * 缩略图服务设置
     */
    thumbnail: {
        // 缩略图缓存目录
        cacheDir: path.join(os.homedir(), 'sacassetsmanager', 'thumbnail-cache'),
        // 默认缩略图宽度
        defaultWidth: 200,
        // 默认缩略图高度
        defaultHeight: 200,
        // 缩略图质量 (0-100)
        quality: 80,
        // 支持的图片格式
        supportedFormats: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
        // 缓存设置
        cache: {
            // 最大缓存大小（字节）
            maxSize: 500 * 1024 * 1024, // 500MB
            // 缓存清理阈值（字节），达到此大小时触发清理
            cleanupThreshold: 450 * 1024 * 1024, // 450MB
            // 缓存项目过期时间（毫秒）
            ttl: 30 * 24 * 60 * 60 * 1000 // 30天
        }
    },

    /**
     * 元数据服务设置
     */
    metadata: {
        // 元数据缓存设置
        cache: {
            // 是否启用缓存
            enabled: true,
            // 缓存有效期（毫秒）
            ttl: 60 * 60 * 1000, // 1小时
            // 最大缓存项目数
            maxItems: 2000
        },
        // EXIF数据处理设置
        exif: {
            // 是否提取GPS信息
            extractGPS: true,
            // 是否提取缩略图
            extractThumbnail: false
        }
    },

    /**
     * 颜色分析服务设置
     */
    color: {
        // 颜色分析默认设置
        defaults: {
            // 提取的最大颜色数量
            maxColors: 5,
            // 颜色质量 (1-100)
            quality: 80,
            // 是否排除透明色
            excludeTransparent: true
        },
        // 颜色搜索设置
        search: {
            // 默认颜色容差
            tolerance: 15,
            // 默认搜索结果数量限制
            limit: 100
        }
    },

    /**
     * Eagle集成设置
     */
    eagle: {
        // 扫描路径设置
        scan: {
            // 默认扫描深度
            depth: 3,
            // 排除的目录名
            excludeDirs: ['.git', 'node_modules', '.vscode']
        },
        // 搜索设置
        search: {
            // 默认搜索结果数量限制
            limit: 200,
            // 标签匹配模式 (all, any)
            tagMatchMode: 'any'
        }
    },

    /**
     * 文档处理配置
     */
    document: {
        // 临时文件目录
        tempDir: path.join(os.tmpdir(), 'sac-document-temp'),
        
        // 缓存大小（项目数量）
        cacheSize: 100,
        
        // 预览质量 (low|medium|high)
        previewQuality: 'medium',
        
        // 支持的PDF操作
        pdf: {
            enableTextExtraction: true,
            enablePreview: true,
            maxPreviewWidth: 1200,
            previewFormat: 'png'
        },
        
        // 支持的Office文档操作
        office: {
            enableTextExtraction: true,
            supportedFormats: ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']
        }
    },

    /**
     * 许可证设置
     */
    license: {
        // 许可证文件路径
        filePath: path.join(os.homedir(), 'sacassetsmanager', 'license.key'),
        // 验证周期（毫秒）
        validationInterval: 24 * 60 * 60 * 1000 // 24小时
    }
}; 