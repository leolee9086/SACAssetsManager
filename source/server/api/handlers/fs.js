/**
 * 文件系统API处理器
 * 提供文件和目录操作相关的API端点
 */

import path from 'path';
import { 日志 } from '../../../../src/toolBox/base/useEcma/forLogs/useLogger.js';
import { standardizeHandler, createSuccessResponse, createErrorResponse } from './handlerTemplate.js';
import * as fsService from '../../services/fs/index.js';
import { getPaths } from '../../config/paths.js';

/**
 * 获取文件或目录信息
 */
export const getFileInfo = standardizeHandler(async (ctx) => {
  const { req } = ctx;
  const filePath = req.query.path || req.params.path;
  
  if (!filePath) {
    return createErrorResponse('未提供文件路径', '参数错误', 400);
  }
  
  try {
    const info = await fsService.getFileInfo(filePath);
    return createSuccessResponse(info);
  } catch (error) {
    日志.错误(`获取文件信息失败: ${filePath} - ${error.message}`, 'FS-API');
    return createErrorResponse(error, '获取文件信息失败', 500);
  }
});

/**
 * 列出目录内容
 */
export const listDirectory = standardizeHandler(async (ctx) => {
  const { req } = ctx;
  const dirPath = req.query.path || req.params.path;
  
  if (!dirPath) {
    return createErrorResponse('未提供目录路径', '参数错误', 400);
  }
  
  try {
    const withFileTypes = req.query.details === 'true' || req.query.details === '1';
    const filter = req.query.filter ? req.query.filter.split(',') : null;
    
    const entries = await fsService.readdir(dirPath, { 
      withFileTypes, 
      filter 
    });
    
    return createSuccessResponse({
      path: dirPath,
      entries,
      total: entries.length
    });
  } catch (error) {
    日志.错误(`列出目录内容失败: ${dirPath} - ${error.message}`, 'FS-API');
    return createErrorResponse(error, '列出目录内容失败', 500);
  }
});

/**
 * 读取文件内容
 */
export const readFile = standardizeHandler(async (ctx) => {
  const { req, res } = ctx;
  const filePath = req.query.path || req.params.path;
  
  if (!filePath) {
    return createErrorResponse('未提供文件路径', '参数错误', 400);
  }
  
  try {
    const encoding = req.query.encoding || 'utf8';
    const asText = req.query.raw !== 'true' && req.query.raw !== '1';
    
    if (asText) {
      const content = await fsService.readFile(filePath, { encoding });
      return createSuccessResponse({
        path: filePath,
        content,
        encoding
      });
    } else {
      // 直接发送文件
      const info = await fsService.getFileInfo(filePath);
      
      if (info.isDirectory) {
        return createErrorResponse('不能直接读取目录内容', '不支持的操作', 400);
      }
      
      res.setHeader('Content-Type', info.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
      
      const fileContent = await fsService.readFile(filePath, { encoding: null });
      res.send(fileContent);
      return null; // 已发送响应，不需要返回
    }
  } catch (error) {
    日志.错误(`读取文件内容失败: ${filePath} - ${error.message}`, 'FS-API');
    return createErrorResponse(error, '读取文件内容失败', 500);
  }
});

/**
 * 写入文件内容
 */
export const writeFile = standardizeHandler(async (ctx) => {
  const { req } = ctx;
  const filePath = req.body.path || req.params.path;
  const content = req.body.content;
  
  if (!filePath) {
    return createErrorResponse('未提供文件路径', '参数错误', 400);
  }
  
  if (content === undefined) {
    return createErrorResponse('未提供文件内容', '参数错误', 400);
  }
  
  try {
    const encoding = req.body.encoding || 'utf8';
    const overwrite = req.body.overwrite !== false;
    
    await fsService.writeFile(filePath, content, {
      encoding,
      overwrite
    });
    
    return createSuccessResponse({
      path: filePath,
      success: true
    });
  } catch (error) {
    日志.错误(`写入文件内容失败: ${filePath} - ${error.message}`, 'FS-API');
    return createErrorResponse(error, '写入文件内容失败', 500);
  }
});

/**
 * 删除文件或目录
 */
export const removeFile = standardizeHandler(async (ctx) => {
  const { req } = ctx;
  const filePath = req.query.path || req.body.path || req.params.path;
  
  if (!filePath) {
    return createErrorResponse('未提供文件路径', '参数错误', 400);
  }
  
  try {
    const recursive = req.query.recursive !== 'false' && req.body.recursive !== false;
    
    await fsService.remove(filePath, { recursive });
    
    return createSuccessResponse({
      path: filePath,
      success: true
    });
  } catch (error) {
    日志.错误(`删除文件失败: ${filePath} - ${error.message}`, 'FS-API');
    return createErrorResponse(error, '删除文件失败', 500);
  }
});

/**
 * 列出磁盘驱动器
 */
export const listDrives = standardizeHandler(async (ctx) => {
  try {
    // 获取系统信息以确定平台
    const os = await import('os');
    const platform = os.platform();
    
    if (platform === 'win32') {
      // Windows平台，使用外部模块获取驱动器
      const { execSync } = await import('child_process');
      
      const output = execSync('wmic logicaldisk get name, volumename, description').toString();
      const drives = [];
      
      output.split('\n').slice(1).forEach(line => {
        line = line.trim();
        if (line) {
          const parts = line.split(/\s{2,}/);
          if (parts.length >= 2) {
            drives.push({
              name: parts[0].trim(),
              description: parts[1].trim(),
              volumeName: parts[2] ? parts[2].trim() : ''
            });
          }
        }
      });
      
      return createSuccessResponse(drives);
    } else {
      // 非Windows平台，返回根目录
      return createSuccessResponse([{
        name: '/',
        description: 'Root Directory',
        volumeName: 'Root'
      }]);
    }
  } catch (error) {
    日志.错误(`列出驱动器失败: ${error.message}`, 'FS-API');
    return createErrorResponse(error, '列出驱动器失败', 500);
  }
});

/**
 * 获取文件扩展名统计
 */
export const getExtensionStats = standardizeHandler(async (ctx) => {
  const { req } = ctx;
  const dirPath = req.query.path || req.params.path;
  
  if (!dirPath) {
    return createErrorResponse('未提供目录路径', '参数错误', 400);
  }
  
  try {
    const recursive = req.query.recursive === 'true' || req.query.recursive === '1';
    const stats = await getDirectoryExtensionStats(dirPath, recursive);
    
    return createSuccessResponse(stats);
  } catch (error) {
    日志.错误(`获取扩展名统计失败: ${dirPath} - ${error.message}`, 'FS-API');
    return createErrorResponse(error, '获取扩展名统计失败', 500);
  }
});

/**
 * 递归获取目录中的文件扩展名统计
 * @param {string} dirPath - 目录路径
 * @param {boolean} recursive - 是否递归处理子目录
 * @returns {Promise<Object>} 扩展名统计
 */
const getDirectoryExtensionStats = async (dirPath, recursive = false) => {
  const stats = {
    extensions: {},
    totalFiles: 0,
    totalDirs: 0
  };
  
  try {
    const entries = await fsService.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory) {
        stats.totalDirs++;
        
        if (recursive) {
          try {
            const subStats = await getDirectoryExtensionStats(entry.path, recursive);
            
            // 合并统计结果
            stats.totalFiles += subStats.totalFiles;
            stats.totalDirs += subStats.totalDirs;
            
            for (const [ext, count] of Object.entries(subStats.extensions)) {
              stats.extensions[ext] = (stats.extensions[ext] || 0) + count;
            }
          } catch (error) {
            // 忽略无法访问的子目录
            日志.警告(`无法访问子目录: ${entry.path} - ${error.message}`, 'FS-API');
          }
        }
      } else {
        stats.totalFiles++;
        const ext = entry.ext || '无扩展名';
        stats.extensions[ext] = (stats.extensions[ext] || 0) + 1;
      }
    }
    
    return stats;
  } catch (error) {
    日志.错误(`统计目录扩展名失败: ${dirPath} - ${error.message}`, 'FS-API');
    throw error;
  }
}; 