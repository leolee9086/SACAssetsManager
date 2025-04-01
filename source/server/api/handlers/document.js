/**
 * 文档处理API处理器
 * 处理PDF和Office文档的解析和处理
 */

import path from 'path';
import fs from 'fs';
import { logger } from '../../services/logger/loggerService.js';
import { createSuccessResponse, createErrorResponse } from '../apiService.js';
import * as documentService from '../../services/document/documentService.js';

/**
 * 从PDF文档中提取文本内容
 * @param {object} req - 请求对象
 * @param {object} res - 响应对象
 */
export const extractPdfText = async (req, res) => {
    try {
        const filePath = req.query.path;
        if (!filePath) {
            return createErrorResponse(res, 400, '未提供文件路径');
        }

        if (!fs.existsSync(filePath)) {
            return createErrorResponse(res, 404, '文件不存在');
        }

        if (path.extname(filePath).toLowerCase() !== '.pdf') {
            return createErrorResponse(res, 400, '文件不是PDF格式');
        }

        // 使用文档服务提取PDF文本
        const text = await documentService.extractTextFromPdf(filePath);
        
        return createSuccessResponse(res, {
            filePath,
            text,
            pageCount: text.length > 0 ? Math.ceil(text.length / 2000) : 0,
            characterCount: text.length
        });
    } catch (error) {
        logger.error('提取PDF文本时出错', error);
        return createErrorResponse(res, 500, '提取PDF文本时出错', error);
    }
};

/**
 * 从Office文档中提取文本内容
 * @param {object} req - 请求对象
 * @param {object} res - 响应对象
 */
export const extractOfficeText = async (req, res) => {
    try {
        const filePath = req.query.path;
        if (!filePath) {
            return createErrorResponse(res, 400, '未提供文件路径');
        }

        if (!fs.existsSync(filePath)) {
            return createErrorResponse(res, 404, '文件不存在');
        }

        const ext = path.extname(filePath).toLowerCase();
        const supportedFormats = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
        
        if (!supportedFormats.includes(ext)) {
            return createErrorResponse(res, 400, '不支持的文件格式');
        }

        // 使用文档服务提取Office文档文本
        const result = await documentService.extractTextFromOffice(filePath);
        
        return createSuccessResponse(res, {
            filePath,
            text: result.text,
            metadata: result.metadata,
            format: ext.substring(1)
        });
    } catch (error) {
        logger.error('提取Office文本时出错', error);
        return createErrorResponse(res, 500, '提取Office文本时出错', error);
    }
};

/**
 * 获取PDF文档的页面预览
 * @param {object} req - 请求对象
 * @param {object} res - 响应对象
 */
export const getPdfPagePreview = async (req, res) => {
    try {
        const { path: filePath, page = 1, width = 800 } = req.query;
        
        if (!filePath) {
            return createErrorResponse(res, 400, '未提供文件路径');
        }

        if (!fs.existsSync(filePath)) {
            return createErrorResponse(res, 404, '文件不存在');
        }

        if (path.extname(filePath).toLowerCase() !== '.pdf') {
            return createErrorResponse(res, 400, '文件不是PDF格式');
        }

        // 使用文档服务生成PDF页面预览
        const previewPath = await documentService.generatePdfPagePreview(
            filePath, 
            parseInt(page), 
            parseInt(width)
        );
        
        return createSuccessResponse(res, {
            filePath,
            page: parseInt(page),
            previewPath,
            width: parseInt(width)
        });
    } catch (error) {
        logger.error('生成PDF预览时出错', error);
        return createErrorResponse(res, 500, '生成PDF预览时出错', error);
    }
};

/**
 * 获取PDF文档信息
 * @param {object} req - 请求对象
 * @param {object} res - 响应对象
 */
export const getPdfInfo = async (req, res) => {
    try {
        const filePath = req.query.path;
        if (!filePath) {
            return createErrorResponse(res, 400, '未提供文件路径');
        }

        if (!fs.existsSync(filePath)) {
            return createErrorResponse(res, 404, '文件不存在');
        }

        if (path.extname(filePath).toLowerCase() !== '.pdf') {
            return createErrorResponse(res, 400, '文件不是PDF格式');
        }

        // 使用文档服务获取PDF信息
        const pdfInfo = await documentService.getPdfInfo(filePath);
        
        return createSuccessResponse(res, {
            filePath,
            ...pdfInfo
        });
    } catch (error) {
        logger.error('获取PDF信息时出错', error);
        return createErrorResponse(res, 500, '获取PDF信息时出错', error);
    }
};

/**
 * 清理文档处理临时文件
 * @param {object} req - 请求对象
 * @param {object} res - 响应对象
 */
export const cleanupTempFiles = async (req, res) => {
    try {
        // 使用文档服务清理临时文件
        const cleanedCount = await documentService.cleanupTempFiles();
        
        return createSuccessResponse(res, {
            cleanedCount,
            success: true,
            message: `成功清理了 ${cleanedCount} 个临时文件`
        });
    } catch (error) {
        logger.error('清理临时文件时出错', error);
        return createErrorResponse(res, 500, '清理临时文件时出错', error);
    }
}; 