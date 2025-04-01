/**
 * API路由定义
 * 统一管理服务器提供的API端点
 */

import { plugin } from '../../asyncModules.js'
import { imageExtensions } from '../processors/thumbnail/utils/lists.js'
import { 获取文档图标 } from '../../utils/siyuanData/icon.js'
import { 
  创建端点系统
} from '../../../src/toolBox/base/forNetwork/forEndPoints/useEndPointsBuilder.js'

// 创建端点系统
const 端点系统 = 创建端点系统({
  http端口号: plugin.http服务端口号,
  图片扩展名列表: imageExtensions
});

// 提取服务器主机和原始图片服务器主机
export const serverHost = 端点系统.服务器主机;
export const rawImageServerHost = 端点系统.原始图片服务器主机;

/**
 * 缩略图URL生成函数
 * 根据类型、路径和大小生成缩略图URL
 */
const thumbnailHost = (type, path, size, data) => {
  if (type === 'note') {
    let meta = data.$meta
    return 获取文档图标(meta)
  }
  
  let src = !type 
    ? `${rawImageServerHost()}/thumbnail/?path=${encodeURIComponent(path)}&size=${size}` 
    : `${rawImageServerHost()}/thumbnail/?localPath=${encodeURIComponent(path)}&size=${size}`
    
  let rawSrc = !type 
    ? `${rawImageServerHost()}/raw/?path=${encodeURIComponent(path)}` 
    : `${rawImageServerHost()}/raw/?localPath=${encodeURIComponent(path)}`
    
  if (size > 200 && imageExtensions.includes(path.split('.').pop())) {
    return rawSrc
  } else {
    return src
  }
}

// 设置缩略图URL生成函数
端点系统.thumbnail.genHref = thumbnailHost;

/**
 * 上传URL生成函数
 */
const upload = (type, path) => {
  let baseUrl = `${serverHost()}/thumbnail/upload`;
  let params = new URLSearchParams();

  if (!type) {
    params.append('path', path);
  } else {
    params.append('localPath', path);
  }

  return `${baseUrl}?${params.toString()}`;
}

// 设置上传URL生成函数
端点系统.thumbnail.upload = upload;

// 导出API端点
export const fs = 端点系统.fs;
export const metadata = 端点系统.metadata;
export const thumbnail = 端点系统.thumbnail;
export const metaRecords = 端点系统.metaRecords;
export const uploadThumbnail = 端点系统.上传缩略图; 