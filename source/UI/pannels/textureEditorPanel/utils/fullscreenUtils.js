/**
 * 全屏相关工具函数
 */

/**
 * 切换元素的全屏状态
 * @param {HTMLElement} element - 要全屏显示的DOM元素
 * @returns {Promise<boolean>} - 是否成功切换全屏状态
 */
export const toggleFullscreen = async (element) => {
  try {
    const isCurrentlyFullscreen = isInFullscreenMode();
    
    if (!isCurrentlyFullscreen) {
      // 进入全屏
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      }
    } else {
      // 退出全屏
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen();
      }
    }
    
    return true;
  } catch (error) {
    console.error('全屏切换失败:', error);
    return false;
  }
};

/**
 * 检查当前是否处于全屏状态
 * @returns {boolean} - 是否处于全屏状态
 */
export const isInFullscreenMode = () => {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement
  );
};

/**
 * 添加全屏状态变化的事件监听
 * @param {Function} callback - 全屏状态变化时的回调函数
 */
export const addFullscreenChangeListener = (callback) => {
  document.addEventListener('fullscreenchange', callback);
  document.addEventListener('webkitfullscreenchange', callback);
  document.addEventListener('msfullscreenchange', callback);
};

/**
 * 移除全屏状态变化的事件监听
 * @param {Function} callback - 要移除的回调函数
 */
export const removeFullscreenChangeListener = (callback) => {
  document.removeEventListener('fullscreenchange', callback);
  document.removeEventListener('webkitfullscreenchange', callback);
  document.removeEventListener('msfullscreenchange', callback);
}; 