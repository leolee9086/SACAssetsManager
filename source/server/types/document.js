/**
 * 文档处理相关的类型定义
 */

/**
 * PDF文档信息
 * @typedef {Object} PdfInfo
 * @property {string} title - PDF文档标题
 * @property {string} author - PDF文档作者
 * @property {string} creator - PDF文档创建工具
 * @property {string} creationDate - 创建日期
 * @property {string} modificationDate - 修改日期
 * @property {number} pageCount - 总页数
 * @property {boolean} isEncrypted - 是否加密
 * @property {number} fileSize - 文件大小(字节)
 */

/**
 * PDF页面信息
 * @typedef {Object} PdfPageInfo
 * @property {number} width - 页面宽度
 * @property {number} height - 页面高度
 * @property {number} pageNumber - 页码
 * @property {string} content - 页面内容文本
 */

/**
 * PDF文本提取结果
 * @typedef {Object} PdfTextResult
 * @property {string} filePath - PDF文件路径
 * @property {string} text - 提取的文本内容
 * @property {number} pageCount - PDF总页数
 * @property {number} characterCount - 文本字符数量
 */

/**
 * Office文档元数据
 * @typedef {Object} OfficeMetadata
 * @property {string} author - 文档作者
 * @property {string} title - 文档标题
 * @property {string} createdDate - 创建日期
 * @property {string} lastModified - 最后修改日期
 * @property {number} [pageCount] - Word文档页数
 * @property {number} [wordCount] - Word文档字数
 * @property {number} [sheetCount] - Excel工作表数量
 * @property {number} [cellCount] - Excel单元格数量
 * @property {number} [slideCount] - PowerPoint幻灯片数量
 */

/**
 * Office文本提取结果
 * @typedef {Object} OfficeTextResult
 * @property {string} filePath - Office文档文件路径
 * @property {string} text - 提取的文本内容
 * @property {OfficeMetadata} metadata - 文档元数据
 * @property {string} format - 文档格式(doc/docx/xls/xlsx/ppt/pptx)
 */

/**
 * PDF预览结果
 * @typedef {Object} PdfPreviewResult
 * @property {string} filePath - PDF文件路径
 * @property {number} page - 预览的页码
 * @property {string} previewPath - 预览图片路径
 * @property {number} width - 预览宽度
 */

/**
 * 临时文件清理结果
 * @typedef {Object} CleanupResult
 * @property {number} cleanedCount - 清理的文件数量
 * @property {string} tempDir - 临时目录路径
 */

/**
 * 文档处理配置
 * @typedef {Object} DocumentConfig
 * @property {string} tempDir - 临时文件目录
 * @property {number} cacheSize - 缓存大小
 * @property {string} previewQuality - 预览质量(low/medium/high)
 */

export {}; 