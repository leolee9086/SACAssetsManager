/**
 * 鼠标事件处理模块
 * 用于管理富文本编辑器中的鼠标交互
 */

/**
 * 创建鼠标事件处理器
 * @param {Object} options - 配置项
 * @returns {Object} 鼠标事件处理器API
 */
export const createMouseEventHandler = (options = {}) => {
  const {
    dispatch = () => {},              // 事件派发函数
    getContainer = () => null,        // 获取容器元素的函数
    preventDefault = true,            // 是否阻止默认行为
    throttle = (fn) => fn,            // 节流函数
    updateState = () => {},           // 更新状态函数
    doubleClickThreshold = 300,       // 双击检测阈值(ms)
    dragThreshold = 5,                // 拖动检测阈值(像素)
    rightClickEnabled = true,         // 是否启用右键菜单
    selectionOnClick = true,          // 是否允许点击选择
    trackMovement = true,             // 是否跟踪鼠标移动
    treatMiddleClickAs = 'auxiliary'  // 中键点击处理方式
  } = options;
  
  // 存储绑定的事件处理函数
  const boundHandlers = new Map();
  
  // 鼠标状态
  let mouseState = {
    isDown: false,                    // 鼠标是否按下
    button: null,                     // 当前按下的按钮
    position: { x: 0, y: 0 },         // 当前位置
    startPosition: { x: 0, y: 0 },    // 按下时位置
    lastClickTime: 0,                 // 上次点击时间
    lastClickPosition: { x: 0, y: 0 },// 上次点击位置
    clickCount: 0,                    // 连击计数
    isDragging: false,                // 是否正在拖动
    dragDistance: 0,                  // 拖动距离
    target: null,                     // 当前目标元素
    trackingPoints: [],               // 移动轨迹点
    isSelecting: false,               // 是否正在选择
    hoverElement: null                // 当前悬停元素
  };
  
  /**
   * 重置鼠标状态
   */
  const resetMouseState = () => {
    mouseState = {
      isDown: false,
      button: null,
      position: { ...mouseState.position },
      startPosition: { x: 0, y: 0 },
      lastClickTime: mouseState.lastClickTime,
      lastClickPosition: mouseState.lastClickPosition,
      clickCount: 0,
      isDragging: false,
      dragDistance: 0,
      target: null,
      trackingPoints: [],
      isSelecting: false,
      hoverElement: mouseState.hoverElement
    };
  };
  
  /**
   * 更新全局状态
   */
  const updateGlobalState = () => {
    updateState({
      lastMousePosition: { ...mouseState.position },
      mouseDown: mouseState.isDown,
      selectionActive: mouseState.isSelecting
    });
  };
  
  /**
   * 处理鼠标按下事件
   * @param {MouseEvent} e - 鼠标事件
   */
  const handleMouseDown = (e) => {
    // 记录鼠标状态
    mouseState.isDown = true;
    mouseState.button = e.button;
    mouseState.position = { x: e.clientX, y: e.clientY };
    mouseState.startPosition = { x: e.clientX, y: e.clientY };
    mouseState.target = e.target;
    mouseState.trackingPoints = [{ x: e.clientX, y: e.clientY, time: Date.now() }];
    
    // 检查是否是双击
    const now = Date.now();
    const timeDiff = now - mouseState.lastClickTime;
    const distanceDiff = calculateDistance(
      mouseState.lastClickPosition, 
      { x: e.clientX, y: e.clientY }
    );
    
    // 处理连击计数
    if (timeDiff < doubleClickThreshold && distanceDiff < dragThreshold) {
      mouseState.clickCount++;
    } else {
      mouseState.clickCount = 1;
    }
    
    // 确定是否开始选择操作
    if (selectionOnClick && e.button === 0) {
      // 左键可能开始文本选择
      mouseState.isSelecting = true;
    }
    
    // 更新全局状态
    updateGlobalState();
    
    // 派发自定义鼠标按下事件
    const eventData = {
      position: { ...mouseState.position },
      button: mouseState.button,
      clickCount: mouseState.clickCount,
      state: { ...mouseState }
    };
    
    // 根据点击次数派发不同事件
    if (mouseState.clickCount > 1) {
      dispatch('multimousedown', e, {
        ...eventData,
        clickCount: mouseState.clickCount
      });
    }
    
    // 派发标准鼠标按下事件
    dispatch('mousedown', e, eventData);
  };
  
  /**
   * 处理鼠标移动事件
   * @param {MouseEvent} e - 鼠标事件
   */
  const handleMouseMove = throttle((e) => {
    // 更新位置
    const prevPosition = { ...mouseState.position };
    mouseState.position = { x: e.clientX, y: e.clientY };
    
    // 如果在跟踪移动，添加轨迹点
    if (trackMovement && mouseState.isDown) {
      mouseState.trackingPoints.push({
        x: e.clientX,
        y: e.clientY,
        time: Date.now()
      });
      
      // 只保留最近的20个点，避免内存占用过多
      if (mouseState.trackingPoints.length > 20) {
        mouseState.trackingPoints.shift();
      }
    }
    
    // 检查是否开始拖动
    if (mouseState.isDown && !mouseState.isDragging) {
      const distance = calculateDistance(mouseState.startPosition, mouseState.position);
      mouseState.dragDistance = distance;
      
      if (distance > dragThreshold) {
        mouseState.isDragging = true;
        
        // 派发拖动开始事件
        dispatch('dragstart', e, {
          position: { ...mouseState.position },
          startPosition: { ...mouseState.startPosition },
          button: mouseState.button,
          state: { ...mouseState }
        });
      }
    }
    
    // 如果已经在拖动，派发拖动事件
    if (mouseState.isDragging) {
      dispatch('dragmove', e, {
        position: { ...mouseState.position },
        delta: {
          x: mouseState.position.x - prevPosition.x,
          y: mouseState.position.y - prevPosition.y
        },
        button: mouseState.button,
        state: { ...mouseState }
      });
    }
    
    // 检查鼠标移动速度
    let movementSpeed = 0;
    if (mouseState.trackingPoints.length >= 2) {
      const lastPoint = mouseState.trackingPoints[mouseState.trackingPoints.length - 1];
      const prevPoint = mouseState.trackingPoints[mouseState.trackingPoints.length - 2];
      const timeDiff = lastPoint.time - prevPoint.time;
      
      if (timeDiff > 0) {
        const distance = calculateDistance(prevPoint, lastPoint);
        movementSpeed = distance / timeDiff; // 像素/毫秒
      }
    }
    
    // 更新全局状态
    updateGlobalState();
    
    // 派发鼠标移动事件
    dispatch('mousemove', e, {
      position: { ...mouseState.position },
      delta: {
        x: mouseState.position.x - prevPosition.x,
        y: mouseState.position.y - prevPosition.y
      },
      isDragging: mouseState.isDragging,
      isSelecting: mouseState.isSelecting,
      speed: movementSpeed,
      state: { ...mouseState }
    });
  });
  
  /**
   * 处理鼠标抬起事件
   * @param {MouseEvent} e - 鼠标事件
   */
  const handleMouseUp = (e) => {
    // 记录当前位置
    mouseState.position = { x: e.clientX, y: e.clientY };
    
    // 计算是否应视为点击（如果没有拖动太远）
    const wasClick = calculateDistance(mouseState.startPosition, mouseState.position) <= dragThreshold;
    
    // 如果是拖动状态，派发拖动结束事件
    if (mouseState.isDragging) {
      dispatch('dragend', e, {
        position: { ...mouseState.position },
        startPosition: { ...mouseState.startPosition },
        button: mouseState.button,
        distance: mouseState.dragDistance,
        state: { ...mouseState }
      });
    }
    
    // 如果是选择状态，派发选择结束事件
    if (mouseState.isSelecting) {
      // 派发选择结束事件
      dispatch('selectend', e, {
        position: { ...mouseState.position },
        startPosition: { ...mouseState.startPosition },
        button: mouseState.button,
        state: { ...mouseState }
      });
    }
    
    // 如果是点击，处理点击事件
    if (wasClick) {
      // 更新上次点击信息
      mouseState.lastClickTime = Date.now();
      mouseState.lastClickPosition = { ...mouseState.position };
      
      // 根据点击类型分发不同事件
      switch (e.button) {
        case 0: // 左键
          handleLeftClick(e);
          break;
        case 1: // 中键
          handleMiddleClick(e);
          break;
        case 2: // 右键
          handleRightClick(e);
          break;
      }
    }
    
    // 重置拖动和选择状态
    mouseState.isDown = false;
    mouseState.isDragging = false;
    mouseState.isSelecting = false;
    mouseState.dragDistance = 0;
    
    // 更新全局状态
    updateGlobalState();
    
    // 派发鼠标抬起事件
    dispatch('mouseup', e, {
      position: { ...mouseState.position },
      button: mouseState.button,
      wasClick: wasClick,
      state: { ...mouseState }
    });
  };
  
  /**
   * 处理左键点击
   * @param {MouseEvent} e - 鼠标事件
   */
  const handleLeftClick = (e) => {
    const eventData = {
      position: { ...mouseState.position },
      clickCount: mouseState.clickCount,
      state: { ...mouseState }
    };
    
    // 处理单击、双击和三击
    if (mouseState.clickCount === 1) {
      dispatch('click', e, eventData);
    } else if (mouseState.clickCount === 2) {
      dispatch('dblclick', e, eventData);
    } else if (mouseState.clickCount === 3) {
      dispatch('tripleclick', e, eventData);
    }
  };
  
  /**
   * 处理中键点击
   * @param {MouseEvent} e - 鼠标事件
   */
  const handleMiddleClick = (e) => {
    // 根据配置处理中键点击
    if (treatMiddleClickAs === 'auxiliary') {
      dispatch('auxiliaryclick', e, {
        position: { ...mouseState.position },
        state: { ...mouseState }
      });
    } else if (treatMiddleClickAs === 'paste') {
      // 某些浏览器中，中键可能用于粘贴
      dispatch('middlepaste', e, {
        position: { ...mouseState.position },
        state: { ...mouseState }
      });
    }
  };
  
  /**
   * 处理右键点击
   * @param {MouseEvent} e - 鼠标事件
   */
  const handleRightClick = (e) => {
    if (rightClickEnabled) {
      dispatch('contextmenu', e, {
        position: { ...mouseState.position },
        state: { ...mouseState }
      });
    } else if (preventDefault) {
      e.preventDefault();
    }
  };
  
  /**
   * 处理鼠标进入事件
   * @param {MouseEvent} e - 鼠标事件
   */
  const handleMouseEnter = (e) => {
    mouseState.position = { x: e.clientX, y: e.clientY };
    mouseState.hoverElement = e.target;
    
    dispatch('mouseenter', e, {
      position: { ...mouseState.position },
      state: { ...mouseState }
    });
  };
  
  /**
   * 处理鼠标离开事件
   * @param {MouseEvent} e - 鼠标事件
   */
  const handleMouseLeave = (e) => {
    mouseState.position = { x: e.clientX, y: e.clientY };
    
    // 如果鼠标按下时离开容器，可能需要特殊处理
    if (mouseState.isDown) {
      // 在某些情况下可能需要在此取消选择或拖动状态
    }
    
    mouseState.hoverElement = null;
    
    dispatch('mouseleave', e, {
      position: { ...mouseState.position },
      state: { ...mouseState }
    });
  };
  
  /**
   * 处理鼠标悬停事件
   * @param {MouseEvent} e - 鼠标事件
   */
  const handleMouseOver = (e) => {
    mouseState.position = { x: e.clientX, y: e.clientY };
    mouseState.hoverElement = e.target;
    
    dispatch('mouseover', e, {
      position: { ...mouseState.position },
      target: e.target,
      state: { ...mouseState }
    });
  };
  
  /**
   * 处理鼠标离开元素事件
   * @param {MouseEvent} e - 鼠标事件
   */
  const handleMouseOut = (e) => {
    mouseState.position = { x: e.clientX, y: e.clientY };
    
    // 如果离开当前悬停元素，更新状态
    if (mouseState.hoverElement === e.target) {
      mouseState.hoverElement = null;
    }
    
    dispatch('mouseout', e, {
      position: { ...mouseState.position },
      target: e.target,
      state: { ...mouseState }
    });
  };
  
  /**
   * 处理上下文菜单事件
   * @param {MouseEvent} e - 鼠标事件
   */
  const handleContextMenu = (e) => {
    if (!rightClickEnabled && preventDefault) {
      e.preventDefault();
      return;
    }
    
    mouseState.position = { x: e.clientX, y: e.clientY };
    
    dispatch('contextmenu', e, {
      position: { ...mouseState.position },
      state: { ...mouseState }
    });
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
   * 计算鼠标移动速度
   * @returns {Object} 速度向量
   */
  const calculateVelocity = () => {
    if (mouseState.trackingPoints.length < 2) {
      return { x: 0, y: 0, magnitude: 0 };
    }
    
    // 取最近的几个点计算
    const points = mouseState.trackingPoints.slice(-5);
    if (points.length < 2) return { x: 0, y: 0, magnitude: 0 };
    
    const first = points[0];
    const last = points[points.length - 1];
    const timeDiff = last.time - first.time;
    
    if (timeDiff <= 0) return { x: 0, y: 0, magnitude: 0 };
    
    const xDiff = last.x - first.x;
    const yDiff = last.y - first.y;
    const distance = Math.sqrt(xDiff * xDiff + yDiff * yDiff);
    
    return {
      x: xDiff / timeDiff,
      y: yDiff / timeDiff,
      magnitude: distance / timeDiff
    };
  };
  
  /**
   * 模拟鼠标点击
   * @param {Object} position - 点击位置
   * @param {number} button - 按钮 (0=左键, 1=中键, 2=右键)
   */
  const simulateClick = (position = { x: 0, y: 0 }, button = 0) => {
    const container = getContainer();
    if (!container) return;
    
    // 创建合成事件
    const createSyntheticEvent = (type) => {
      const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
        detail: 1,
        screenX: position.x,
        screenY: position.y,
        clientX: position.x,
        clientY: position.y,
        button: button
      });
      
      return event;
    };
    
    // 派发合成事件序列
    const mousedownEvent = createSyntheticEvent('mousedown');
    const mouseupEvent = createSyntheticEvent('mouseup');
    const clickEvent = createSyntheticEvent('click');
    
    // 处理事件
    handleMouseDown(mousedownEvent);
    handleMouseUp(mouseupEvent);
    
    // 如果是左键，也派发点击事件
    if (button === 0) {
      dispatch('click', clickEvent, {
        position: { ...position },
        clickCount: 1,
        state: { ...mouseState },
        synthetic: true
      });
    }
  };
  
  /**
   * 绑定鼠标事件
   * @param {HTMLElement} container - 容器元素
   */
  const bindEvents = (container) => {
    if (!container) return;
    
    // 主要鼠标事件
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    
    // 其他鼠标事件
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('mouseover', handleMouseOver);
    container.addEventListener('mouseout', handleMouseOut);
    
    // 上下文菜单
    container.addEventListener('contextmenu', handleContextMenu);
    
    // 存储处理函数引用以便后续解绑
    boundHandlers.set('mousedown', { element: container, type: 'mousedown', handler: handleMouseDown });
    boundHandlers.set('mousemove', { element: container, type: 'mousemove', handler: handleMouseMove });
    boundHandlers.set('mouseup', { element: container, type: 'mouseup', handler: handleMouseUp });
    boundHandlers.set('mouseenter', { element: container, type: 'mouseenter', handler: handleMouseEnter });
    boundHandlers.set('mouseleave', { element: container, type: 'mouseleave', handler: handleMouseLeave });
    boundHandlers.set('mouseover', { element: container, type: 'mouseover', handler: handleMouseOver });
    boundHandlers.set('mouseout', { element: container, type: 'mouseout', handler: handleMouseOut });
    boundHandlers.set('contextmenu', { element: container, type: 'contextmenu', handler: handleContextMenu });
    
    // 全局鼠标抬起捕获 - 处理容器外抬起鼠标的情况
    const handleGlobalMouseUp = (e) => {
      if (mouseState.isDown) {
        // 如果鼠标在容器外抬起，需要结束拖动和选择状态
        handleMouseUp(e);
      }
    };
    
    document.addEventListener('mouseup', handleGlobalMouseUp);
    boundHandlers.set('document.mouseup', { element: document, type: 'mouseup', handler: handleGlobalMouseUp });
  };
  
  /**
   * 解绑鼠标事件
   */
  const unbindEvents = () => {
    boundHandlers.forEach(({ element, type, handler }) => {
      if (element && element.removeEventListener) {
        element.removeEventListener(type, handler);
      }
    });
    
    boundHandlers.clear();
  };
  
  /**
   * 获取鼠标状态
   * @returns {Object} 鼠标状态对象
   */
  const getMouseState = () => {
    return { ...mouseState };
  };
  
  /**
   * 获取鼠标速度
   * @returns {Object} 鼠标速度向量
   */
  const getVelocity = () => {
    return calculateVelocity();
  };
  
  /**
   * 清理资源
   */
  const cleanup = () => {
    unbindEvents();
    resetMouseState();
  };
  
  // 返回公共API
  return {
    bindEvents,
    unbindEvents,
    cleanup,
    simulateClick,
    getMouseState,
    getVelocity,
    boundHandlers
  };
}; 