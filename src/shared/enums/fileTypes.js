/**
 * 文件类型枚举
 * 定义系统中使用的文件类型，用于文件类型识别和处理
 */

/**
 * 资源文件类型枚举
 * @type {Object}
 */
export const 资源类型 = Object.freeze({
  /** 图片文件 */
  图片: {
    id: 'image',
    扩展名: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif', 'avif'],
    MIME类型: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/x-icon', 'image/tiff', 'image/avif'],
    图标: 'iconImage',
    描述: '图片文件'
  },
  
  /** 音频文件 */
  音频: {
    id: 'audio',
    扩展名: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma', 'opus'],
    MIME类型: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/mp4', 'audio/aac', 'audio/x-ms-wma', 'audio/opus'],
    图标: 'iconRecord',
    描述: '音频文件'
  },
  
  /** 视频文件 */
  视频: {
    id: 'video',
    扩展名: ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'mpeg', 'mpg', '3gp'],
    MIME类型: ['video/mp4', 'video/webm', 'video/x-msvideo', 'video/quicktime', 'video/x-matroska', 'video/x-flv', 'video/x-ms-wmv', 'video/mpeg', 'video/3gpp'],
    图标: 'iconVideo',
    描述: '视频文件'
  },
  
  /** 文档文件 */
  文档: {
    id: 'document',
    扩展名: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods', 'odp'],
    MIME类型: [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'application/rtf',
      'application/vnd.oasis.opendocument.text',
      'application/vnd.oasis.opendocument.spreadsheet',
      'application/vnd.oasis.opendocument.presentation'
    ],
    图标: 'iconFile',
    描述: '文档文件'
  },
  
  /** 压缩文件 */
  压缩文件: {
    id: 'archive',
    扩展名: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'efu'],
    MIME类型: [
      'application/zip', 
      'application/x-rar-compressed', 
      'application/x-7z-compressed',
      'application/x-tar',
      'application/gzip',
      'application/x-bzip2',
      'application/x-xz',
      'application/x-efu'
    ],
    图标: 'iconFolder',
    描述: '压缩文件'
  },
  
  /** 字体文件 */
  字体: {
    id: 'font',
    扩展名: ['ttf', 'otf', 'woff', 'woff2', 'eot'],
    MIME类型: [
      'font/ttf', 
      'font/otf', 
      'font/woff', 
      'font/woff2',
      'application/vnd.ms-fontobject'
    ],
    图标: 'iconFont',
    描述: '字体文件'
  },
  
  /** 源代码文件 */
  源代码: {
    id: 'code',
    扩展名: ['js', 'ts', 'html', 'css', 'json', 'xml', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'php', 'rb', 'rs', 'swift'],
    MIME类型: [
      'text/javascript',
      'application/typescript',
      'text/html',
      'text/css',
      'application/json',
      'application/xml',
      'text/x-python',
      'text/x-java',
      'text/x-c',
      'text/x-c++',
      'text/x-csharp',
      'text/x-go',
      'text/x-php',
      'text/x-ruby',
      'text/x-rust',
      'text/x-swift'
    ],
    图标: 'iconCode',
    描述: '源代码文件'
  },
  
  /** 其他文件 */
  其他: {
    id: 'other',
    扩展名: [],
    MIME类型: [],
    图标: 'iconFile',
    描述: '其他文件'
  }
});

/**
 * 通过文件扩展名获取资源类型
 * @param {string} 扩展名 - 文件扩展名(不含点号)
 * @returns {Object} 对应的资源类型对象
 */
export function 通过扩展名获取资源类型(扩展名) {
  if (!扩展名) return 资源类型.其他;
  
  // 将扩展名转为小写进行比较
  const 小写扩展名 = 扩展名.toLowerCase();
  
  // 遍历所有资源类型
  for (const 类型 of Object.values(资源类型)) {
    if (类型.扩展名.includes(小写扩展名)) {
      return 类型;
    }
  }
  
  // 未找到匹配类型，返回其他类型
  return 资源类型.其他;
}

/**
 * 通过MIME类型获取资源类型
 * @param {string} MIME类型 - 文件的MIME类型
 * @returns {Object} 对应的资源类型对象
 */
export function 通过MIME类型获取资源类型(MIME类型) {
  if (!MIME类型) return 资源类型.其他;
  
  // 将MIME类型转为小写进行比较
  const 小写MIME类型 = MIME类型.toLowerCase();
  
  // 遍历所有资源类型
  for (const 类型 of Object.values(资源类型)) {
    if (类型.MIME类型.includes(小写MIME类型)) {
      return 类型;
    }
  }
  
  // 未找到匹配类型，返回其他类型
  return 资源类型.其他;
}

/**
 * 判断文件是否为特定类型
 * @param {string} 文件名 - 文件名或路径
 * @param {string} 类型ID - 类型ID，如'image'、'audio'等
 * @returns {boolean} 是否为指定类型
 */
export function 是否为特定类型(文件名, 类型ID) {
  if (!文件名 || !类型ID) return false;
  
  // 获取文件扩展名
  const 点号位置 = 文件名.lastIndexOf('.');
  if (点号位置 === -1) return false;
  
  const 扩展名 = 文件名.slice(点号位置 + 1).toLowerCase();
  const 资源类型对象 = 通过扩展名获取资源类型(扩展名);
  
  return 资源类型对象.id === 类型ID;
} 