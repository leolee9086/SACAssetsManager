// source/fromTirdParty/anytext/urtConverter.js

import { createResource } from '../../utils/URT/builder.js';

/**
 * 将AnyTXT搜索结果转换为URT资源
 * @param {Object} anyTXTResult - AnyTXT搜索结果对象
 * @returns {URTResource}
 */
export function convertToURTResource(anyTXTResult) {
  return createResource({
    type: 'file',
    driver: 'local',
    name: anyTXTResult.name,
    path: anyTXTResult.path,
    meta: {
      id: anyTXTResult.id,
      created: anyTXTResult.ctimeMs ? new Date(anyTXTResult.ctimeMs).toISOString() : null,
      modified: new Date(anyTXTResult.mtimeMs).toISOString(),
      isDirectory: false,
      stats: {
        size: anyTXTResult.size,
      }
    },
    provenance: {
      source: 'anytxt',
      sourceId: anyTXTResult.fid,
      importedAt: new Date().toISOString(),
      importVersion: '1.0.0',
      originalData: anyTXTResult
    },
    extra: {
      size: anyTXTResult.size,
      ext: anyTXTResult.path.split('.').pop().toLowerCase(),
      mime: getMimeType(anyTXTResult.path),
      icon: getFileIcon(anyTXTResult.path)
    }
  });
}

/**
 * 批量转换AnyTXT搜索结果为URT资源
 * @param {Array} anyTXTResults - AnyTXT搜索结果数组
 * @returns {Array<URTResource>}
 */
export function batchConvertToURTResources(anyTXTResults) {
  return anyTXTResults.map(result => convertToURTResource(result));
}

/**
 * 根据文件路径获取MIME类型
 * @param {string} path 
 * @returns {string}
 */
function getMimeType(path) {
  const ext = path.split('.').pop().toLowerCase();
  const mimeTypes = {
    'txt': 'text/plain',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // 可以根据需要添加更多类型
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 根据文件路径获取图标
 * @param {string} path 
 * @returns {string}
 */
function getFileIcon(path) {
  const ext = path.split('.').pop().toLowerCase();
  const icons = {
    'txt': 'file-text',
    'pdf': 'file-pdf',
    'doc': 'file-word',
    'docx': 'file-word',
    // 可以根据需要添加更多类型
  };
  
  return icons[ext] || 'file';
}