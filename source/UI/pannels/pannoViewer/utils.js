import * as THREE from '../../../../static/three/three.mjs';

/**
 * 将3D世界坐标转换为屏幕坐标
 * @param {number} lon - 经度
 * @param {number} lat - 纬度
 * @param {THREE.Camera} camera - Three.js相机实例
 * @param {HTMLElement} container - 容器元素
 * @returns {{x: number, y: number, visible: boolean}} 屏幕坐标和可见性
 */
export const worldToScreen = (lon, lat, camera, container) => {
  if (!camera || !container) return { x: 0, y: 0, visible: false };
  
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon);
  
  const x = 500 * Math.sin(phi) * Math.cos(theta);
  const y = 500 * Math.cos(phi);
  const z = 500 * Math.sin(phi) * Math.sin(theta);
  
  const vector = new THREE.Vector3(x, y, z);
  vector.project(camera);
  
  const rect = container.getBoundingClientRect();
  const screenX = (vector.x + 1) * rect.width / 2;
  const screenY = (-vector.y + 1) * rect.height / 2;
  
  const visible = vector.z < 1;
  
  return { x: screenX, y: screenY, visible };
};

/**
 * 创建平滑动画
 * @param {Object} params - 动画参数
 * @param {number} params.duration - 动画持续时间（毫秒）
 * @param {Object} params.from - 起始值对象
 * @param {Object} params.to - 目标值对象
 * @param {Function} params.onUpdate - 更新回调
 * @param {Function} [params.onComplete] - 完成回调
 * @returns {number} 动画ID
 */
export const createSmoothAnimation = ({ duration, from, to, onUpdate, onComplete }) => {
  const startTime = performance.now();
  
  const animate = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // 使用缓动函数使动画更平滑
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    
    // 计算当前值
    const current = {};
    Object.keys(from).forEach(key => {
      current[key] = from[key] + (to[key] - from[key]) * easeProgress;
    });
    
    onUpdate(current);
    
    if (progress < 1) {
      return requestAnimationFrame(animate);
    } else if (onComplete) {
      onComplete();
    }
  };
  
  return requestAnimationFrame(animate);
};

/**
 * 全屏相关工具函数
 */
export const fullscreenUtils = {
  enter: async (element) => {
    if (element.requestFullscreen) {
      await element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      await element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      await element.msRequestFullscreen();
    }
  },
  
  exit: async () => {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      await document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      await document.msExitFullscreen();
    }
  },
  
  isFullscreen: () => !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement
  )
}; 