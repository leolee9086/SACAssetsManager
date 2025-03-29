/**
 * @fileoverview 兼容层 - 资产标签工具
 * 此文件作为兼容层保持API兼容性
 * @deprecated 请直接从src/toolBox/base/useEcma/forFile/forFilePath.js导入函数
 */

import { 
  获取文件名,
  生成文件列表描述
} from '../../../../src/toolBox/base/useEcma/forFile/forFilePath.js';

export const getAssetLabel = (assets) => {
  if (assets.length === 0) return '';
  return 生成文件列表描述(assets);
};
