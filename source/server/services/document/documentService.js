/**
 * 文档处理服务
 * 提供PDF和Office文档的处理功能
 */

import fs from 'fs';
import path from 'path';
import { logger } from '../logger/loggerService.js';
import { getAppConfig } from '../../config/configManager.js';

// 获取文档服务配置
const getDocumentConfig = () => {
    const config = getAppConfig();
    return config.document || {
        tempDir: path.join(process.env.TEMP || '/tmp', 'sac-document-temp'),
        cacheSize: 100,
        previewQuality: 'medium'
    };
};

// 检查文件是否为PDF
const isPdfFile = (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.pdf';
};

// 检查文件是否为Office文档
const isOfficeFile = (filePath) => {
    const supportedOfficeFormats = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
    const ext = path.extname(filePath).toLowerCase();
    return supportedOfficeFormats.includes(ext);
};

// 确保临时目录存在
const ensureTempDir = () => {
    const config = getDocumentConfig();
    if (!fs.existsSync(config.tempDir)) {
        try {
            fs.mkdirSync(config.tempDir, { recursive: true });
            logger.info(`创建文档处理临时目录: ${config.tempDir}`);
        } catch (error) {
            logger.error(`创建文档处理临时目录失败: ${error.message}`);
            throw error;
        }
    }
    return config.tempDir;
};

/**
 * 从PDF文档中提取文本
 * @param {string} filePath - PDF文件路径
 * @returns {Promise<string>} 提取的文本内容
 */
export const extractTextFromPdf = async (filePath) => {
    try {
        if (!isPdfFile(filePath)) {
            throw new Error('不是有效的PDF文件');
        }

        logger.info(`从PDF提取文本: ${filePath}`);
        
        // 这里是真实实现的占位
        // 实际实现需要使用PDF解析库，如pdf.js
        
        // 模拟提取过程
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 返回模拟数据
        return `这是从PDF文件 ${path.basename(filePath)} 中提取的示例文本内容。
        文档包含了多个段落和一些结构化内容。
        这只是一个模拟结果，实际实现需要使用专门的PDF解析库。`;
    } catch (error) {
        logger.error(`PDF文本提取失败: ${error.message}`, error);
        throw error;
    }
};

/**
 * 从Office文档中提取文本和元数据
 * @param {string} filePath - Office文档文件路径
 * @returns {Promise<Object>} 包含文本和元数据的对象
 */
export const extractTextFromOffice = async (filePath) => {
    try {
        if (!isOfficeFile(filePath)) {
            throw new Error('不是支持的Office文档格式');
        }

        const fileExt = path.extname(filePath).toLowerCase();
        logger.info(`从Office文档提取文本: ${filePath}`);
        
        // 这里是真实实现的占位
        // 实际实现需要使用Office文档解析库
        
        // 模拟提取过程
        await new Promise(resolve => setTimeout(resolve, 700));
        
        // 准备模拟数据
        let text = `这是从${path.basename(filePath)}中提取的示例文本。`;
        let metadata = {
            author: '未知作者',
            createdDate: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            title: path.basename(filePath, fileExt)
        };
        
        // 根据文件类型返回不同的模拟数据
        if (fileExt === '.doc' || fileExt === '.docx') {
            text += '\n这是一个Word文档。';
            metadata.pageCount = 5;
            metadata.wordCount = 1250;
        } else if (fileExt === '.xls' || fileExt === '.xlsx') {
            text += '\n这是一个Excel电子表格。';
            metadata.sheetCount = 3;
            metadata.cellCount = 500;
        } else if (fileExt === '.ppt' || fileExt === '.pptx') {
            text += '\n这是一个PowerPoint演示文稿。';
            metadata.slideCount = 15;
        }
        
        return { text, metadata };
    } catch (error) {
        logger.error(`Office文档文本提取失败: ${error.message}`, error);
        throw error;
    }
};

/**
 * 生成PDF页面预览
 * @param {string} filePath - PDF文件路径
 * @param {number} page - 页码
 * @param {number} width - 预览宽度
 * @returns {Promise<string>} 预览图片路径
 */
export const generatePdfPagePreview = async (filePath, page = 1, width = 800) => {
    try {
        if (!isPdfFile(filePath)) {
            throw new Error('不是有效的PDF文件');
        }

        logger.info(`生成PDF页面预览: ${filePath}, 页码: ${page}, 宽度: ${width}px`);
        
        // 确保临时目录存在
        const tempDir = ensureTempDir();
        
        // 这里是真实实现的占位
        // 实际实现需要使用PDF渲染库，如pdf.js
        
        // 模拟渲染过程
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 生成预览文件路径
        const previewFilename = `${path.basename(filePath, '.pdf')}_p${page}_w${width}.png`;
        const previewPath = path.join(tempDir, previewFilename);
        
        // 模拟文件创建（实际使用时应该创建真实文件）
        // fs.writeFileSync(previewPath, 'dummy image data');
        
        return previewPath;
    } catch (error) {
        logger.error(`生成PDF预览失败: ${error.message}`, error);
        throw error;
    }
};

/**
 * 获取PDF文档信息
 * @param {string} filePath - PDF文件路径
 * @returns {Promise<Object>} PDF信息对象
 */
export const getPdfInfo = async (filePath) => {
    try {
        if (!isPdfFile(filePath)) {
            throw new Error('不是有效的PDF文件');
        }

        logger.info(`获取PDF信息: ${filePath}`);
        
        // 这里是真实实现的占位
        // 实际实现需要使用PDF解析库
        
        // 模拟处理过程
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 返回模拟数据
        return {
            pageCount: 15,
            title: path.basename(filePath, '.pdf'),
            author: '未知作者',
            creator: 'PDF生成器',
            creationDate: new Date().toISOString(),
            modificationDate: new Date().toISOString(),
            isEncrypted: false,
            fileSize: fs.statSync(filePath).size
        };
    } catch (error) {
        logger.error(`获取PDF信息失败: ${error.message}`, error);
        throw error;
    }
};

/**
 * 清理临时文件
 * @returns {Promise<number>} 清理的文件数量
 */
export const cleanupTempFiles = async () => {
    try {
        const tempDir = ensureTempDir();
        logger.info(`清理文档处理临时文件: ${tempDir}`);
        
        // 获取所有临时文件
        const files = fs.readdirSync(tempDir);
        let count = 0;
        
        // 获取当前时间
        const now = Date.now();
        const ONE_DAY = 24 * 60 * 60 * 1000; // 毫秒
        
        // 清理24小时前的文件
        for (const file of files) {
            const filePath = path.join(tempDir, file);
            try {
                const stats = fs.statSync(filePath);
                if (now - stats.mtimeMs > ONE_DAY) {
                    fs.unlinkSync(filePath);
                    count++;
                }
            } catch (err) {
                logger.warn(`清理文件失败: ${filePath}, 错误: ${err.message}`);
            }
        }
        
        logger.info(`清理了 ${count} 个临时文件`);
        return count;
    } catch (error) {
        logger.error(`清理临时文件失败: ${error.message}`, error);
        throw error;
    }
}; 