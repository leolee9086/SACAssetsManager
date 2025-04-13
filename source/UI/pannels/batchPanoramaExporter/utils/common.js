/**
 * 批量全景导出组件 - 公共工具函数
 */

/**
 * 防抖函数
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 等待时间
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 获取任务状态文本
 * @param {Object} task - 任务对象
 * @returns {string} 状态文本
 */
export function getTaskStatusText(task) {
  switch (task.status) {
    case 'pending':
      return '等待中';
    case 'processing':
      if (task.stage) {
        return `${task.stage}...`;
      }
      return '处理中...';
    case 'completed':
      return '已完成';
    case 'error':
      return `错误: ${task.error || '未知错误'}`;
    default:
      return '未知状态';
  }
}

/**
 * 获取预览容器样式，确保宽高比正确
 * @param {Object} profile - 配置信息
 * @returns {Object} CSS样式对象
 */
export function getPreviewContainerStyle(profile) {
  const aspectRatio = profile.isLandscape ? 16/9 : 9/16;
  const width = profile.isLandscape ? '100%' : `${9/16 * 100}%`;
  const height = profile.isLandscape ? 'auto' : '240px';
  
  return {
    width,
    height,
    aspectRatio: `${aspectRatio}`,
    margin: '0 auto'
  };
}

/**
 * 获取默认的设置配置
 * @returns {Object} 默认配置
 */
export function getDefaultProfile() {
  return {
    resolution: '1080p',  // 1080p, 2k, 4k
    fps: 30,              // 30, 60, 120
    duration: 12,         // 12, 24, 30, 40
    isLandscape: true,    // 横屏与竖屏
    rotations: 1,         // 旋转圈数
    smoothness: 0.8,      // 平滑程度 0-1
    watermarkExpanded: true,  // 水印设置是否展开
    watermark: {
      text: {
        enabled: false, // 是否启用文字水印
        text: '全景视频',  // 水印文字
        position: 'bottomRight', // 水印位置: topLeft, topRight, bottomLeft, bottomRight, center
        fontFamily: 'Arial', // 字体
        fontSize: 1.0, // 大小: 0.5-2.0，1.0为标准大小
        colorHex: '#ffffff', // 颜色十六进制值
        opacity: 0.8, // 透明度 0-1
        color: 'rgba(255, 255, 255, 0.8)' // 最终色值（包含透明度）
      },
      image: {
        enabled: false, // 是否启用图片水印
        file: null, // 图片文件
        preview: null, // 图片预览
        position: 'bottomLeft', // 水印位置
        size: 0.15, // 大小（占视频宽度的百分比）
        opacity: 0.8 // 透明度 0-1
      }
    },
    audio: {
      enabled: false,         // 是否启用背景音乐
      file: null,             // 音频文件对象
      filePath: null,         // 音频文件路径
      fileName: null,         // 音频文件名
      preview: null,          // 音频预览URL
      adaptMode: 'fitVideo',  // 适配模式: 'fitVideo'(适配视频时长) 或 'fitAudio'(适配音频时长)
      rotationsForAudio: 2,   // 适配音频时长时的旋转圈数
      volume: 0.8             // 音量 0-1
    },
    previewImage: null, // 预览图像
    previewError: null // 预览错误信息
  };
} 