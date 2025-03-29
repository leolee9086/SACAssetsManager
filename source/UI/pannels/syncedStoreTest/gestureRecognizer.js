/**
 * 手势识别器模块
 * 用于识别和处理触摸手势，如滑动和捏合
 */

/**
 * 创建手势识别器
 * @param {Object} options - 配置选项
 * @returns {Object} 手势识别器API
 */
export const createGestureRecognizer = (options = {}) => {
  const {
    container = null,             // 容器元素
    dispatch = () => {},          // 事件派发函数
    throttle = (fn) => fn,        // 节流函数
    touchEnabled = true,          // 是否启用触摸
    preventDefault = true,        // 是否阻止默认行为
    passiveEvents = true,         // 是否使用被动事件
    swipeThreshold = 50,          // 滑动阈值(像素)
    swipeTimeLimit = 300,         // 滑动时间限制(毫秒)
    pinchThreshold = 0.05,        // 捏合阈值(比例变化)
  } = options;
  
  // 手势状态
  let startX = 0, startY = 0;
  let lastDistance = 0;
  let startTime = 0;
  let isGestureActive = false;
  let touchPoints = [];
  
  // 绑定的事件处理器列表，用于清理
  const boundHandlers = new Map();
  
  /**
   * 处理滑动手势
   * @param {string} direction - 滑动方向
   * @param {number} distance - 滑动距离
   * @param {number} duration - 滑动持续时间
   */
  const handleSwipe = (direction, distance, duration) => {
    dispatch('swipe', null, {
      direction,
      distance,
      duration,
      velocity: distance / duration
    });
  };
  
  /**
   * 处理捏合手势
   * @param {number} scale - 缩放比例
   * @param {Object} center - 中心点坐标
   */
  const handlePinch = (scale, center) => {
    dispatch('pinch', null, {
      scale,
      center,
      isZoomIn: scale > 1.0
    });
  };
  
  /**
   * 计算两点间距离
   * @param {number} x1 - 第一点X坐标
   * @param {number} y1 - 第一点Y坐标
   * @param {number} x2 - 第二点X坐标
   * @param {number} y2 - 第二点Y坐标
   * @returns {number} 距离
   */
  const getDistance = (x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  /**
   * 触摸开始处理
   * @param {TouchEvent} e - 触摸事件
   */
  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    
    isGestureActive = true;
    startTime = Date.now();
    
    const rect = container.getBoundingClientRect();
    
    touchPoints = Array.from(e.touches).map(touch => ({
      id: touch.identifier,
      startX: touch.clientX - rect.left,
      startY: touch.clientY - rect.top,
      currentX: touch.clientX - rect.left,
      currentY: touch.clientY - rect.top,
      time: startTime
    }));
    
    if (e.touches.length === 1) {
      startX = touchPoints[0].startX;
      startY = touchPoints[0].startY;
    } else if (e.touches.length === 2) {
      lastDistance = getDistance(
        touchPoints[0].startX, touchPoints[0].startY,
        touchPoints[1].startX, touchPoints[1].startY
      );
    }
    
    dispatch('gesturestart', e, {
      touchPoints,
      isMultiTouch: e.touches.length > 1
    });
  };
  
  /**
   * 触摸移动处理
   * @param {TouchEvent} e - 触摸事件
   */
  const handleTouchMove = (e) => {
    if (!isGestureActive || !e.touches || e.touches.length === 0) return;
    
    const rect = container.getBoundingClientRect();
    
    Array.from(e.touches).forEach(touch => {
      const point = touchPoints.find(p => p.id === touch.identifier);
      if (point) {
        point.currentX = touch.clientX - rect.left;
        point.currentY = touch.clientY - rect.top;
        point.time = Date.now();
      }
    });
    
    if (e.touches.length === 1 && touchPoints.length === 1) {
      const deltaX = touchPoints[0].currentX - startX;
      const deltaY = touchPoints[0].currentY - startY;
      
      dispatch('gesturemove', e, {
        deltaX,
        deltaY,
        distance: Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      });
    } else if (e.touches.length === 2 && touchPoints.length >= 2) {
      const currentDistance = getDistance(
        touchPoints[0].currentX, touchPoints[0].currentY,
        touchPoints[1].currentX, touchPoints[1].currentY
      );
      
      const scale = currentDistance / lastDistance;
      const centerX = (touchPoints[0].currentX + touchPoints[1].currentX) / 2;
      const centerY = (touchPoints[0].currentY + touchPoints[1].currentY) / 2;
      
      if (Math.abs(scale - 1.0) > pinchThreshold) {
        handlePinch(scale, { x: centerX, y: centerY });
        lastDistance = currentDistance;
      }
    }
  };
  
  /**
   * 触摸结束处理
   * @param {TouchEvent} e - 触摸事件
   */
  const handleTouchEnd = (e) => {
    if (!isGestureActive) return;
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (touchPoints.length === 1) {
      const point = touchPoints[0];
      const deltaX = point.currentX - point.startX;
      const deltaY = point.currentY - point.startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance >= swipeThreshold && duration <= swipeTimeLimit) {
        let direction;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          direction = deltaX > 0 ? 'right' : 'left';
        } else {
          direction = deltaY > 0 ? 'down' : 'up';
        }
        
        handleSwipe(direction, distance, duration);
      }
    }
    
    isGestureActive = false;
    touchPoints = [];
    
    dispatch('gestureend', e, { duration });
  };
  
  /**
   * 初始化手势识别器
   */
  const init = () => {
    if (!touchEnabled || !container) return;
    
    const touchStartOptions = passiveEvents ? { passive: true } : {};
    const touchMoveOptions = passiveEvents ? { passive: !preventDefault } : {};
    
    container.addEventListener('touchstart', handleTouchStart, touchStartOptions);
    container.addEventListener('touchmove', throttle(handleTouchMove), touchMoveOptions);
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);
    
    boundHandlers.set('touchstart', {
      element: container,
      type: 'touchstart',
      handler: handleTouchStart,
      options: touchStartOptions
    });
    
    boundHandlers.set('touchmove', {
      element: container,
      type: 'touchmove',
      handler: handleTouchMove,
      options: touchMoveOptions
    });
    
    boundHandlers.set('touchend', {
      element: container,
      type: 'touchend',
      handler: handleTouchEnd,
      options: {}
    });
    
    boundHandlers.set('touchcancel', {
      element: container,
      type: 'touchcancel',
      handler: handleTouchEnd,
      options: {}
    });
  };
  
  /**
   * 清理手势识别器
   */
  const cleanup = () => {
    boundHandlers.forEach(({ element, type, handler, options }) => {
      if (element && typeof element.removeEventListener === 'function') {
        element.removeEventListener(type, handler, options);
      }
    });
    
    boundHandlers.clear();
  };
  
  return {
    init,
    cleanup,
    boundHandlers
  };
}; 