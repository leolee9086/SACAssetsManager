/**
 * @fileoverview 资产信息处理工具函数
 * 提供处理资产信息、格式、路径和描述的工具函数
 */

import path from '../../../../polyfills/path.js';

/**
 * 获取文件格式
 * @param {Array} assets 资产数组
 * @returns {string} 文件格式描述
 */
export function 获取资产文件格式(assets) {
  if (!assets || assets.length === 0) return '';
  
  const formats = new Set(assets.map(asset => 
    asset?.path ? asset.path.split('.').pop().toUpperCase() : ''
  ).filter(Boolean));
  
  if (formats.size === 1) {
    return Array.from(formats)[0];
  } else {
    return '多种';
  }
}

/**
 * 获取资产所在本地文件夹路径
 * @param {Array} assets 资产数组
 * @returns {Object} 包含文件夹数组和显示文本
 */
export function 获取资产本地文件夹(assets) {
  if (!assets || assets.length === 0) {
    return {
      folderArray: [],
      displayText: '无选择'
    };
  }

  const folderArray = assets.map(asset => {
    if (!asset?.path) return null;
    
    if (asset.path.startsWith('assets/')) {
      // 思源笔记内部资产
      return path.dirname(window.siyuan?.config?.system?.workspaceDir + '/data/' + asset.path).replace(/\\/g, '/');
    } else {
      // 外部资产
      return path.dirname(asset.path).replace(/\\/g, '/');
    }
  }).filter(Boolean);

  const uniquePaths = Array.from(new Set(folderArray));

  return {
    folderArray: uniquePaths,
    displayText: uniquePaths.length === 1 ? uniquePaths[0] : `多个目录 (${uniquePaths.length})`
  };
}

/**
 * 生成资产标签描述
 * @param {Array} assets 资产数组
 * @returns {string} 资产描述文本
 */
export function 生成资产描述标签(assets) {
  if (!assets || assets.length === 0) return '无选择';
  
  const getAssetName = (asset) => asset?.path ? asset.path.split('/').pop() : '';
  
  if (assets.length <= 3) {
    return assets.map(item => getAssetName(item)).filter(Boolean).join(', ');
  } else {
    return `${getAssetName(assets[0])} 等 ${assets.length} 个文件`;
  }
}

/**
 * 处理资产路径数组，移除重复并过滤无效项
 * @param {Array} assetPaths 资产路径数组
 * @returns {Array} 处理后的资产路径数组
 */
export function 处理资产路径数组(assetPaths) {
  if (!assetPaths || !Array.isArray(assetPaths)) return [];
  return Array.from(new Set(assetPaths.filter(Boolean)));
}

/**
 * 比较两个资产路径数组是否相同
 * @param {Array} pathArray1 第一个资产路径数组
 * @param {Array} pathArray2 第二个资产路径数组
 * @returns {boolean} 如果相同返回true，否则返回false
 */
export function 比较资产路径数组(pathArray1, pathArray2) {
  if (!pathArray1 || !pathArray2) return false;
  if (pathArray1.length !== pathArray2.length) return false;
  
  const sortedArray1 = [...pathArray1].sort();
  const sortedArray2 = [...pathArray2].sort();
  
  return JSON.stringify(sortedArray1) === JSON.stringify(sortedArray2);
} 