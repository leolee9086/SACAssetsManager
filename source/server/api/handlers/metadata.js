/**
 * 元数据API处理器
 * 提供文件元数据操作相关的API端点
 */

import path from 'path';
import { 日志 } from '../../../../src/toolBox/base/useEcma/forLogs/useLogger.js';
import { standardizeHandler, createSuccessResponse, createErrorResponse } from './handlerTemplate.js';
import * as fsService from '../../services/fs/index.js';

/**
 * 读取EXIF元数据
 */
export const readExifMetadata = standardizeHandler(async (ctx) => {
  const { req } = ctx;
  const filePath = req.query.path || req.query.localPath;
  
  if (!filePath) {
    return createErrorResponse('未提供文件路径', '参数错误', 400);
  }
  
  try {
    // 确保文件存在
    await fsService.stat(filePath);
    
    // 导入exif解析库（可以替换为你喜欢的库）
    const exifReader = await import('exif-reader');
    
    // 读取文件
    const fileBuffer = await fsService.readFile(filePath, { encoding: null });
    
    // 解析EXIF元数据
    const metadataResult = exifReader.default(fileBuffer);
    
    // 处理EXIF评论
    try {
      // 获取文件扩展名
      const ext = path.extname(filePath).toLowerCase();
      
      // 根据不同文件类型处理评论
      if (['.jpg', '.jpeg'].includes(ext) && metadataResult.exif && metadataResult.exif.UserComment) {
        // 处理EXIF用户评论
        let comment = metadataResult.exif.UserComment;
        
        // 如果评论是二进制数据，尝试转换为字符串
        if (Buffer.isBuffer(comment)) {
          try {
            // 通常EXIF评论以编码标识符开头
            if (comment.slice(0, 8).toString('ascii').includes('ASCII')) {
              comment = comment.slice(8).toString('ascii').replace(/\0/g, '');
            } else if (comment.slice(0, 10).toString('ascii').includes('UNICODE')) {
              comment = comment.slice(10).toString('utf16le').replace(/\0/g, '');
            } else {
              // 尝试UTF-8
              comment = comment.toString('utf8').replace(/\0/g, '');
            }
          } catch (err) {
            日志.警告(`解析EXIF评论失败: ${err.message}`, 'Metadata-API');
            comment = '[二进制数据]';
          }
        }
        
        metadataResult.exif.UserComment = comment;
      }
    } catch (err) {
      日志.警告(`处理EXIF评论失败: ${err.message}`, 'Metadata-API');
    }
    
    return createSuccessResponse({
      path: filePath,
      metadata: metadataResult
    });
  } catch (error) {
    // 如果没有EXIF数据，返回空结果
    if (error.message && error.message.includes('No Exif data')) {
      return createSuccessResponse({
        path: filePath,
        metadata: {}
      });
    }
    
    日志.错误(`读取EXIF元数据失败: ${filePath} - ${error.message}`, 'Metadata-API');
    return createErrorResponse(error, '读取EXIF元数据失败', 500);
  }
});

/**
 * 读取文件基本属性
 */
export const getFileAttributes = standardizeHandler(async (ctx) => {
  const { req } = ctx;
  const filePath = req.query.path || req.query.localPath || req.params.path;
  
  if (!filePath) {
    return createErrorResponse('未提供文件路径', '参数错误', 400);
  }
  
  try {
    // 获取文件信息
    const fileInfo = await fsService.getFileInfo(filePath);
    
    // 获取文件内容的前100个字节，用于检测文件类型
    let contentPreview = null;
    if (!fileInfo.isDirectory) {
      try {
        const buffer = await fsService.readFile(filePath, { encoding: null });
        contentPreview = buffer.slice(0, 100);
      } catch (err) {
        日志.警告(`读取文件内容预览失败: ${err.message}`, 'Metadata-API');
      }
    }
    
    return createSuccessResponse({
      path: filePath,
      info: fileInfo,
      contentPreview: contentPreview ? contentPreview.toString('hex') : null
    });
  } catch (error) {
    日志.错误(`获取文件属性失败: ${filePath} - ${error.message}`, 'Metadata-API');
    return createErrorResponse(error, '获取文件属性失败', 500);
  }
});

/**
 * 读取图片维度
 */
export const getImageDimensions = standardizeHandler(async (ctx) => {
  const { req } = ctx;
  const filePath = req.query.path || req.query.localPath;
  
  if (!filePath) {
    return createErrorResponse('未提供文件路径', '参数错误', 400);
  }
  
  // 检查文件扩展名
  const ext = path.extname(filePath).toLowerCase();
  const supportedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  
  if (!supportedFormats.includes(ext)) {
    return createErrorResponse('不支持的图片格式', '不支持的操作', 400);
  }
  
  try {
    // 确保文件存在
    await fsService.stat(filePath);
    
    // 导入图像尺寸库
    const { default: imageSize } = await import('image-size');
    
    // 读取文件
    const fileBuffer = await fsService.readFile(filePath, { encoding: null });
    
    // 获取图像尺寸
    const dimensions = imageSize(fileBuffer);
    
    return createSuccessResponse({
      path: filePath,
      width: dimensions.width,
      height: dimensions.height,
      type: dimensions.type
    });
  } catch (error) {
    日志.错误(`获取图片尺寸失败: ${filePath} - ${error.message}`, 'Metadata-API');
    return createErrorResponse(error, '获取图片尺寸失败', 500);
  }
}); 