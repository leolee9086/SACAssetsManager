/**
 * @fileoverview AnyTXT 到 URT 的转换模块
 * @module toolBox/useAge/forAnytext/useAnytextURT
 */

import { createResource } from "../../../../src/utils/URT/builder.js";

/**
 * 将 AnyTXT 搜索结果转换为 URT 资源
 * @param {Object} anyTXTResult - AnyTXT 搜索结果对象
 * @returns {URTResource} URT 资源对象
 */
export const 转换为URT资源 = (anyTXTResult) => {
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
            mime: 获取MIME类型(anyTXTResult.path),
            icon: 获取文件图标(anyTXTResult.path)
        }
    });
};

/**
 * 批量转换 AnyTXT 搜索结果为 URT 资源
 * @param {Array} anyTXTResults - AnyTXT 搜索结果数组
 * @returns {Array<URTResource>} URT 资源数组
 */
export const 批量转换为URT资源 = (anyTXTResults) => {
    return anyTXTResults.map(result => 转换为URT资源(result));
};

/**
 * 根据文件路径获取 MIME 类型
 * @private
 * @param {string} path - 文件路径
 * @returns {string} MIME 类型
 */
function 获取MIME类型(path) {
    const ext = path.split('.').pop().toLowerCase();
    const mimeTypes = {
        'txt': 'text/plain',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed',
        '7z': 'application/x-7z-compressed'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 根据文件路径获取图标
 * @private
 * @param {string} path - 文件路径
 * @returns {string} 图标名称
 */
function 获取文件图标(path) {
    const ext = path.split('.').pop().toLowerCase();
    const icons = {
        'txt': 'file-text',
        'pdf': 'file-pdf',
        'doc': 'file-word',
        'docx': 'file-word',
        'xls': 'file-excel',
        'xlsx': 'file-excel',
        'ppt': 'file-powerpoint',
        'pptx': 'file-powerpoint',
        'jpg': 'file-image',
        'jpeg': 'file-image',
        'png': 'file-image',
        'gif': 'file-image',
        'svg': 'file-image',
        'zip': 'file-archive',
        'rar': 'file-archive',
        '7z': 'file-archive'
    };
    
    return icons[ext] || 'file';
}

// 导出英文版 API
export const convertToURTResource = 转换为URT资源;
export const batchConvertToURTResources = 批量转换为URT资源; 