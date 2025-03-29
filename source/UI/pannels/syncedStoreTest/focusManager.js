/**
 * 焦点管理模块
 * 用于跟踪和控制容器的焦点状态
 */

/**
 * 创建焦点管理器
 * @param {Object} options - 配置项
 * @returns {Object} 焦点管理器API
 */
export const createFocusManager = (options = {}) => {
  const {
    dispatch = () => {},       // 事件派发函数
    getContainer = () => null, // 获取容器元素的函数
    updateState = () => {},    // 更新状态的函数
    enabled = true,            // 是否启用焦点跟踪
    autoFocus = false,         // 是否自动聚焦
    blurOnEscape = true        // 是否在按ESC键时取消焦点
  } = options;
  
  // 存储绑定的事件处理函数
  const boundHandlers = new Map();
  
  // 焦点状态
  let isFocused = false;
  let focusTimer = null;
  let lastFocusTime = 0;
  let pendingFocusChange = null;
  
  /**
   * 处理焦点事件
   * @param {FocusEvent} event - 焦点事件
   */
  const handleFocusEvent = (event) => {
    if (!enabled) return;
    
    const isFocusEvent = event.type === 'focus' || event.type === 'focusin';
    const isBlurEvent = event.type === 'blur' || event.type === 'focusout';
    
    if (isFocusEvent) {
      isFocused = true;
      lastFocusTime = Date.now();
      clearTimeout(focusTimer);
      
      updateState({ isFocused: true });
      
      dispatch(event.type, event, {
        isFocused: true,
        focusTime: lastFocusTime,
        relatedTarget: event.relatedTarget
      });
    } else if (isBlurEvent) {
      // 使用短延迟来处理焦点变化，避免在链式焦点变化中误报失焦
      clearTimeout(focusTimer);
      
      pendingFocusChange = {
        type: 'blur',
        event,
        time: Date.now()
      };
      
      focusTimer = setTimeout(() => {
        // 实际执行失焦处理
        if (pendingFocusChange && pendingFocusChange.type === 'blur') {
          isFocused = false;
          updateState({ isFocused: false });
          
          dispatch(event.type, event, {
            isFocused: false,
            blurTime: pendingFocusChange.time,
            relatedTarget: event.relatedTarget
          });
          
          pendingFocusChange = null;
        }
      }, 10); // 短延迟以处理焦点重定向
    }
  };
  
  /**
   * 处理ESC键取消焦点
   * @param {KeyboardEvent} event - 键盘事件
   */
  const handleEscapeKey = (event) => {
    if (!blurOnEscape || !isFocused) return;
    
    if (event.key === 'Escape') {
      const container = getContainer();
      if (container) {
        container.blur();
        
        // 重置焦点到文档
        if (document.activeElement === container) {
          document.body.focus();
        }
        
        event.preventDefault();
      }
    }
  };
  
  /**
   * 处理文档级焦点变化
   * @param {FocusEvent} event - 焦点事件
   */
  const handleDocumentFocus = (event) => {
    if (!enabled) return;
    
    const container = getContainer();
    if (!container) return;
    
    const targetIsContainer = container === event.target;
    const targetInContainer = container.contains(event.target);
    const isFocusIn = targetIsContainer || targetInContainer;
    
    // 只在焦点状态实际改变时处理
    if (isFocusIn !== isFocused) {
      clearTimeout(focusTimer);
      pendingFocusChange = null;
      
      isFocused = isFocusIn;
      updateState({ isFocused: isFocusIn });
      
      dispatch(isFocusIn ? 'focus' : 'blur', event, {
        isFocused: isFocusIn,
        time: Date.now(),
        isDocumentLevel: true,
        relatedTarget: event.relatedTarget
      });
    }
  };
  
  /**
   * 绑定焦点相关事件
   * @param {HTMLElement} container - 容器元素
   */
  const bindEvents = (container) => {
    if (!container || !enabled) return;
    
    // 容器级焦点事件
    const focusEvents = ['focus', 'blur', 'focusin', 'focusout'];
    
    focusEvents.forEach(type => {
      const handler = (e) => handleFocusEvent(e);
      container.addEventListener(type, handler);
      boundHandlers.set(type, {
        element: container,
        type,
        handler,
        options: {}
      });
    });
    
    // ESC键处理
    if (blurOnEscape) {
      const escHandler = (e) => handleEscapeKey(e);
      container.addEventListener('keydown', escHandler);
      boundHandlers.set('keydown.escape', {
        element: container,
        type: 'keydown',
        handler: escHandler,
        options: {}
      });
    }
    
    // 文档级焦点跟踪（捕获阶段监听以确保最早获得事件）
    const docFocusHandler = (e) => handleDocumentFocus(e);
    document.addEventListener('focus', docFocusHandler, true);
    document.addEventListener('blur', docFocusHandler, true);
    
    boundHandlers.set('document.focus', {
      element: document,
      type: 'focus',
      handler: docFocusHandler,
      options: { capture: true }
    });
    
    boundHandlers.set('document.blur', {
      element: document,
      type: 'blur',
      handler: docFocusHandler,
      options: { capture: true }
    });
    
    // 自动聚焦
    if (autoFocus && !isFocused) {
      // 使用setTimeout确保在DOM完全初始化后聚焦
      setTimeout(() => {
        if (!isFocused && container) {
          container.focus();
        }
      }, 0);
    }
  };
  
  /**
   * 聚焦容器
   * @returns {boolean} 是否成功聚焦
   */
  const focus = () => {
    const container = getContainer();
    if (!container) return false;
    
    try {
      container.focus();
      return document.activeElement === container;
    } catch (e) {
      console.error('焦点设置失败:', e);
      return false;
    }
  };
  
  /**
   * 取消容器的焦点
   * @returns {boolean} 是否成功取消焦点
   */
  const blur = () => {
    const container = getContainer();
    if (!container) return false;
    
    try {
      container.blur();
      return document.activeElement !== container;
    } catch (e) {
      console.error('取消焦点失败:', e);
      return false;
    }
  };
  
  /**
   * 检查容器是否有焦点
   * @returns {boolean} 是否有焦点
   */
  const hasFocus = () => isFocused;
  
  /**
   * 清理焦点管理器
   */
  const cleanup = () => {
    clearTimeout(focusTimer);
    
    boundHandlers.forEach(({ element, type, handler, options }) => {
      if (element && typeof element.removeEventListener === 'function') {
        element.removeEventListener(type, handler, options);
      }
    });
    
    boundHandlers.clear();
  };
  
  return {
    bindEvents,
    cleanup,
    focus,
    blur,
    hasFocus,
    boundHandlers
  };
}; 