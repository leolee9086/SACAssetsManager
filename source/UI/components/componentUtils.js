/**
 * @fileoverview 兼容层 - 组件工具
 * 此文件作为兼容层保持API兼容性
 * @deprecated 请直接从相应的toolBox工具库导入函数
 */

import { debounce } from '../../../src/toolBox/base/useEcma/forFunctions/forDebounce.js';
import { rgba数组转字符串, rgb数组转字符串 } from '../../utils/color/convert.js';
import { 获取素材属性值, 计算素材类型角标 } from '../../data/attributies/parseAttributies.js';
import { 格式化文件大小 as 格式化大小 } from '../../../src/toolBox/base/useEcma/forFile/forFileSize.js';
import { readFileInChunks } from '../../../src/toolBox/base/useEcma/forFile/forFileRead.js';
import { toArray } from '../../../src/toolBox/base/useEcma/forObjectManagement/forArray.js';
import { 空图片base64 } from '../../../src/toolBox/base/forMime/forImage.js';
import { 计算标签文件数量 } from '../../../src/toolBox/feature/forAssets/forTags.js';

const 函数工具 = { debounce }
const 色彩工具 = {rgba数组转字符串,rgb数组转字符串}
const 素材条目管理工具 ={
    获取素材属性值,
    计算素材类型角标
}

// 格式化文件大小函数兼容层
const 格式化文件大小 = (bytes) => {
    return 格式化大小(bytes, 1, '未知大小');
};

const 文件系统工具={
    格式化文件大小,
    readFileInChunks    
}

const 图片工具 = {
     空图片base64
}

// 导出函数兼容层
const getAssetNames = (asset) => {
    return asset?.name || '';
}

// 重新导出所有工具，保持API兼容性
export {
    函数工具,
    色彩工具,
    素材条目管理工具,
    文件系统工具,
    图片工具,
    getAssetNames,
    toArray,
    计算标签文件数量
}

