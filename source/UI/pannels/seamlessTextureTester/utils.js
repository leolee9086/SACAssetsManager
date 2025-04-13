/**
 * 无缝贴图检测器工具函数
 */

/**
 * 格式化文件大小
 * @param {number} bytes - 文件大小（字节）
 * @returns {string} 格式化后的大小
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * 获取评分对应的颜色
 * @param {number} score - 评分（0-1）
 * @returns {string} 颜色代码
 */
export function getScoreColor(score) {
  if (score >= 0.85) return '#4caf50'; // 绿色
  if (score >= 0.7) return '#8bc34a';  // 浅绿
  if (score >= 0.5) return '#ffc107';  // 黄色
  return '#f44336';  // 红色
}

/**
 * 计算图像的主要尺寸类别
 * @param {Object} imageInfo - 图像信息对象
 * @returns {string} 尺寸类别描述
 */
export function getImageSizeCategory(imageInfo) {
  const { width, height } = imageInfo;
  
  // 检查是否是标准贴图尺寸
  const isPowerOfTwo = (n) => Math.log2(n) % 1 === 0;
  const isSquare = width === height;
  
  if (isSquare && isPowerOfTwo(width)) {
    return `标准贴图 ${width}×${height}`;
  }
  
  // 检查常见分辨率
  const commonResolutions = [
    { name: '高清 HD', w: 1280, h: 720 },
    { name: '全高清 FHD', w: 1920, h: 1080 },
    { name: '2K', w: 2560, h: 1440 },
    { name: '4K UHD', w: 3840, h: 2160 }
  ];
  
  for (const res of commonResolutions) {
    if (width === res.w && height === res.h) {
      return res.name;
    }
  }
  
  // 返回一般尺寸描述
  return `${width}×${height}`;
}

/**
 * 获取一组无缝贴图分析结果中的最佳和最差项
 * @param {Array} results - 分析结果数组
 * @returns {Object} 包含最佳和最差结果的对象
 */
export function getBestAndWorstResults(results) {
  if (!results || results.length === 0) {
    return { best: null, worst: null };
  }
  
  // 过滤有效结果
  const validResults = results.filter(r => r && typeof r.score === 'number');
  if (validResults.length === 0) {
    return { best: null, worst: null };
  }
  
  // 按分数排序
  const sortedResults = [...validResults].sort((a, b) => b.score - a.score);
  
  return {
    best: sortedResults[0],
    worst: sortedResults[sortedResults.length - 1]
  };
} 