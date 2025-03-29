/**
 * MIME类型工具
 * 
 * 提供轻量级MIME类型检测、分类和识别功能
 * 不依赖于完整的MIME数据库，仅包含最常用的类型
 */

/**
 * 常见MIME类型映射
 */
const 常用MIME类型 = {
    // 文本
    'text/plain': { 扩展名: ['txt'], 图标: '📄', 分类: '文本' },
    'text/html': { 扩展名: ['html', 'htm'], 图标: '📄', 分类: '文本' },
    'text/css': { 扩展名: ['css'], 图标: '📄', 分类: '文本' },
    'text/javascript': { 扩展名: ['js'], 图标: '📄', 分类: '文本' },
    'text/markdown': { 扩展名: ['md', 'markdown'], 图标: '📝', 分类: '文本' },
    'text/csv': { 扩展名: ['csv'], 图标: '📊', 分类: '文本' },
    'text/xml': { 扩展名: ['xml'], 图标: '📄', 分类: '文本' },
    
    // 图片
    'image/jpeg': { 扩展名: ['jpg', 'jpeg'], 图标: '🖼️', 分类: '图片' },
    'image/png': { 扩展名: ['png'], 图标: '🖼️', 分类: '图片' },
    'image/gif': { 扩展名: ['gif'], 图标: '🖼️', 分类: '图片' },
    'image/svg+xml': { 扩展名: ['svg'], 图标: '🖼️', 分类: '图片' },
    'image/webp': { 扩展名: ['webp'], 图标: '🖼️', 分类: '图片' },
    'image/bmp': { 扩展名: ['bmp'], 图标: '🖼️', 分类: '图片' },
    'image/tiff': { 扩展名: ['tif', 'tiff'], 图标: '🖼️', 分类: '图片' },
    
    // 音频
    'audio/mp3': { 扩展名: ['mp3'], 图标: '🎵', 分类: '音频' },
    'audio/wav': { 扩展名: ['wav'], 图标: '🎵', 分类: '音频' },
    'audio/ogg': { 扩展名: ['ogg'], 图标: '🎵', 分类: '音频' },
    'audio/mpeg': { 扩展名: ['mp3', 'mpeg'], 图标: '🎵', 分类: '音频' },
    'audio/webm': { 扩展名: ['weba'], 图标: '🎵', 分类: '音频' },
    'audio/aac': { 扩展名: ['aac'], 图标: '🎵', 分类: '音频' },
    
    // 视频
    'video/mp4': { 扩展名: ['mp4'], 图标: '🎥', 分类: '视频' },
    'video/webm': { 扩展名: ['webm'], 图标: '🎥', 分类: '视频' },
    'video/ogg': { 扩展名: ['ogv'], 图标: '🎥', 分类: '视频' },
    'video/quicktime': { 扩展名: ['mov'], 图标: '🎥', 分类: '视频' },
    'video/x-msvideo': { 扩展名: ['avi'], 图标: '🎥', 分类: '视频' },
    
    // 应用程序
    'application/json': { 扩展名: ['json'], 图标: '📄', 分类: '文本' },
    'application/pdf': { 扩展名: ['pdf'], 图标: '📑', 分类: '文档' },
    'application/zip': { 扩展名: ['zip'], 图标: '📦', 分类: '压缩包' },
    'application/vnd.rar': { 扩展名: ['rar'], 图标: '📦', 分类: '压缩包' },
    'application/x-7z-compressed': { 扩展名: ['7z'], 图标: '📦', 分类: '压缩包' },
    'application/vnd.ms-excel': { 扩展名: ['xls'], 图标: '📊', 分类: '文档' },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { 扩展名: ['xlsx'], 图标: '📊', 分类: '文档' },
    'application/msword': { 扩展名: ['doc'], 图标: '📝', 分类: '文档' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { 扩展名: ['docx'], 图标: '📝', 分类: '文档' }
};

/**
 * 常见文件头特征
 */
const 文件头特征 = [
    { 特征: [0xFF, 0xD8, 0xFF], mime类型: 'image/jpeg' },
    { 特征: [0x89, 0x50, 0x4E, 0x47], mime类型: 'image/png' },
    { 特征: [0x47, 0x49, 0x46, 0x38], mime类型: 'image/gif' },
    { 特征: [0x25, 0x50, 0x44, 0x46], mime类型: 'application/pdf' },
    { 特征: [0x50, 0x4B, 0x03, 0x04], mime类型: 'application/zip' },
    { 特征: [0x52, 0x61, 0x72, 0x21], mime类型: 'application/vnd.rar' },
    { 特征: [0x1F, 0x8B], mime类型: 'application/gzip' },
    { 特征: [0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D], mime类型: 'video/mp4' },
    { 特征: [0x49, 0x44, 0x33], mime类型: 'audio/mpeg' },
    { 特征: [0x42, 0x4D], mime类型: 'image/bmp' }
];

/**
 * 根据扩展名获取MIME类型
 * @param {string} 扩展名 - 文件扩展名（可以带点号或不带）
 * @returns {string|null} MIME类型或null（如果找不到）
 */
export const 根据扩展名获取Mime类型 = (扩展名) => {
    if (!扩展名) return null;
    
    // 处理扩展名，去掉前面的点号并转为小写
    扩展名 = 扩展名.toLowerCase().replace(/^\./, '');
    
    // 查找匹配的MIME类型
    for (const mime类型 in 常用MIME类型) {
        const info = 常用MIME类型[mime类型];
        if (info.扩展名.includes(扩展名)) {
            return mime类型;
        }
    }
    
    return null;
};

/**
 * 根据完整文件名获取MIME类型
 * @param {string} 文件名 - 完整的文件名
 * @returns {string|null} MIME类型或null（如果找不到）
 */
export const 根据文件名获取Mime类型 = (文件名) => {
    if (!文件名 || !文件名.includes('.')) return null;
    
    const 扩展名 = 文件名.split('.').pop();
    return 根据扩展名获取Mime类型(扩展名);
};

/**
 * 根据MIME类型获取扩展名列表
 * @param {string} mime类型 - MIME类型
 * @returns {string[]} 扩展名数组
 */
export const 根据Mime类型获取扩展名列表 = (mime类型) => {
    if (!mime类型) return [];
    
    return 常用MIME类型[mime类型]?.扩展名 || [];
};

/**
 * 检查是否为特定MIME类别
 * @param {string} mime类型 - MIME类型
 * @param {string} 类别 - 检查的类别(text/image/audio/video等)
 * @returns {boolean} 
 */
export const 是否为类别 = (mime类型, 类别) => {
    if (!mime类型) return false;
    return mime类型.startsWith(`${类别}/`);
};

/**
 * 检查是否为文本类型
 * @param {string} mime类型 - MIME类型
 * @returns {boolean}
 */
export const 是否文本类型 = (mime类型) => 是否为类别(mime类型, 'text') || mime类型 === 'application/json';

/**
 * 检查是否为图片类型
 * @param {string} mime类型 - MIME类型
 * @returns {boolean}
 */
export const 是否图片类型 = (mime类型) => 是否为类别(mime类型, 'image');

/**
 * 检查是否为音频类型
 * @param {string} mime类型 - MIME类型
 * @returns {boolean}
 */
export const 是否音频类型 = (mime类型) => 是否为类别(mime类型, 'audio');

/**
 * 检查是否为视频类型
 * @param {string} mime类型 - MIME类型
 * @returns {boolean}
 */
export const 是否视频类型 = (mime类型) => 是否为类别(mime类型, 'video');

/**
 * 根据文件内容检测MIME类型
 * @param {ArrayBuffer|Uint8Array} 文件数据 - 文件的二进制数据
 * @returns {string|null} 检测到的MIME类型
 */
export const 检测文件类型 = (文件数据) => {
    if (!文件数据) return null;
    
    // 转换为Uint8Array以便统一处理
    const 数据 = 文件数据 instanceof ArrayBuffer ? new Uint8Array(文件数据) : 文件数据;
    
    // 对比文件头特征
    for (const { 特征, mime类型 } of 文件头特征) {
        let 匹配 = true;
        for (let i = 0; i < 特征.length; i++) {
            if (数据[i] !== 特征[i]) {
                匹配 = false;
                break;
            }
        }
        if (匹配) return mime类型;
    }
    
    // 检测是否为文本文件（简单判断，不是100%准确）
    const 是否可能为文本 = !数据.some(字节 => (字节 < 9 && 字节 !== 0) || (字节 > 126 && 字节 < 160));
    if (是否可能为文本) return 'text/plain';
    
    return null;
};

/**
 * 获取文件分类
 * @param {string} mime类型 - MIME类型
 * @returns {string} 分类名称
 */
export const 获取文件分类 = (mime类型) => {
    if (!mime类型) return '未知';
    
    const info = 常用MIME类型[mime类型];
    if (info?.分类) return info.分类;
    
    if (是否文本类型(mime类型)) return '文本';
    if (是否图片类型(mime类型)) return '图片';
    if (是否音频类型(mime类型)) return '音频';
    if (是否视频类型(mime类型)) return '视频';
    
    return '其他';
};

/**
 * 获取文件图标
 * @param {string} mime类型 - MIME类型
 * @returns {string} 图标
 */
export const 获取文件图标 = (mime类型) => {
    if (!mime类型) return '❓';
    
    const info = 常用MIME类型[mime类型];
    if (info?.图标) return info.图标;
    
    const 图标映射 = {
        '文本': '📄',
        '图片': '🖼️',
        '音频': '🎵',
        '视频': '🎥',
        '文档': '📝',
        '压缩包': '📦',
        '其他': '📁',
        '未知': '❓'
    };
    
    return 图标映射[获取文件分类(mime类型)];
};

/**
 * 获取MIME类型的安全等级
 * @param {string} mime类型 - MIME类型
 * @returns {string} 安全等级
 */
export const 获取安全等级 = (mime类型) => {
    if (!mime类型) return '未知';
    
    // 危险的文件类型
    const 危险类型 = [
        'application/x-msdownload',
        'application/x-executable',
        'application/x-msi',
        'application/x-sh',
        'application/x-bat',
        'application/vnd.microsoft.portable-executable'
    ];
    
    // 警告的文件类型
    const 警告类型 = [
        'application/javascript',
        'application/x-javascript',
        'text/javascript',
        'application/json',
        'application/xml',
        'text/xml'
    ];
    
    if (危险类型.includes(mime类型)) return '危险';
    if (警告类型.includes(mime类型)) return '警告';
    
    // 根据主类型进行安全评估
    const 主类型 = mime类型.split('/')[0];
    
    switch (主类型) {
        case 'text':
            return '安全';
        case 'image':
        case 'audio':
        case 'video':
            return '安全';
        case 'application':
            return '需审查';
        default:
            return '未知';
    }
};

export default {
    根据扩展名获取Mime类型,
    根据文件名获取Mime类型,
    根据Mime类型获取扩展名列表,
    是否为类别,
    是否文本类型,
    是否图片类型,
    是否音频类型,
    是否视频类型,
    检测文件类型,
    获取文件分类,
    获取文件图标,
    获取安全等级
}; 