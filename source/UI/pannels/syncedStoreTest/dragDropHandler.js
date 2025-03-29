/**
 * 拖放处理模块
 * 用于管理富文本编辑器中的拖放操作
 */

/**
 * 创建拖放处理器
 * @param {Object} options - 配置项
 * @returns {Object} 拖放处理器API
 */
export const createDragDropHandler = (options = {}) => {
  const {
    dispatch = () => {},              // 事件派发函数
    getContainer = () => null,        // 获取容器元素的函数
    preventDefault = true,            // 是否阻止默认行为
    enabled = true,                   // 是否启用拖放
    allowFileDrop = true,             // 是否允许文件拖放
    allowExternalDrop = true,         // 是否允许外部内容拖放
    customDropTypes = [],             // 自定义允许的拖放类型
    dragThreshold = 5,                // 拖动阈值（像素）
    scrollOnEdge = true               // 拖动到边缘时是否滚动
  } = options;
  
  // 存储原始事件处理函数的引用
  const boundHandlers = new Map();
  
  // 拖放状态
  let dragState = {
    isDragging: false,
    dragStartPosition: null,
    dragCurrentPosition: null,
    dragElement: null,
    dragData: null,
    dropEffect: 'none',
    dropAllowed: false,
    dragSourceExternal: false,
    scrollInterval: null
  };
  
  /**
   * 处理拖动开始
   * @param {DragEvent} e - 拖动事件
   */
  const handleDragStart = (e) => {
    if (!enabled) return;
    
    const container = getContainer();
    if (!container) return;
    
    // 记录拖动状态
    dragState.isDragging = true;
    dragState.dragStartPosition = { x: e.clientX, y: e.clientY };
    dragState.dragCurrentPosition = { x: e.clientX, y: e.clientY };
    dragState.dragElement = e.target;
    dragState.dragSourceExternal = false;
    
    // 获取选区数据，用于拖放操作
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // 设置拖动数据
      if (range && !range.collapsed) {
        // 设置拖动的数据
        try {
          // 设置为HTML，便于格式化粘贴
          const fragment = range.cloneContents();
          const div = document.createElement('div');
          div.appendChild(fragment.cloneNode(true));
          e.dataTransfer.setData('text/html', div.innerHTML);
          
          // 也设置为纯文本，以便在不支持HTML的地方使用
          e.dataTransfer.setData('text/plain', div.textContent);
          
          dragState.dragData = {
            html: div.innerHTML,
            text: div.textContent,
            sourceRange: range
          };
        } catch (err) {
          console.error('设置拖动数据失败:', err);
        }
      }
    }
    
    // 设置拖动的视觉效果
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'copyMove';
      
      // 尝试设置自定义拖动图像
      try {
        const dragImage = createDragImage(e.target);
        if (dragImage) {
          e.dataTransfer.setDragImage(dragImage, 0, 0);
        }
      } catch (err) {
        // 某些浏览器可能不支持自定义拖动图像
        console.warn('设置拖动图像失败:', err);
      }
    }
    
    // 派发拖动开始事件
    dispatch('dragstart', e, { dragState: { ...dragState } });
  };
  
  /**
   * 创建拖动图像
   * @param {HTMLElement} element - 被拖动的元素
   * @returns {HTMLElement} 拖动图像元素
   */
  const createDragImage = (element) => {
    if (!element) return null;
    
    // 对于文本拖动，通常可以使用选区的内容创建一个图像
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return null;
    
    // 克隆选区内容创建拖动图像
    const range = selection.getRangeAt(0);
    if (range.collapsed) return null;
    
    const fragment = range.cloneContents();
    if (!fragment.firstChild) return null;
    
    // 创建一个容器并应用基本样式
    const container = document.createElement('div');
    container.appendChild(fragment);
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.backgroundColor = 'white';
    container.style.padding = '5px';
    container.style.maxWidth = '300px';
    container.style.overflow = 'hidden';
    container.style.borderRadius = '3px';
    container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    container.style.opacity = '0.9';
    
    // 添加到文档后才能获取尺寸
    document.body.appendChild(container);
    
    // 返回并且在稍后清理
    setTimeout(() => {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }, 0);
    
    return container;
  };
  
  /**
   * 处理拖动过程
   * @param {DragEvent} e - 拖动事件
   */
  const handleDrag = (e) => {
    if (!enabled || !dragState.isDragging) return;
    
    // 更新拖动位置
    if (e.clientX || e.clientY) { // 有些浏览器在拖动过程中可能不提供坐标
      dragState.dragCurrentPosition = { 
        x: e.clientX || dragState.dragCurrentPosition.x, 
        y: e.clientY || dragState.dragCurrentPosition.y 
      };
    }
    
    // 派发拖动事件
    dispatch('drag', e, { dragState: { ...dragState } });
    
    // 如果启用了边缘滚动，检查是否需要滚动
    if (scrollOnEdge) {
      handleEdgeScroll(e);
    }
  };
  
  /**
   * 处理拖动结束
   * @param {DragEvent} e - 拖动事件
   */
  const handleDragEnd = (e) => {
    if (!enabled) return;
    
    // 清理边缘滚动
    if (dragState.scrollInterval) {
      clearInterval(dragState.scrollInterval);
      dragState.scrollInterval = null;
    }
    
    // 派发拖动结束事件
    dispatch('dragend', e, { 
      dragState: { ...dragState },
      completed: true,
      dropEffect: e.dataTransfer ? e.dataTransfer.dropEffect : 'none'
    });
    
    // 重置拖动状态
    resetDragState();
  };
  
  /**
   * 处理拖动进入
   * @param {DragEvent} e - 拖动事件
   */
  const handleDragEnter = (e) => {
    if (!enabled) return;
    
    const container = getContainer();
    if (!container) return;
    
    // 检查是否允许放置
    const canDrop = checkDropAllowed(e);
    
    // 如果允许放置，设置视觉提示
    if (canDrop) {
      e.dataTransfer.dropEffect = 'copy';
      dragState.dropAllowed = true;
      dragState.dropEffect = 'copy';
      
      // 添加视觉提示类
      container.classList.add('drag-over');
      
      // 如果来源是外部，标记为外部拖放
      if (!dragState.isDragging) {
        dragState.dragSourceExternal = true;
      }
    } else {
      e.dataTransfer.dropEffect = 'none';
      dragState.dropAllowed = false;
      dragState.dropEffect = 'none';
    }
    
    // 阻止默认行为以允许放置
    if (preventDefault && canDrop) {
      e.preventDefault();
    }
    
    // 派发拖动进入事件
    dispatch('dragenter', e, { 
      dragState: { ...dragState },
      canDrop
    });
  };
  
  /**
   * 处理拖动悬停
   * @param {DragEvent} e - 拖动事件
   */
  const handleDragOver = (e) => {
    if (!enabled) return;
    
    // 检查是否允许放置
    const canDrop = checkDropAllowed(e);
    
    // 更新拖动位置
    dragState.dragCurrentPosition = { x: e.clientX, y: e.clientY };
    
    // 设置放置效果
    if (canDrop) {
      e.dataTransfer.dropEffect = 'copy';
      dragState.dropAllowed = true;
      dragState.dropEffect = 'copy';
    } else {
      e.dataTransfer.dropEffect = 'none';
      dragState.dropAllowed = false;
      dragState.dropEffect = 'none';
    }
    
    // 阻止默认行为以允许放置
    if (preventDefault && canDrop) {
      e.preventDefault();
    }
    
    // 派发拖动悬停事件，可以用于显示放置位置指示器
    dispatch('dragover', e, { 
      dragState: { ...dragState },
      canDrop
    });
    
    // 处理边缘滚动
    if (scrollOnEdge) {
      handleEdgeScroll(e);
    }
  };
  
  /**
   * 处理拖动离开
   * @param {DragEvent} e - 拖动事件
   */
  const handleDragLeave = (e) => {
    if (!enabled) return;
    
    const container = getContainer();
    if (!container) return;
    
    // 检查是否真的离开了容器（而不是进入子元素）
    // 这需要检查relatedTarget是否仍在容器内
    const relatedTarget = e.relatedTarget;
    if (relatedTarget && container.contains(relatedTarget)) {
      return; // 仍在容器内，忽略
    }
    
    // 移除视觉提示
    container.classList.remove('drag-over');
    
    // 清理边缘滚动
    if (dragState.scrollInterval) {
      clearInterval(dragState.scrollInterval);
      dragState.scrollInterval = null;
    }
    
    // 派发拖动离开事件
    dispatch('dragleave', e, { dragState: { ...dragState } });
  };
  
  /**
   * 处理放置
   * @param {DragEvent} e - 拖动事件
   */
  const handleDrop = (e) => {
    if (!enabled) return;
    
    const container = getContainer();
    if (!container) return;
    
    // 移除视觉提示
    container.classList.remove('drag-over');
    
    // 清理边缘滚动
    if (dragState.scrollInterval) {
      clearInterval(dragState.scrollInterval);
      dragState.scrollInterval = null;
    }
    
    // 检查是否允许放置
    const canDrop = checkDropAllowed(e);
    if (!canDrop) {
      if (preventDefault) {
        e.preventDefault();
      }
      return;
    }
    
    // 阻止默认行为（例如链接导航或文件打开）
    if (preventDefault) {
      e.preventDefault();
    }
    
    // 处理放置数据
    const dropData = extractDropData(e);
    
    // 派发放置事件
    dispatch('drop', e, { 
      dragState: { ...dragState },
      dropData,
      dropPosition: { x: e.clientX, y: e.clientY }
    });
    
    // 如果是自己内部的拖放，可能需要额外处理
    if (!dragState.dragSourceExternal && dragState.dragData) {
      handleInternalDrop(e, dropData);
    }
    
    // 重置拖动状态
    resetDragState();
  };
  
  /**
   * 提取放置数据
   * @param {DragEvent} e - 拖动事件
   * @returns {Object} 放置数据
   */
  const extractDropData = (e) => {
    const result = {
      html: null,
      text: null,
      files: [],
      types: Array.from(e.dataTransfer.types || [])
    };
    
    // 尝试获取HTML内容
    try {
      if (e.dataTransfer.types.includes('text/html')) {
        result.html = e.dataTransfer.getData('text/html');
      }
    } catch (err) {
      console.warn('获取HTML拖放数据失败:', err);
    }
    
    // 尝试获取文本内容
    try {
      if (e.dataTransfer.types.includes('text/plain')) {
        result.text = e.dataTransfer.getData('text/plain');
      }
    } catch (err) {
      console.warn('获取文本拖放数据失败:', err);
    }
    
    // 尝试获取文件
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      result.files = Array.from(e.dataTransfer.files);
    }
    
    // 尝试获取自定义类型
    customDropTypes.forEach(type => {
      try {
        if (e.dataTransfer.types.includes(type)) {
          result[type] = e.dataTransfer.getData(type);
        }
      } catch (err) {
        console.warn(`获取自定义类型 ${type} 失败:`, err);
      }
    });
    
    return result;
  };
  
  /**
   * 处理内部拖放
   * @param {DragEvent} e - 拖动事件
   * @param {Object} dropData - 放置数据
   */
  const handleInternalDrop = (e, dropData) => {
    // 内部拖放通常代表移动操作
    // 这里可以实现如移动文本块等自定义逻辑
    dispatch('internaldrop', e, {
      dragState: { ...dragState },
      dropData,
      dropPosition: { x: e.clientX, y: e.clientY },
      sourceRange: dragState.dragData.sourceRange
    });
  };
  
  /**
   * 处理边缘滚动
   * @param {DragEvent} e - 拖动事件
   */
  const handleEdgeScroll = (e) => {
    if (!scrollOnEdge) return;
    
    const container = getContainer();
    if (!container) return;
    
    // 获取容器位置和尺寸
    const rect = container.getBoundingClientRect();
    const { clientX, clientY } = e;
    
    // 定义边缘区域大小
    const edgeSize = 30; // 像素
    
    // 计算滚动速度（越靠近边缘滚动越快）
    let scrollX = 0;
    let scrollY = 0;
    
    // 水平方向
    if (clientX < rect.left + edgeSize) {
      // 左边缘
      scrollX = -10 * (1 - (clientX - rect.left) / edgeSize);
    } else if (clientX > rect.right - edgeSize) {
      // 右边缘
      scrollX = 10 * (1 - (rect.right - clientX) / edgeSize);
    }
    
    // 垂直方向
    if (clientY < rect.top + edgeSize) {
      // 上边缘
      scrollY = -10 * (1 - (clientY - rect.top) / edgeSize);
    } else if (clientY > rect.bottom - edgeSize) {
      // 下边缘
      scrollY = 10 * (1 - (rect.bottom - clientY) / edgeSize);
    }
    
    // 如果需要滚动
    if (scrollX !== 0 || scrollY !== 0) {
      // 清除已有的滚动间隔
      if (dragState.scrollInterval) {
        clearInterval(dragState.scrollInterval);
      }
      
      // 创建新的滚动间隔
      dragState.scrollInterval = setInterval(() => {
        container.scrollLeft += scrollX;
        container.scrollTop += scrollY;
      }, 16); // 约60fps
    } else if (dragState.scrollInterval) {
      // 不需要滚动时清除间隔
      clearInterval(dragState.scrollInterval);
      dragState.scrollInterval = null;
    }
  };
  
  /**
   * 检查是否允许放置
   * @param {DragEvent} e - 拖动事件
   * @returns {boolean} 是否允许放置
   */
  const checkDropAllowed = (e) => {
    if (!enabled) return false;
    
    // 检查是否有文件
    const hasFiles = e.dataTransfer.types.includes('Files') || 
                   (e.dataTransfer.files && e.dataTransfer.files.length > 0);
                   
    // 如果不允许文件放置，但有文件，则拒绝
    if (hasFiles && !allowFileDrop) {
      return false;
    }
    
    // 检查是否是来自外部的拖放
    const isExternal = !dragState.isDragging;
    
    // 如果不允许外部拖放，且来源是外部，则拒绝
    if (isExternal && !allowExternalDrop) {
      return false;
    }
    
    // 检查是否有支持的数据类型
    const hasHTML = e.dataTransfer.types.includes('text/html');
    const hasText = e.dataTransfer.types.includes('text/plain');
    const hasCustomType = customDropTypes.some(type => 
      e.dataTransfer.types.includes(type)
    );
    
    // 至少需要有一种支持的类型
    return hasHTML || hasText || hasFiles || hasCustomType;
  };
  
  /**
   * 重置拖动状态
   */
  const resetDragState = () => {
    // 清除可能的滚动定时器
    if (dragState.scrollInterval) {
      clearInterval(dragState.scrollInterval);
    }
    
    // 重置状态
    dragState = {
      isDragging: false,
      dragStartPosition: null,
      dragCurrentPosition: null,
      dragElement: null,
      dragData: null,
      dropEffect: 'none',
      dropAllowed: false,
      dragSourceExternal: false,
      scrollInterval: null
    };
    
    // 移除容器上的视觉提示类
    const container = getContainer();
    if (container) {
      container.classList.remove('drag-over');
    }
  };
  
  /**
   * 绑定拖放事件
   * @param {HTMLElement} container - 容器元素
   */
  const bindEvents = (container) => {
    if (!enabled || !container) return;
    
    // 拖动源事件
    container.addEventListener('dragstart', handleDragStart);
    container.addEventListener('drag', handleDrag);
    container.addEventListener('dragend', handleDragEnd);
    
    // 放置目标事件
    container.addEventListener('dragenter', handleDragEnter);
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('dragleave', handleDragLeave);
    container.addEventListener('drop', handleDrop);
    
    // 存储绑定的处理函数
    boundHandlers.set('dragstart', { 
      element: container, 
      type: 'dragstart', 
      handler: handleDragStart 
    });
    boundHandlers.set('drag', { 
      element: container, 
      type: 'drag', 
      handler: handleDrag 
    });
    boundHandlers.set('dragend', { 
      element: container, 
      type: 'dragend', 
      handler: handleDragEnd 
    });
    boundHandlers.set('dragenter', { 
      element: container, 
      type: 'dragenter', 
      handler: handleDragEnter 
    });
    boundHandlers.set('dragover', { 
      element: container, 
      type: 'dragover', 
      handler: handleDragOver 
    });
    boundHandlers.set('dragleave', { 
      element: container, 
      type: 'dragleave', 
      handler: handleDragLeave 
    });
    boundHandlers.set('drop', { 
      element: container, 
      type: 'drop', 
      handler: handleDrop 
    });
  };
  
  /**
   * 解绑拖放事件
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
   * 清理资源
   */
  const cleanup = () => {
    unbindEvents();
    resetDragState();
  };
  
  /**
   * 手动触发拖放操作
   * @param {string} data - 要拖放的文本数据
   * @param {HTMLElement} target - 目标元素
   */
  const simulateDrop = (data, target = null) => {
    if (!enabled) return false;
    
    const container = target || getContainer();
    if (!container) return false;
    
    // 创建合成事件
    const syntheticEvent = new CustomEvent('syntheticdrop', {
      bubbles: true,
      detail: { data }
    });
    
    // 添加dataTransfer相关属性
    syntheticEvent.dataTransfer = {
      types: ['text/plain'],
      getData: (type) => type === 'text/plain' ? data : '',
      files: []
    };
    
    // 派发合成放置事件
    dispatch('drop', syntheticEvent, {
      synthetic: true,
      dropData: { text: data, html: null, files: [], types: ['text/plain'] },
      dropPosition: { x: 0, y: 0 }
    });
    
    return true;
  };
  
  /**
   * 获取拖放状态
   * @returns {Object} 当前拖放状态
   */
  const getDragState = () => ({ ...dragState });
  
  return {
    bindEvents,
    unbindEvents,
    cleanup,
    simulateDrop,
    getDragState,
    boundHandlers
  };
}; 