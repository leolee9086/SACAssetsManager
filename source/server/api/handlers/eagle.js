/**
 * Eagle集成API处理器
 * 提供与Eagle素材库交互的API端点
 */

import path from 'path';
import fs from 'fs/promises';
import { 日志 } from '../../../../src/toolBox/base/useEcma/forLogs/useLogger.js';
import { standardizeHandler, createSuccessResponse, createErrorResponse } from './handlerTemplate.js';
import * as fsService from '../../services/fs/index.js';

/**
 * 查找文件所在Eagle素材库路径
 */
export const findEagleLibraryPath = standardizeHandler(async (ctx) => {
  const { req } = ctx;
  const filePath = req.query.path;
  
  if (!filePath) {
    return createErrorResponse('未提供文件路径', '参数错误', 400);
  }
  
  try {
    // 查找文件所在的Eagle素材库
    const eaglePath = await findFileInEagleLibrary(filePath);
    
    return createSuccessResponse({
      path: filePath,
      eaglePath: eaglePath
    });
  } catch (error) {
    日志.错误(`查找Eagle库路径失败: ${filePath} - ${error.message}`, 'Eagle-API');
    return createErrorResponse(error, '查找Eagle库路径失败', 500);
  }
});

/**
 * 获取Eagle素材库标签列表
 */
export const getEagleLibraryTags = standardizeHandler(async (ctx) => {
  const { req } = ctx;
  const libraryPath = req.query.path;
  
  if (!libraryPath) {
    return createErrorResponse('未提供素材库路径', '参数错误', 400);
  }
  
  try {
    // 获取Eagle素材库的标签列表
    const tags = await getTagsFromEagleLibrary(libraryPath);
    
    return createSuccessResponse({
      libraryPath,
      tags
    });
  } catch (error) {
    日志.错误(`获取Eagle标签列表失败: ${libraryPath} - ${error.message}`, 'Eagle-API');
    return createErrorResponse(error, '获取Eagle标签列表失败', 500);
  }
});

/**
 * 搜索Eagle素材库中的资源
 */
export const searchEagleLibrary = standardizeHandler(async (ctx) => {
  const { req } = ctx;
  const libraryPath = req.query.path;
  const searchQuery = req.query.query || '';
  const tags = req.query.tags ? req.query.tags.split(',') : [];
  const limit = parseInt(req.query.limit || '20', 10);
  
  if (!libraryPath) {
    return createErrorResponse('未提供素材库路径', '参数错误', 400);
  }
  
  try {
    // 在Eagle素材库中搜索资源
    const results = await searchInEagleLibrary(libraryPath, searchQuery, tags, limit);
    
    return createSuccessResponse({
      libraryPath,
      query: searchQuery,
      tags,
      results,
      total: results.length
    });
  } catch (error) {
    日志.错误(`搜索Eagle素材库失败: ${libraryPath} - ${error.message}`, 'Eagle-API');
    return createErrorResponse(error, '搜索Eagle素材库失败', 500);
  }
});

/**
 * 在Eagle素材库中查找文件所在路径
 * @param {string} filePath - 文件路径
 * @returns {Promise<string|null>} Eagle素材库路径
 */
const findFileInEagleLibrary = async (filePath) => {
  // 示例实现，寻找文件所在的Eagle素材库
  const normalizedPath = path.normalize(filePath);
  
  // 从文件路径向上遍历，寻找.eagle文件夹
  let currentDir = path.dirname(normalizedPath);
  const root = path.parse(currentDir).root;
  
  while (currentDir !== root) {
    try {
      // 检查当前目录是否是Eagle素材库
      const eagleMetadataPath = path.join(currentDir, 'metadata.json');
      await fs.access(eagleMetadataPath);
      
      // 找到Eagle素材库
      return currentDir;
    } catch (error) {
      // 继续向上查找
      currentDir = path.dirname(currentDir);
    }
  }
  
  // 未找到Eagle素材库
  return null;
};

/**
 * 从Eagle素材库中获取标签列表
 * @param {string} libraryPath - Eagle素材库路径
 * @returns {Promise<Array>} 标签列表
 */
const getTagsFromEagleLibrary = async (libraryPath) => {
  try {
    // 尝试读取Eagle素材库的标签信息
    const metadataPath = path.join(libraryPath, 'metadata.json');
    const metadataContent = await fs.readFile(metadataPath, 'utf8');
    const metadata = JSON.parse(metadataContent);
    
    // 如果有标签列表，返回
    if (metadata && metadata.tags && Array.isArray(metadata.tags)) {
      return metadata.tags;
    }
    
    // 如果没有显式的标签列表，可以尝试从素材中提取
    const tagsMap = new Map();
    const itemsFolder = path.join(libraryPath, 'items');
    
    try {
      const itemFolders = await fs.readdir(itemsFolder);
      
      for (const folder of itemFolders) {
        const infoPath = path.join(itemsFolder, folder, 'metadata.json');
        
        try {
          const infoContent = await fs.readFile(infoPath, 'utf8');
          const info = JSON.parse(infoContent);
          
          if (info && info.tags && Array.isArray(info.tags)) {
            for (const tag of info.tags) {
              if (typeof tag === 'string') {
                tagsMap.set(tag, (tagsMap.get(tag) || 0) + 1);
              }
            }
          }
        } catch (error) {
          // 忽略单个项目的错误
        }
      }
    } catch (error) {
      // 忽略items文件夹的错误
    }
    
    // 转换为数组并按使用频率排序
    return Array.from(tagsMap.entries())
      .map(([tag, count]) => ({ name: tag, count }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    日志.错误(`读取Eagle标签列表失败: ${libraryPath} - ${error.message}`, 'Eagle-API');
    return [];
  }
};

/**
 * 在Eagle素材库中搜索资源
 * @param {string} libraryPath - Eagle素材库路径
 * @param {string} query - 搜索关键词
 * @param {string[]} tags - 标签列表
 * @param {number} limit - 结果数量限制
 * @returns {Promise<Array>} 搜索结果
 */
const searchInEagleLibrary = async (libraryPath, query, tags, limit) => {
  const results = [];
  const itemsFolder = path.join(libraryPath, 'items');
  
  try {
    const itemFolders = await fs.readdir(itemsFolder);
    
    for (const folder of itemFolders) {
      if (results.length >= limit) {
        break;
      }
      
      const infoPath = path.join(itemsFolder, folder, 'metadata.json');
      
      try {
        const infoContent = await fs.readFile(infoPath, 'utf8');
        const info = JSON.parse(infoContent);
        
        // 匹配条件：标签和关键词
        let match = true;
        
        // 匹配标签
        if (tags.length > 0) {
          if (!info.tags || !Array.isArray(info.tags)) {
            match = false;
          } else {
            for (const tag of tags) {
              if (!info.tags.includes(tag)) {
                match = false;
                break;
              }
            }
          }
        }
        
        // 匹配关键词
        if (match && query) {
          const lowerQuery = query.toLowerCase();
          const nameMatch = info.name && info.name.toLowerCase().includes(lowerQuery);
          const descriptionMatch = info.description && info.description.toLowerCase().includes(lowerQuery);
          
          if (!nameMatch && !descriptionMatch) {
            match = false;
          }
        }
        
        // 如果匹配，添加到结果
        if (match) {
          // 查找资源文件
          const filesFolderPath = path.join(itemsFolder, folder, 'files');
          let files = [];
          
          try {
            files = await fs.readdir(filesFolderPath);
          } catch (error) {
            // 忽略文件读取错误
          }
          
          results.push({
            id: folder,
            name: info.name || '未命名',
            description: info.description || '',
            tags: info.tags || [],
            path: path.join(itemsFolder, folder),
            files: files.map(file => path.join(filesFolderPath, file)),
            previewPath: path.join(itemsFolder, folder, info.thumbnail || 'thumbnail.png'),
            createdAt: info.createdAt || null,
            modifiedAt: info.modifiedAt || null
          });
        }
      } catch (error) {
        // 忽略单个项目的错误
      }
    }
    
    return results;
  } catch (error) {
    日志.错误(`搜索Eagle素材库失败: ${libraryPath} - ${error.message}`, 'Eagle-API');
    return [];
  }
}; 