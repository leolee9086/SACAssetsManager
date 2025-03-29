/**
 * 触摸事件处理模块
 * 用于管理富文本编辑器中的触摸交互
 */

/**
 * 创建触摸事件处理器
 * @param {Object} options - 配置项
 * @returns {Object} 触摸事件处理器API
 */
export const createTouchEventHandler = (options = {}) => {
  const {
    dispatch = () => {},              // 事件派发函数
    getContainer = () => null,        // 获取容器元素的函数
    preventDefault = true,            // 是否阻止默认行为
    throttle = (fn) => fn,            // 节流函数
    updateState = () => {},           // 更新状态函数
    enabled = true,                   // 是否启用触摸处理
    passiveEvents = true,             // 使用被动事件优化性能
    longPressThreshold = 500,         // 长按阈值(ms)
    tapDistanceThreshold = 10,        // 点击距离阈值(像素)
    doubleTapThreshold = 300,         // 双击时间阈值(ms)
    preventMouseEventsOnTouch = true  // 阻止触摸后的鼠标事件
  } = options;
  
  // 存储绑定的事件处理函数
  const boundHandlers = new Map();
  
  // 触摸状态
  let touchState = {
    isActive: false,                  // 是否有触摸活动
    isTapping: false,                 // 是否点击中
    isLongPress: false,               // 是否长按中
    isPinching: false,                // 是否双指捏合中
    isScrolling: false,               // 是否滚动中
    isTracking: false,                // 是否跟踪中
    startTime: 0,                     // 触摸开始时间
    lastTapTime: 0,                   // 上次点击时间
    lastTapPosition: { x: 0, y: 0 },  // 上次点击位置
    activePointers: [],               // 活动的触摸点数组
    startPointers: [],                // 开始时的触摸点数组
    currentPointers: [],              // 当前触摸点数组
    startDistance: 0,                 // 开始时的双指距离
    currentDistance: 0,               // 当前双指距离
    scale: 1,                         // 缩放比例
    startAngle: 0,                    // 开始时的角度
    currentAngle: 0,                  // 当前角度
    rotation: 0,                      // 旋转角度
    longPressTimer: null,             // 长按定时器
    tapCount: 0,                      // 点击计数
    lastEvent: null,                  // 最后触摸事件
    preventNextMouseEvent: false      // 是否阻止下一个鼠标事件
  };
  
  /**
   * 重置触摸状态
   */
  const resetTouchState = () => {
    // 清除长按定时器
    if (touchState.longPressTimer) {
      clearTimeout(touchState.longPressTimer);
    }
    
    // 保留部分历史信息
    const lastTapTime = touchState.lastTapTime;
    const lastTapPosition = { ...touchState.lastTapPosition };
    const tapCount = touchState.tapCount;
    
    touchState = {
      isActive: false,
      isTapping: false,
      isLongPress: false,
      isPinching: false,
      isScrolling: false,
      isTracking: false,
      startTime: 0,
      lastTapTime,
      lastTapPosition,
      activePointers: [],
      startPointers: [],
      currentPointers: [],
      startDistance: 0,
      currentDistance: 0,
      scale: 1,
      startAngle: 0,
      currentAngle: 0,
      rotation: 0,
      longPressTimer: null,
      tapCount,
      lastEvent: null,
      preventNextMouseEvent: touchState.preventNextMouseEvent
    };
    
    // 更新全局状态
    updateGlobalState();
  };
  
  /**
   * 更新全局状态
   */
  const updateGlobalState = () => {
    updateState({
      touchActive: touchState.isActive,
      lastMousePosition: touchState.currentPointers.length > 0 ? 
        { x: touchState.currentPointers[0].clientX, y: touchState.currentPointers[0].clientY } : 
        undefined
    });
  };
  
  /**
   * 处理触摸开始事件
   * @param {TouchEvent} e - 触摸事件
   */
  const handleTouchStart = (e) => {
    if (!enabled) return;
    
    // 阻止默认行为，防止点击时页面滚动和缩放
    if (preventDefault && !passiveEvents) {
      e.preventDefault();
    }
    
    // 记录触摸点
    const touches = Array.from(e.touches);
    touchState.lastEvent = e;
    touchState.isActive = true;
    touchState.startTime = Date.now();
    touchState.activePointers = touches;
    
    // 克隆触摸点信息以便后续计算
    touchState.startPointers = touches.map(touch => ({
      identifier: touch.identifier,
      clientX: touch.clientX,
      clientY: touch.clientY,
      screenX: touch.screenX,
      screenY: touch.screenY,
      pageX: touch.pageX,
      pageY: touch.pageY,
      target: touch.target
    }));
    
    touchState.currentPointers = [...touchState.startPointers];
    
    // 初始状态设置
    touchState.isTapping = true;
    touchState.isTracking = true;
    
    // 如果有多个触摸点，计算初始距离和角度
    if (touches.length > 1) {
      const { distance, angle } = calculateDistanceAndAngle(
        touchState.startPointers[0], 
        touchState.startPointers[1]
      );
      touchState.startDistance = distance;
      touchState.currentDistance = distance;
      touchState.startAngle = angle;
      touchState.currentAngle = angle;
    }
    
    // 设置长按检测定时器
    touchState.longPressTimer = setTimeout(() => {
      // 只有在触摸仍然活动并且没有移动太远的情况下才触发长按
      if (touchState.isActive && touchState.isTapping) {
        touchState.isLongPress = true;
        touchState.isTapping = false;
        
        // 派发长按事件
        dispatch('longpress', e, {
          position: {
            x: touchState.currentPointers[0].clientX,
            y: touchState.currentPointers[0].clientY
          },
          duration: Date.now() - touchState.startTime,
          state: { ...touchState }
        });
      }
    }, longPressThreshold);
    
    // 如果设置了阻止鼠标事件，标记下一个鼠标事件应该被阻止
    if (preventMouseEventsOnTouch) {
      touchState.preventNextMouseEvent = true;
    }
    
    // 更新全局状态
    updateGlobalState();
    
    // 派发触摸开始事件
    dispatch('touchstart', e, {
      touches: touchState.startPointers,
      pointerCount: touchState.startPointers.length,
      state: { ...touchState }
    });
  };
  
  /**
   * 处理触摸移动事件
   * @param {TouchEvent} e - 触摸事件
   */
  const handleTouchMove = throttle((e) => {
    if (!enabled || !touchState.isActive) return;
    
    // 记录上一次触摸点
    const previousPointers = [...touchState.currentPointers];
    
    // 更新触摸点
    const touches = Array.from(e.touches);
    touchState.lastEvent = e;
    touchState.activePointers = touches;
    
    // 更新当前触摸点
    touchState.currentPointers = touches.map(touch => ({
      identifier: touch.identifier,
      clientX: touch.clientX,
      clientY: touch.clientY,
      screenX: touch.screenX,
      screenY: touch.screenY,
      pageX: touch.pageX,
      pageY: touch.pageY,
      target: touch.target
    }));
    
    // 检查是否移动了足够的距离以取消点击
    if (touchState.isTapping && touchState.startPointers.length > 0 && touchState.currentPointers.length > 0) {
      const startPoint = touchState.startPointers[0];
      const currentPoint = touchState.currentPointers[0];
      
      const moveDistance = calculateDistance(
        { x: startPoint.clientX, y: startPoint.clientY },
        { x: currentPoint.clientX, y: currentPoint.clientY }
      );
      
      // 如果移动距离超过阈值，取消点击状态
      if (moveDistance > tapDistanceThreshold) {
        touchState.isTapping = false;
        
        // 清除长按定时器
        if (touchState.longPressTimer) {
          clearTimeout(touchState.longPressTimer);
          touchState.longPressTimer = null;
        }
        
        // 检测是否开始滚动
        const timeDelta = Date.now() - touchState.startTime;
        const velocity = moveDistance / timeDelta;
        
        if (velocity > 0.2) { // 阈值：每毫秒0.2像素
          touchState.isScrolling = true;
        }
      }
    }
    
    // 处理多指手势
    if (touchState.currentPointers.length > 1) {
      // 计算新的距离和角度
      const { distance, angle } = calculateDistanceAndAngle(
        touchState.currentPointers[0], 
        touchState.currentPointers[1]
      );
      
      // 更新触摸状态
      touchState.currentDistance = distance;
      touchState.currentAngle = angle;
      
      // 计算缩放比例和旋转角度
      if (touchState.startDistance > 0) {
        touchState.scale = touchState.currentDistance / touchState.startDistance;
      }
      
      touchState.rotation = touchState.currentAngle - touchState.startAngle;
      
      // 检测是否是捏合手势
      if (!touchState.isPinching && Math.abs(touchState.scale - 1) > 0.1) {
        touchState.isPinching = true;
        touchState.isTapping = false;
        
        // 清除长按定时器
        if (touchState.longPressTimer) {
          clearTimeout(touchState.longPressTimer);
          touchState.longPressTimer = null;
        }
      }
    }
    
    // 更新全局状态
    updateGlobalState();
    
    // 计算移动增量
    const deltas = calculateTouchDeltas(previousPointers, touchState.currentPointers);
    
    // 派发对应的事件
    if (touchState.isPinching) {
      // 派发缩放事件
      dispatch('pinch', e, {
        scale: touchState.scale,
        rotation: touchState.rotation,
        center: calculateCenter(touchState.currentPointers),
        state: { ...touchState }
      });
    } else if (touchState.isScrolling) {
      // 派发滚动事件
      dispatch('touchscroll', e, {
        deltas,
        position: calculateCenter(touchState.currentPointers),
        state: { ...touchState }
      });
    }
    
    // 派发标准触摸移动事件
    dispatch('touchmove', e, {
      touches: touchState.currentPointers,
      deltas,
      pointerCount: touchState.currentPointers.length,
      state: { ...touchState }
    });
  });
  
  /**
   * 处理触摸结束事件
   * @param {TouchEvent} e - 触摸事件
   */
  const handleTouchEnd = (e) => {
    if (!enabled) return;
    
    // 记录触摸点
    const touches = Array.from(e.touches);
    const changedTouches = Array.from(e.changedTouches);
    touchState.lastEvent = e;
    touchState.activePointers = touches;
    
    // 更新当前触摸点
    touchState.currentPointers = touches.map(touch => ({
      identifier: touch.identifier,
      clientX: touch.clientX,
      clientY: touch.clientY,
      screenX: touch.screenX,
      screenY: touch.screenY,
      pageX: touch.pageX,
      pageY: touch.pageY,
      target: touch.target
    }));
    
    // 清除长按定时器
    if (touchState.longPressTimer) {
      clearTimeout(touchState.longPressTimer);
      touchState.longPressTimer = null;
    }
    
    // 处理点击事件
    if (touchState.isTapping && changedTouches.length > 0) {
      const now = Date.now();
      const touchPoint = changedTouches[0];
      const position = { x: touchPoint.clientX, y: touchPoint.clientY };
      
      // 检查是否是双击
      let isDoubleTap = false;
      if (now - touchState.lastTapTime < doubleTapThreshold) {
        const lastPos = touchState.lastTapPosition;
        const distance = calculateDistance(lastPos, position);
        
        // 如果时间和位置都在阈值内，认为是双击
        if (distance < tapDistanceThreshold) {
          isDoubleTap = true;
          touchState.tapCount++;
        } else {
          touchState.tapCount = 1;
        }
      } else {
        touchState.tapCount = 1;
      }
      
      // 更新最后点击信息
      touchState.lastTapTime = now;
      touchState.lastTapPosition = position;
      
      // 派发点击事件
      dispatch('tap', e, {
        position,
        tapCount: touchState.tapCount,
        state: { ...touchState }
      });
      
      // 派发双击事件
      if (isDoubleTap) {
        dispatch('doubletap', e, {
          position,
          state: { ...touchState }
        });
      }
    }
    
    // 处理多指手势结束
    if (touchState.isPinching) {
      // 派发捏合结束事件
      dispatch('pinchend', e, {
        finalScale: touchState.scale,
        finalRotation: touchState.rotation,
        center: calculateCenter(touchState.startPointers),
        state: { ...touchState }
      });
    } else if (touchState.isScrolling) {
      // 派发滚动结束事件
      dispatch('touchscrollend', e, {
        position: calculateCenter(touchState.currentPointers),
        state: { ...touchState }
      });
    } else if (touchState.isLongPress) {
      // 派发长按结束事件
      dispatch('longpressend', e, {
        position: {
          x: touchState.startPointers[0].clientX,
          y: touchState.startPointers[0].clientY
        },
        duration: Date.now() - touchState.startTime,
        state: { ...touchState }
      });
    }
    
    // 派发标准触摸结束事件
    dispatch('touchend', e, {
      touches: touchState.currentPointers,
      changedTouches: changedTouches.map(touch => ({
        identifier: touch.identifier,
        clientX: touch.clientX,
        clientY: touch.clientY,
        screenX: touch.screenX,
        screenY: touch.screenY,
        pageX: touch.pageX,
        pageY: touch.pageY,
        target: touch.target
      })),
      pointerCount: touchState.currentPointers.length,
      state: { ...touchState }
    });
    
    // 如果所有触摸点都已结束，重置状态
    if (touches.length === 0) {
      // 保留部分信息以便检测双击
      const lastTapTime = touchState.lastTapTime;
      const lastTapPosition = { ...touchState.lastTapPosition };
      const tapCount = touchState.tapCount;
      const preventNextMouseEvent = touchState.preventNextMouseEvent;
      
      resetTouchState();
      
      // 恢复保留的信息
      touchState.lastTapTime = lastTapTime;
      touchState.lastTapPosition = lastTapPosition;
      touchState.tapCount = tapCount;
      touchState.preventNextMouseEvent = preventNextMouseEvent;
    }
    
    // 更新全局状态
    updateGlobalState();
  };
  
  /**
   * 处理触摸取消事件
   * @param {TouchEvent} e - 触摸事件
   */
  const handleTouchCancel = (e) => {
    if (!enabled) return;
    
    // 记录触摸点
    const touches = Array.from(e.touches);
    touchState.lastEvent = e;
    touchState.activePointers = touches;
    
    // 更新当前触摸点
    touchState.currentPointers = touches.map(touch => ({
      identifier: touch.identifier,
      clientX: touch.clientX,
      clientY: touch.clientY,
      screenX: touch.screenX,
      screenY: touch.screenY,
      pageX: touch.pageX,
      pageY: touch.pageY,
      target: touch.target
    }));
    
    // 清除长按定时器
    if (touchState.longPressTimer) {
      clearTimeout(touchState.longPressTimer);
      touchState.longPressTimer = null;
    }
    
    // 派发触摸取消事件
    dispatch('touchcancel', e, {
      touches: touchState.currentPointers,
      pointerCount: touchState.currentPointers.length,
      state: { ...touchState }
    });
    
    // 重置状态
    resetTouchState();
    
    // 更新全局状态
    updateGlobalState();
  };
  
  /**
   * 处理鼠标事件以阻止由触摸产生的合成鼠标事件
   * @param {MouseEvent} e - 鼠标事件
   */
  const handleMouseEvent = (e) => {
    // 如果需要阻止触摸后的鼠标事件
    if (touchState.preventNextMouseEvent && preventMouseEventsOnTouch) {
      e.stopPropagation();
      if (preventDefault) {
        e.preventDefault();
      }
      
      // 重置标志，只阻止一次
      touchState.preventNextMouseEvent = false;
      return false;
    }
    return true;
  };
  
  /**
   * 绑定触摸事件
   * @param {HTMLElement} container - 容器元素
   */
  const bindEvents = (container) => {
    if (!enabled || !container) return;
    
    // 确定事件选项
    const eventOptions = passiveEvents ? 
      { passive: !preventDefault } : 
      { passive: false, capture: false };
    
    // 绑定主要触摸事件
    container.addEventListener('touchstart', handleTouchStart, eventOptions);
    container.addEventListener('touchmove', handleTouchMove, eventOptions);
    container.addEventListener('touchend', handleTouchEnd, eventOptions);
    container.addEventListener('touchcancel', handleTouchCancel, eventOptions);
    
    // 绑定鼠标事件过滤器（如果启用防止触摸合成鼠标事件）
    if (preventMouseEventsOnTouch) {
      const mouseFilter = (e) => {
        if (!handleMouseEvent(e)) {
          // 如果处理函数返回false，说明事件被阻止了
          return;
        }
        // 否则，正常传递事件
      };
      
      container.addEventListener('mousedown', mouseFilter, { capture: true });
      container.addEventListener('mousemove', mouseFilter, { capture: true });
      container.addEventListener('mouseup', mouseFilter, { capture: true });
      container.addEventListener('click', mouseFilter, { capture: true });
      
      // 存储处理函数引用
      boundHandlers.set('mousedown.filter', { 
        element: container, 
        type: 'mousedown', 
        handler: mouseFilter, 
        options: { capture: true } 
      });
      boundHandlers.set('mousemove.filter', { 
        element: container, 
        type: 'mousemove', 
        handler: mouseFilter, 
        options: { capture: true } 
      });
      boundHandlers.set('mouseup.filter', { 
        element: container, 
        type: 'mouseup', 
        handler: mouseFilter, 
        options: { capture: true } 
      });
      boundHandlers.set('click.filter', { 
        element: container, 
        type: 'click', 
        handler: mouseFilter, 
        options: { capture: true } 
      });
    }
    
    // 存储处理函数引用
    boundHandlers.set('touchstart', { 
      element: container, 
      type: 'touchstart', 
      handler: handleTouchStart, 
      options: eventOptions 
    });
    boundHandlers.set('touchmove', { 
      element: container, 
      type: 'touchmove', 
      handler: handleTouchMove, 
      options: eventOptions 
    });
    boundHandlers.set('touchend', { 
      element: container, 
      type: 'touchend', 
      handler: handleTouchEnd, 
      options: eventOptions 
    });
    boundHandlers.set('touchcancel', { 
      element: container, 
      type: 'touchcancel', 
      handler: handleTouchCancel, 
      options: eventOptions 
    });
  };
  
  /**
   * 解绑触摸事件
   */
  const unbindEvents = () => {
    // 清除长按定时器
    if (touchState.longPressTimer) {
      clearTimeout(touchState.longPressTimer);
      touchState.longPressTimer = null;
    }
    
    // 解绑所有事件处理函数
    boundHandlers.forEach(({ element, type, handler, options }) => {
      if (element && element.removeEventListener) {
        element.removeEventListener(type, handler, options);
      }
    });
    
    boundHandlers.clear();
  };
  
  /**
   * 计算两个触摸点之间的距离和角度
   * @param {Object} p1 - 第一个触摸点
   * @param {Object} p2 - 第二个触摸点
   * @returns {Object} 距离和角度
   */
  const calculateDistanceAndAngle = (p1, p2) => {
    const dx = p2.clientX - p1.clientX;
    const dy = p2.clientY - p1.clientY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    return { distance, angle };
  };
  
  /**
   * 计算两点之间的距离
   * @param {Object} p1 - 第一个点
   * @param {Object} p2 - 第二个点
   * @returns {number} 距离
   */
  const calculateDistance = (p1, p2) => {
    return Math.sqrt(
      Math.pow(p2.x - p1.x, 2) + 
      Math.pow(p2.y - p1.y, 2)
    );
  };
  
  /**
   * 计算触摸点的中心
   * @param {Array} points - 触摸点数组
   * @returns {Object} 中心点坐标
   */
  const calculateCenter = (points) => {
    if (!points.length) return { x: 0, y: 0 };
    
    const sum = points.reduce((acc, point) => {
      return {
        x: acc.x + point.clientX,
        y: acc.y + point.clientY
      };
    }, { x: 0, y: 0 });
    
    return {
      x: sum.x / points.length,
      y: sum.y / points.length
    };
  };
  
  /**
   * 计算触摸点移动增量
   * @param {Array} prevPoints - 上一帧的触摸点
   * @param {Array} currPoints - 当前帧的触摸点
   * @returns {Array} 增量数组
   */
  const calculateTouchDeltas = (prevPoints, currPoints) => {
    const deltas = [];
    
    // 为每个当前触摸点找到对应的上一帧触摸点
    currPoints.forEach(currPoint => {
      const prevPoint = prevPoints.find(p => p.identifier === currPoint.identifier);
      
      if (prevPoint) {
        deltas.push({
          identifier: currPoint.identifier,
          x: currPoint.clientX - prevPoint.clientX,
          y: currPoint.clientY - prevPoint.clientY
        });
      } else {
        // 新增的触摸点，增量为0
        deltas.push({
          identifier: currPoint.identifier,
          x: 0,
          y: 0
        });
      }
    });
    
    return deltas;
  };
  
  /**
   * 模拟触摸事件
   * @param {Object} options - 模拟选项
   */
  const simulateTouch = (options = {}) => {
    const {
      position = { x: 0, y: 0 },
      type = 'tap',
      duration = 100
    } = options;
    
    const container = getContainer();
    if (!container) return;
    
    // 创建合成触摸点
    const touch = {
      identifier: Date.now(),
      clientX: position.x,
      clientY: position.y,
      screenX: position.x,
      screenY: position.y,
      pageX: position.x,
      pageY: position.y,
      target: container
    };
    
    const touches = [touch];
    
    // 创建合成触摸事件
    const createSyntheticTouchEvent = (eventType) => {
      const event = {
        touches: touches,
        changedTouches: touches,
        targetTouches: touches,
        bubbles: true,
        cancelable: true,
        target: container,
        currentTarget: container,
        preventDefault: () => {},
        stopPropagation: () => {}
      };
      
      return event;
    };
    
    // 根据类型模拟不同的触摸序列
    switch (type) {
      case 'tap':
        // 模拟点击：touchstart -> 短暂延迟 -> touchend
        const startEvent = createSyntheticTouchEvent('touchstart');
        handleTouchStart(startEvent);
        
        // 延迟后触发触摸结束
        setTimeout(() => {
          const endEvent = createSyntheticTouchEvent('touchend');
          endEvent.touches = []; // 触摸结束时，touches应为空
          handleTouchEnd(endEvent);
        }, duration);
        break;
        
      case 'longpress':
        // 模拟长按：touchstart -> 延迟超过阈值 -> touchend
        const longPressStartEvent = createSyntheticTouchEvent('touchstart');
        handleTouchStart(longPressStartEvent);
        
        // 延迟后触发触摸结束
        setTimeout(() => {
          const endEvent = createSyntheticTouchEvent('touchend');
          endEvent.touches = []; // 触摸结束时，touches应为空
          handleTouchEnd(endEvent);
        }, longPressThreshold + 100); // 确保超过长按阈值
        break;
        
      // 可以添加更多的模拟类型
    }
  };
  
  /**
   * 获取触摸状态
   * @returns {Object} 触摸状态
   */
  const getTouchState = () => {
    return { ...touchState };
  };
  
  /**
   * 清理资源
   */
  const cleanup = () => {
    unbindEvents();
    resetTouchState();
  };
  
  // 返回公共API
  return {
    bindEvents,
    unbindEvents,
    cleanup,
    simulateTouch,
    getTouchState,
    boundHandlers
  };
}; 