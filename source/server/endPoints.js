//这个文件是在前端调用的,注意这一点
import { plugin } from '../asyncModules.js'
import { imageExtensions } from '../server/processors/thumbnail/utils/lists.js'
import { 获取文档图标 } from '../utils/siyuanData/icon.js'
import { 
  创建端点系统
} from '../../src/toolBox/base/forNetwork/forEndPoints/useEndPointsBuilder.js'

// 临时变量，稍后会被正式定义
let serverHost, rawImageServerHost;

// 创建端点系统
const 端点系统 = 创建端点系统({
  http端口号: plugin.http服务端口号,
  图片扩展名列表: imageExtensions
});

// 提取端点
serverHost = 端点系统.服务器主机;
rawImageServerHost = 端点系统.原始图片服务器主机;

// 创建自定义缩略图主机函数
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

// 定制缩略图主机
端点系统.thumbnail.genHref = thumbnailHost;

// 自定义上传函数
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

// 设置上传函数
端点系统.thumbnail.upload = upload;

// 导出与原来API兼容的端点
export { serverHost, rawImageServerHost };
export const fs = 端点系统.fs;
export const metadata = 端点系统.metadata;
export const thumbnail = 端点系统.thumbnail;
export const metaRecords = 端点系统.metaRecords;
export const uploadThumbnail = 端点系统.上传缩略图;
