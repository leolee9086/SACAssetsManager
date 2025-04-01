/**
 * 颜色分析API处理器
 * 提供图片颜色分析相关的API端点
 */

import path from 'path';
import { 日志 } from '../../../../src/toolBox/base/useEcma/forLogs/useLogger.js';
import { standardizeHandler, createSuccessResponse, createErrorResponse } from './handlerTemplate.js';
import * as fsService from '../../services/fs/index.js';
import { getServiceConfig } from '../../config/services.js';

/**
 * 获取图片主要颜色
 */
export const getImageColors = standardizeHandler(async (ctx) => {
  const { req } = ctx;
  const filePath = req.query.path || req.query.localPath;
  const forceRegenerate = req.query.reGen === 'true' || req.query.force === 'true';
  
  if (!filePath) {
    return createErrorResponse('未提供文件路径', '参数错误', 400);
  }
  
  try {
    // 确保文件存在
    const fileStat = await fsService.stat(filePath);
    
    // 检查缓存（如果需要）
    if (!forceRegenerate) {
      // 可以在这里实现颜色缓存查询
      // ...
    }
    
    // 导入颜色分析库
    const { default: getColors } = await import('get-image-colors');
    
    // 读取文件
    const imageBuffer = await fsService.readFile(filePath, { encoding: null });
    
    // 获取文件扩展名
    const ext = path.extname(filePath).substring(1).toLowerCase();
    
    // 获取颜色配置
    const config = getServiceConfig('color');
    const count = config.maxColors || 5;
    
    // 分析颜色
    const colors = await getColors(imageBuffer, { count, type: ext });
    
    // 转换颜色格式
    const result = colors.map(color => {
      // 获取颜色的hex值
      const hex = color.hex();
      
      // 获取RGB值
      const rgb = color.rgb();
      
      // 获取亮度（用于判断是否为暗色）
      const luminance = color.luminosity();
      
      return {
        hex,
        rgb: {
          r: Math.round(rgb[0] * 255),
          g: Math.round(rgb[1] * 255),
          b: Math.round(rgb[2] * 255)
        },
        isDark: luminance < 0.5
      };
    });
    
    // 保存结果到缓存（如果需要）
    // ...
    
    return createSuccessResponse({
      path: filePath,
      colors: result,
      timestamp: Date.now()
    });
  } catch (error) {
    日志.错误(`获取图片颜色失败: ${filePath} - ${error.message}`, 'Color-API');
    return createErrorResponse(error, '获取图片颜色失败', 500);
  }
});

/**
 * 搜索指定颜色的图片
 */
export const searchByColor = standardizeHandler(async (ctx) => {
  const { req } = ctx;
  
  // 获取查询参数
  const colorQuery = req.query.color;
  const tolerance = parseFloat(req.query.tolerance || '0.1');
  const limit = parseInt(req.query.limit || '20', 10);
  const basePath = req.query.basePath;
  
  if (!colorQuery) {
    return createErrorResponse('未提供颜色参数', '参数错误', 400);
  }
  
  // 解析颜色查询
  let targetColor;
  try {
    targetColor = JSON.parse(colorQuery);
  } catch (error) {
    return createErrorResponse('颜色格式无效', '参数错误', 400);
  }
  
  // 检查颜色格式
  if (!targetColor.r || !targetColor.g || !targetColor.b) {
    return createErrorResponse('颜色必须包含r、g、b属性', '参数错误', 400);
  }
  
  try {
    // 查询颜色数据库
    // 这里是一个示例实现，实际中可能需要与数据库服务交互
    const colorResults = await searchColorInDatabase(targetColor, tolerance, limit, basePath);
    
    return createSuccessResponse({
      query: targetColor,
      tolerance,
      results: colorResults
    });
  } catch (error) {
    日志.错误(`搜索颜色图片失败: ${error.message}`, 'Color-API');
    return createErrorResponse(error, '搜索颜色图片失败', 500);
  }
});

/**
 * 删除颜色记录
 */
export const deleteColorRecord = standardizeHandler(async (ctx) => {
  const { req } = ctx;
  const filePath = req.query.path || req.query.localPath || req.body.path;
  
  if (!filePath) {
    return createErrorResponse('未提供文件路径', '参数错误', 400);
  }
  
  try {
    // 删除颜色缓存记录
    // 这里是一个示例实现，实际中可能需要与数据库服务交互
    await deleteColorFromDatabase(filePath);
    
    // 清除相关缓存
    // ...
    
    return createSuccessResponse({
      path: filePath,
      success: true,
      message: '颜色记录删除成功'
    });
  } catch (error) {
    日志.错误(`删除颜色记录失败: ${filePath} - ${error.message}`, 'Color-API');
    return createErrorResponse(error, '删除颜色记录失败', 500);
  }
});

/**
 * 从数据库中搜索颜色（示例实现）
 * @param {Object} targetColor - 目标颜色 {r, g, b}
 * @param {number} tolerance - 容差值
 * @param {number} limit - 结果限制
 * @param {string} basePath - 基础路径
 * @returns {Promise<Array>} 匹配的结果
 */
const searchColorInDatabase = async (targetColor, tolerance, limit, basePath) => {
  // 这里应该实现实际的数据库查询
  // 如果尚未实现，返回模拟数据
  return [
    {
      path: path.join(basePath || 'assets', 'example1.jpg'),
      similarity: 0.95,
      color: { r: targetColor.r - 5, g: targetColor.g - 3, b: targetColor.b + 2 }
    },
    {
      path: path.join(basePath || 'assets', 'example2.png'),
      similarity: 0.87,
      color: { r: targetColor.r + 8, g: targetColor.g - 5, b: targetColor.b - 4 }
    }
  ].slice(0, limit);
};

/**
 * 从数据库中删除颜色记录（示例实现）
 * @param {string} filePath - 文件路径
 * @returns {Promise<void>}
 */
const deleteColorFromDatabase = async (filePath) => {
  // 这里应该实现实际的数据库记录删除
  日志.信息(`模拟删除颜色记录: ${filePath}`, 'Color-API');
}; 