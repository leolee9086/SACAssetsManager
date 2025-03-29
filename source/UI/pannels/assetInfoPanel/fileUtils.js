/**
 * @fileoverview 兼容层 - 文件工具
 * 此文件作为兼容层保持API兼容性
 * @deprecated 请直接从src/toolBox/base/useEcma/forFile/forFilePath.js导入函数
 */

import { 
  获取文件名,
  获取文件扩展名,
  获取文件格式描述
} from '../../../../src/toolBox/base/useEcma/forFile/forFilePath.js';

export const getNames = (asset) => {
  return asset?.path ? 获取文件名(asset.path) : '';
};

export const getFileFormat = (assets) => {
  if (assets.length === 0) return '';
  return 获取文件格式描述(assets);
};

