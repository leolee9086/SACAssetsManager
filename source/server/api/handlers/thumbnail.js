/**
 * 缩略图API处理器
 * 提供图片缩略图生成和管理功能
 */

import path from 'path';
import { 日志 } from '../../../../src/toolBox/base/useEcma/forLogs/useLogger.js';
import { standardizeHandler, createSuccessResponse, createErrorResponse } from './handlerTemplate.js';
import * as thumbnailService from '../../services/thumbnail/index.js';
import * as fsService from '../../services/fs/index.js';
import { getPaths } from '../../config/paths.js';
import { getServiceConfig } from '../../config/services.js';

/**
 * 生成图片缩略图
 */
export const generateThumbnail = standardizeHandler(async (ctx) => {
  const { req, res } = ctx;
  let filePath = req.query.path || req.query.localPath;
  
  if (!filePath) {
    return createErrorResponse('未提供文件路径', '参数错误', 400);
  }
  
  // 处理路径
  // 如果是相对路径，根据query参数处理
  if (req.query.path && !path.isAbsolute(filePath)) {
    const paths = getPaths();
    filePath = path.join(paths.siyuanAssetsDir, filePath);
  }
  
  try {
    // 检查文件是否存在
    await fsService.stat(filePath);
    
    // 获取缩略图尺寸
    const config = getServiceConfig('thumbnail');
    const sizeParam = req.query.size;
    let size = sizeParam ? parseInt(sizeParam, 10) : config.defaultSize || 200;
    
    // 检查尺寸是否有效
    if (isNaN(size) || size <= 0) {
      size = config.defaultSize || 200;
    }
    
    // 限制最大尺寸
    if (size > config.maxSize) {
      size = config.maxSize;
    }
    
    // 生成缩略图
    const force = req.query.force === 'true' || req.query.force === '1';
    const thumbnail = await thumbnailService.getThumbnail(filePath, {
      size,
      force
    });
    
    // 设置响应头
    const ext = path.extname(filePath).toLowerCase().substring(1);
    let mimeType = 'image/jpeg';
    
    switch (ext) {
      case 'png':
        mimeType = 'image/png';
        break;
      case 'gif':
        mimeType = 'image/gif';
        break;
      case 'webp':
        mimeType = 'image/webp';
        break;
      case 'svg':
        mimeType = 'image/svg+xml';
        break;
    }
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', thumbnail.length);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 缓存一天
    
    // 发送缩略图
    res.send(thumbnail);
    return null; // 已发送响应，不需要返回
  } catch (error) {
    日志.错误(`生成缩略图失败: ${filePath} - ${error.message}`, 'Thumbnail-API');
    
    // 如果请求了JSON格式，则返回JSON错误
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return createErrorResponse(error, '生成缩略图失败', 500);
    }
    
    // 否则使用默认图像
    try {
      // 设置错误响应
      res.status(500);
      res.setHeader('Content-Type', 'image/png');
      
      // 发送默认错误图像（可以替换为实际的默认图像路径）
      const defaultImagePath = path.join(getPaths().pluginDir, 'assets/error-image.png');
      const defaultImage = await fsService.readFile(defaultImagePath);
      res.send(defaultImage);
    } catch (defaultImageError) {
      // 如果无法发送默认图像，则发送文本错误
      日志.错误(`发送默认错误图像失败: ${defaultImageError.message}`, 'Thumbnail-API');
      res.status(500).send('Error generating thumbnail');
    }
    
    return null; // 已发送响应，不需要返回
  }
});

/**
 * 清除缩略图缓存
 */
export const clearThumbnailCache = standardizeHandler(async (ctx) => {
  const { req } = ctx;
  const filePath = req.query.path || req.body.path;
  
  try {
    const options = {
      memory: req.query.memory !== 'false' && req.body.memory !== false,
      disk: req.query.disk === 'true' || req.body.disk === true
    };
    
    if (filePath) {
      await thumbnailService.clearCache(filePath, options);
      return createSuccessResponse({
        message: '清除指定文件的缩略图缓存成功',
        path: filePath
      });
    } else {
      await thumbnailService.clearCache(null, options);
      return createSuccessResponse({
        message: '清除所有缩略图缓存成功'
      });
    }
  } catch (error) {
    日志.错误(`清除缩略图缓存失败: ${error.message}`, 'Thumbnail-API');
    return createErrorResponse(error, '清除缩略图缓存失败', 500);
  }
});

/**
 * 上传图片，处理后返回路径
 */
export const uploadImage = standardizeHandler(async (ctx) => {
  const { req } = ctx;
  
  // 确保有上传的文件
  if (!req.files || Object.keys(req.files).length === 0) {
    return createErrorResponse('未上传文件', '参数错误', 400);
  }
  
  const uploadedFile = req.files.file;
  const targetDir = req.body.targetDir || getPaths().tempDir;
  
  try {
    // 确保目录存在
    await fsService.mkdir(targetDir, { recursive: true });
    
    // 生成唯一文件名
    const timestamp = Date.now();
    const filename = `${timestamp}_${path.basename(uploadedFile.name)}`;
    const targetPath = path.join(targetDir, filename);
    
    // 保存文件
    await fsService.writeFile(targetPath, uploadedFile.data);
    
    日志.信息(`文件上传成功: ${targetPath}`, 'Thumbnail-API');
    
    return createSuccessResponse({
      originalName: uploadedFile.name,
      filename: filename,
      path: targetPath,
      size: uploadedFile.size,
      mimetype: uploadedFile.mimetype
    });
  } catch (error) {
    日志.错误(`文件上传失败: ${error.message}`, 'Thumbnail-API');
    return createErrorResponse(error, '文件上传失败', 500);
  }
});

/**
 * 获取支持的图片格式列表
 */
export const getSupportedFormats = standardizeHandler(async () => {
  return createSuccessResponse({
    formats: [
      { ext: 'jpg', mime: 'image/jpeg' },
      { ext: 'jpeg', mime: 'image/jpeg' },
      { ext: 'png', mime: 'image/png' },
      { ext: 'gif', mime: 'image/gif' },
      { ext: 'webp', mime: 'image/webp' },
      { ext: 'svg', mime: 'image/svg+xml' }
    ]
  });
}); 