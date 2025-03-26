/**
 * MIME类型用途表模块
 * 提供完整的MIME类型与用途映射表
 */

const MIME用途映射表 = {
  // 文本类型
  'text/html': ['网页显示', 'Web开发'],
  'text/css': ['样式表', 'Web开发'],
  'text/javascript': ['脚本代码', 'Web开发', '应用逻辑'],
  'text/plain': ['纯文本', '日志文件', '配置文件'],
  'text/markdown': ['文档编写', '内容创作'],
  'text/csv': ['数据表格', '数据导入导出'],
  'text/xml': ['数据交换', '配置文件'],
  
  // 应用类型
  'application/json': ['数据交换', 'API通信', '配置文件'],
  'application/xml': ['数据交换', '配置文件', 'API通信'],
  'application/pdf': ['文档查看', '电子出版', '打印'],
  'application/zip': ['文件压缩', '文件打包'],
  'application/x-httpd-php': ['PHP脚本', 'Web开发'],
  'application/x-sh': ['Shell脚本', '系统管理'],
  'application/x-tar': ['文件归档', '文件打包'],
  'application/gzip': ['文件压缩'],
  'application/java-archive': ['Java应用', '应用部署'],
  'application/x-msdownload': ['Windows程序', '软件安装'],
  'application/octet-stream': ['二进制数据', '通用文件'],
  
  // 图片类型
  'image/jpeg': ['照片', '网页图片', '图像存储'],
  'image/png': ['网页图片', '透明图像', '图像存储'],
  'image/svg+xml': ['矢量图形', '可缩放图像', 'Web图标'],
  'image/gif': ['动画图像', '网页图片'],
  'image/webp': ['高压缩图像', '网页图片'],
  'image/bmp': ['位图图像', '无压缩图像'],
  'image/tiff': ['高质量图像', '印刷图像'],
  
  // 音频类型
  'audio/mpeg': ['音乐播放', '音频存储'],
  'audio/wav': ['无损音频', '音频编辑'],
  'audio/ogg': ['开放格式音频', '网页音频'],
  'audio/webm': ['网页音频', '流媒体'],
  'audio/aac': ['高压缩音频', '数字音频'],
  'audio/flac': ['无损音频', '高品质音乐'],
  
  // 视频类型
  'video/mp4': ['视频播放', '视频存储'],
  'video/webm': ['网页视频', '流媒体'],
  'video/ogg': ['开放格式视频', '网页视频'],
  'video/x-msvideo': ['AVI视频', '视频存储'],
  'video/quicktime': ['QuickTime视频', '视频编辑'],
  
  // 字体类型
  'font/ttf': ['TrueType字体', '网页字体'],
  'font/woff': ['Web开放字体', '网页字体'],
  'font/woff2': ['Web开放字体2', '高压缩网页字体'],
  
  // 办公文档
  'application/vnd.ms-excel': ['电子表格', '数据分析'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['电子表格', '数据分析'],
  'application/msword': ['文档编辑', '文字处理'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['文档编辑', '文字处理'],
  'application/vnd.ms-powerpoint': ['演示文稿', '幻灯片'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['演示文稿', '幻灯片']
};

/**
 * 获取完整的MIME用途映射表
 * @returns {Object} MIME用途映射表
 */
export const getMimeUsageTable = () => {
  return MIME用途映射表;
};

/**
 * 获取所有支持的MIME类型列表
 * @returns {string[]} MIME类型列表
 */
export const getAllMimeTypes = () => {
  return Object.keys(MIME用途映射表);
};

export default {
  getMimeUsageTable,
  getAllMimeTypes
};