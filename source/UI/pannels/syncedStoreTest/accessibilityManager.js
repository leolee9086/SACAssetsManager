/**
 * 辅助功能管理模块
 * 
 * 提供完整的无障碍(A11Y)支持，包括：
 * - 屏幕阅读器支持
 * - 键盘导航
 * - 高对比度模式
 * - 减少动画模式
 * - ARIA属性管理
 * - 实时状态宣告
 * 
 * @module AccessibilityManager
 * @version 1.0.0
 * @license MIT
 * @example
 * // 基本用法
 * const a11yManager = createAccessibilityManager({
 *   getContainer: () => document.getElementById('editor'),
 *   announceChanges: true,
 *   screenReaderSupport: true
 * });
 * 
 * a11yManager.setupAccessibility();
 * a11yManager.bindA11yEvents();
 * 
 * @example
 * // 自定义宣告
 * createAccessibilityManager({
 *   customAnnouncer: (message, options) => {
 *     console.log('[屏幕阅读器]:', message);
 *   }
 * });
 */

/**
 * 创建辅助功能管理器
 * @param {Object} options - 配置项
 * @param {Function} [options.dispatch=()=>{}] - 事件派发函数
 * @param {Function} [options.getContainer=()=>null] - 获取容器元素的函数
 * @param {boolean} [options.announceChanges=true] - 是否自动宣告内容变化
 * @param {boolean} [options.screenReaderSupport=true] - 是否启用屏幕阅读器支持
 * @param {boolean} [options.highContrastSupport=false] - 是否启用高对比度支持
 * @param {boolean} [options.keyboardNavigation=true] - 是否启用键盘导航
 * @param {boolean} [options.reducedMotion=false] - 是否默认减少动画
 * @param {string|null} [options.labelledBy=null] - 关联的aria-labelledby ID
 * @param {string|null} [options.describedBy=null] - 关联的aria-describedby ID
 * @param {string} [options.ariaRole='textbox'] - 容器的ARIA角色
 * @param {Function|null} [options.customAnnouncer=null] - 自定义宣告函数
 * @returns {Object} 辅助功能管理器API
 * 
 * @typedef {Object} A11yManagerAPI
 * @property {Function} setupAccessibility - 初始化容器的无障碍支持
 * @property {Function} bindA11yEvents - 绑定无障碍事件监听
 * @property {Function} unbindA11yEvents - 解绑无障碍事件
 * @property {Function} announce - 向屏幕阅读器宣告消息
 * @property {Function} setAriaAttributes - 设置ARIA属性
 * @property {Function} setRole - 设置元素角色
 * @property {Function} enableKeyboardTrap - 启用键盘焦点陷阱
 * @property {Function} disableKeyboardTrap - 禁用键盘焦点陷阱
 * @property {Function} getA11yState - 获取当前无障碍状态
 * @property {Function} cleanup - 清理资源
 * @property {Map} boundHandlers - 已绑定的事件处理器映射
 */
export const createAccessibilityManager = (options = {}) => {
  const {
    dispatch = () => {},              // 事件派发函数
    getContainer = () => null,        // 获取容器元素的函数
    announceChanges = true,           // 是否宣告变化 
    screenReaderSupport = true,       // 是否启用屏幕阅读器支持
    highContrastSupport = false,      // 是否启用高对比度支持
    keyboardNavigation = true,        // 是否启用键盘导航
    reducedMotion = false,            // 是否减少动画
    labelledBy = null,                // aria-labelledby引用
    describedBy = null,               // aria-describedby引用
    ariaRole = 'textbox',             // ARIA角色
    customAnnouncer = null,           // 自定义宣告函数
  } = options;
  
  // 存储绑定的事件处理函数
  const boundHandlers = new Map();
  
  // 无障碍状态
  let a11yState = {
    container: null,                  // 容器引用
    liveRegion: null,                 // 实时区域元素
    hasFocus: false,                  // 是否有焦点
    isNavigatingWithKeyboard: false,  // 是否使用键盘导航
    lastAnnouncedAction: null,        // 最后宣告的动作
    lastAnnouncedTime: 0,             // 最后宣告时间
    userPreferences: {                // 用户偏好设置
      prefersReducedMotion: false,     // 是否偏好减少动画
      prefersHighContrast: false,      // 是否偏好高对比度
    },
    ariaAttributes: new Map(),        // ARIA属性映射
    focusableElements: [],            // 可聚焦元素
    keyboardTrapActive: false,        // 键盘焦点陷阱是否激活
  };
  
  /**
   * 创建实时区域元素用于屏幕阅读器宣告
   * @returns {HTMLElement} 实时区域元素
   */
  const createLiveRegion = () => {
    // 检查是否已存在
    if (a11yState.liveRegion && document.body.contains(a11yState.liveRegion)) {
      return a11yState.liveRegion;
    }
    
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('aria-relevant', 'additions text');
    liveRegion.setAttribute('class', 'a11y-live-region');
    liveRegion.setAttribute('role', 'status');
    
    // 设置样式使其对视觉用户不可见，但对屏幕阅读器可读
    liveRegion.style.position = 'absolute';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.margin = '-1px';
    liveRegion.style.padding = '0';
    liveRegion.style.overflow = 'hidden';
    liveRegion.style.clip = 'rect(0, 0, 0, 0)';
    liveRegion.style.whiteSpace = 'nowrap';
    liveRegion.style.border = '0';
    
    document.body.appendChild(liveRegion);
    a11yState.liveRegion = liveRegion;
    
    return liveRegion;
  };
  
  /**
   * 向屏幕阅读器宣告信息
   * @param {string} message - 要宣告的消息
   * @param {Object} options - 宣告选项
   */
  const announce = (message, options = {}) => {
    if (!screenReaderSupport || !announceChanges) return;
    
    const {
      priority = 'polite',         // 'polite' 或 'assertive'
      clearAfter = 5000,           // 多少毫秒后清除消息
      deduplicate = true,          // 是否去重（避免短时间内重复相同消息）
    } = options;
    
    // 检查重复
    if (deduplicate && 
        message === a11yState.lastAnnouncedAction && 
        Date.now() - a11yState.lastAnnouncedTime < 2000) {
      return;
    }
    
    // 如果提供了自定义宣告器，使用它
    if (typeof customAnnouncer === 'function') {
      customAnnouncer(message, options);
      
      a11yState.lastAnnouncedAction = message;
      a11yState.lastAnnouncedTime = Date.now();
      return;
    }
    
    // 创建或获取实时区域
    const liveRegion = createLiveRegion();
    
    // 设置优先级
    liveRegion.setAttribute('aria-live', priority);
    
    // 宣告消息
    liveRegion.textContent = '';
    
    // 使用延迟确保DOM更新和屏幕阅读器能够捕获变化
    setTimeout(() => {
      liveRegion.textContent = message;
      
      // 清除消息
      if (clearAfter > 0) {
        setTimeout(() => {
          if (liveRegion.textContent === message) {
            liveRegion.textContent = '';
          }
        }, clearAfter);
      }
    }, 50);
    
    a11yState.lastAnnouncedAction = message;
    a11yState.lastAnnouncedTime = Date.now();
  };
  
  /**
   * 检测用户偏好
   */
  const detectUserPreferences = () => {
    // 检测是否偏好减少动画
    a11yState.userPreferences.prefersReducedMotion = 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches || reducedMotion;
    
    // 检测是否偏好高对比度
    a11yState.userPreferences.prefersHighContrast = 
      window.matchMedia('(prefers-contrast: more)').matches || 
      window.matchMedia('(-ms-high-contrast: active)').matches ||
      highContrastSupport;
    
    // 添加媒体查询监听器
    const reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastMediaQuery = window.matchMedia('(prefers-contrast: more)');
    
    // 处理媒体查询变化
    const handleReducedMotionChange = (e) => {
      a11yState.userPreferences.prefersReducedMotion = e.matches || reducedMotion;
      applyUserPreferences();
    };
    
    const handleHighContrastChange = (e) => {
      a11yState.userPreferences.prefersHighContrast = e.matches || highContrastSupport;
      applyUserPreferences();
    };
    
    // 现代浏览器使用addEventListener，旧版Safari使用addListener
    if (typeof reducedMotionMediaQuery.addEventListener === 'function') {
      reducedMotionMediaQuery.addEventListener('change', handleReducedMotionChange);
      highContrastMediaQuery.addEventListener('change', handleHighContrastChange);
    } else if (typeof reducedMotionMediaQuery.addListener === 'function') {
      reducedMotionMediaQuery.addListener(handleReducedMotionChange);
      highContrastMediaQuery.addListener(handleHighContrastChange);
    }
  };
  
  /**
   * 应用用户偏好设置
   */
  const applyUserPreferences = () => {
    const container = getContainer();
    if (!container) return;
    
    if (a11yState.userPreferences.prefersReducedMotion) {
      container.setAttribute('data-reduced-motion', 'true');
    } else {
      container.removeAttribute('data-reduced-motion');
    }
    
    if (a11yState.userPreferences.prefersHighContrast) {
      container.setAttribute('data-high-contrast', 'true');
    } else {
      container.removeAttribute('data-high-contrast');
    }
    
    // 派发用户偏好变化事件
    dispatch('accessibilitypreferences', {}, {
      preferences: { ...a11yState.userPreferences }
    });
  };
  
  /**
   * 设置ARIA属性
   * @param {HTMLElement} element - 目标元素
   * @param {Object} attributes - 要设置的属性
   */
  const setAriaAttributes = (element, attributes = {}) => {
    if (!element) return;
    
    // 设置属性并保存到状态中
    Object.entries(attributes).forEach(([key, value]) => {
      const ariaKey = key.startsWith('aria-') ? key : `aria-${key}`;
      
      if (value === null || value === undefined) {
        element.removeAttribute(ariaKey);
        a11yState.ariaAttributes.delete(ariaKey);
      } else {
        element.setAttribute(ariaKey, value);
        a11yState.ariaAttributes.set(ariaKey, value);
      }
    });
  };
  
  /**
   * 设置元素角色
   * @param {HTMLElement} element - 目标元素
   * @param {string} role - ARIA角色
   */
  const setRole = (element, role) => {
    if (!element) return;
    element.setAttribute('role', role);
  };
  
  /**
   * 查找可聚焦元素
   * @returns {Array} 可聚焦元素数组
   */
  const findFocusableElements = () => {
    const container = getContainer();
    if (!container) return [];
    
    // 可聚焦元素选择器
    const focusableSelector = [
      'a[href]',
      'area[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable]'
    ].join(',');
    
    // 查找并过滤隐藏元素
    return Array.from(container.querySelectorAll(focusableSelector))
      .filter(el => {
        const style = window.getComputedStyle(el);
        return !(el.offsetWidth <= 0 && el.offsetHeight <= 0) && 
          style.visibility !== 'hidden' && 
          style.display !== 'none';
      });
  };
  
  /**
   * 启用键盘导航陷阱
   * 防止焦点离开编辑器区域
   */
  const enableKeyboardTrap = () => {
    if (!keyboardNavigation) return;
    
    const container = getContainer();
    if (!container) return;
    
    a11yState.keyboardTrapActive = true;
    a11yState.focusableElements = findFocusableElements();
    
    // 添加键盘处理事件
    const handleTabKey = (e) => {
      // 如果不是Tab键或陷阱未激活，不处理
      if (e.key !== 'Tab' || !a11yState.keyboardTrapActive) return;
      
      // 重新查找可聚焦元素以确保是最最新的
      const focusableElements = findFocusableElements();
      if (focusableElements.length === 0) return;
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      // Shift+Tab从第一个元素向后循环
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } 
      // Tab从最后一个元素向前循环
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };
    
    container.addEventListener('keydown', handleTabKey);
    boundHandlers.set('keydown.trap', {
      element: container,
      type: 'keydown',
      handler: handleTabKey
    });
  };
  
  /**
   * 禁用键盘导航陷阱
   */
  const disableKeyboardTrap = () => {
    a11yState.keyboardTrapActive = false;
    
    // 移除键盘处理事件
    const trapHandler = boundHandlers.get('keydown.trap');
    if (trapHandler && trapHandler.element) {
      trapHandler.element.removeEventListener(trapHandler.type, trapHandler.handler);
      boundHandlers.delete('keydown.trap');
    }
  };
  
  /**
   * 处理键盘导航
   * @param {KeyboardEvent} e - 键盘事件
   */
  const handleKeyboardNavigation = (e) => {
    if (!keyboardNavigation) return;
    
    // 标记用户正在使用键盘导航
    a11yState.isNavigatingWithKeyboard = true;
    
    // 为编辑器容器添加键盘导航状态类
    const container = getContainer();
    if (container) {
      container.classList.add('keyboard-navigation');
      
      // 延迟移除状态类，除非继续使用键盘
      setTimeout(() => {
        a11yState.isNavigatingWithKeyboard = false;
        container.classList.remove('keyboard-navigation');
      }, 5000);
    }
    
    // 处理编辑器特定的键盘导航
    switch (e.key) {
      case 'Escape':
        // 可以实现特殊的Escape键处理
        break;
      case 'F10':
        if (e.shiftKey) {
          // 通常用于打开上下文菜单
          e.preventDefault();
          dispatch('accessibilityaction', e, { action: 'contextmenu' });
        }
        break;
    }
  };
  
  /**
   * 初始化容器的无障碍支持
   * @param {HTMLElement} container - 容器元素
   */
  const setupAccessibility = (container) => {
    if (!container) return;
    
    a11yState.container = container;
    
    // 设置基本ARIA属性
    setRole(container, ariaRole);
    
    // 如果是textbox角色，设置multiline属性
    if (ariaRole === 'textbox') {
      setAriaAttributes(container, { 'multiline': 'true' });
    }
    
    // 设置关联标签和描述
    if (labelledBy) {
      setAriaAttributes(container, { 'labelledby': labelledBy });
    }
    
    if (describedBy) {
      setAriaAttributes(container, { 'describedby': describedBy });
    }
    
    // 确保可聚焦
    if (!container.getAttribute('tabindex')) {
      container.setAttribute('tabindex', '0');
    }
    
    // 添加键盘导航支持
    if (keyboardNavigation) {
      const keydownHandler = (e) => {
        handleKeyboardNavigation(e);
        
        // 标准键盘命令处理
        if (e.key === 'Enter' && e.ctrlKey) {
          // Ctrl+Enter通常用于提交表单
          dispatch('accessibilityaction', e, { 
            action: 'submit'
          });
        } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.altKey) {
          // Alt+箭头通常用于段落导航
          dispatch('accessibilityaction', e, { 
            action: e.key === 'ArrowUp' ? 'prevparagraph' : 'nextparagraph',
            direction: e.key === 'ArrowUp' ? 'up' : 'down'
          });
          e.preventDefault();
        }
      };
      
      container.addEventListener('keydown', keydownHandler);
      boundHandlers.set('keydown.navigation', {
        element: container,
        type: 'keydown',
        handler: keydownHandler
      });
    }
    
    // 检测用户偏好并应用
    detectUserPreferences();
    applyUserPreferences();
    
    // 添加焦点跟踪
    const focusHandler = () => {
      a11yState.hasFocus = true;
      container.classList.add('a11y-focused');
    };
    
    const blurHandler = () => {
      a11yState.hasFocus = false;
      container.classList.remove('a11y-focused');
      a11yState.isNavigatingWithKeyboard = false;
    };
    
    container.addEventListener('focus', focusHandler);
    container.addEventListener('blur', blurHandler);
    
    boundHandlers.set('focus.a11y', {
      element: container,
      type: 'focus',
      handler: focusHandler
    });
    
    boundHandlers.set('blur.a11y', {
      element: container,
      type: 'blur',
      handler: blurHandler
    });
    
    // 监听鼠标移动切换为鼠标导航模式
    const mousemoveHandler = () => {
      if (a11yState.isNavigatingWithKeyboard) {
        a11yState.isNavigatingWithKeyboard = false;
        container.classList.remove('keyboard-navigation');
      }
    };
    
    container.addEventListener('mousemove', mousemoveHandler);
    boundHandlers.set('mousemove.a11y', {
      element: container,
      type: 'mousemove',
      handler: mousemoveHandler
    });
  };
  
  /**
   * 绑定无障碍事件处理
   */
  const bindA11yEvents = () => {
    const container = getContainer();
    if (!container) return;
    
    // 处理变化时宣告
    if (announceChanges && screenReaderSupport) {
      // 监听自定义内容变化事件
      const contentChangeHandler = (e) => {
        if (!e.detail) return;
        
        const { action, source } = e.detail;
        
        // 根据变化类型构建宣告消息
        let message = '';
        
        if (action === 'insert') {
          message = '内容已插入';
        } else if (action === 'delete') {
          message = '内容已删除';
        } else if (action === 'format') {
          message = '文本格式已更改';
        } else {
          message = '内容已更新';
        }
        
        // 宣告变化
        announce(message, { priority: 'polite' });
      };
      
      document.addEventListener('customContentChange', contentChangeHandler);
      boundHandlers.set('customContentChange.a11y', {
        element: document,
        type: 'customContentChange',
        handler: contentChangeHandler
      });
      
      // 监听选择变化事件
      const selectionChangeHandler = (e) => {
        if (!a11yState.hasFocus) return;
        
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        // 只有当选择不是折叠的(即有文本被选中)时才宣告
        if (!selection.isCollapsed && selection.toString().trim()) {
          announce(`已选择文本: ${selection.toString().substring(0, 50)}${selection.toString().length > 50 ? '...' : ''}`, {
            priority: 'polite',
            deduplicate: true
          });
        }
      };
      
      document.addEventListener('selectionchange', selectionChangeHandler);
      boundHandlers.set('selectionchange.a11y', {
        element: document,
        type: 'selectionchange',
        handler: selectionChangeHandler
      });
    }
  };
  
  /**
   * 解绑无障碍事件
   */
  const unbindA11yEvents = () => {
    boundHandlers.forEach(({ element, type, handler }) => {
      if (element && element.removeEventListener) {
        element.removeEventListener(type, handler);
      }
    });
    
    boundHandlers.clear();
  };
  
  /**
   * 获取辅助功能状态
   * @returns {Object} 辅助功能状态
   */
  const getA11yState = () => {
    return { ...a11yState };
  };
  
  /**
   * 清理资源
   */
  const cleanup = () => {
    unbindA11yEvents();
    disableKeyboardTrap();
    
    // 移除实时区域
    if (a11yState.liveRegion && document.body.contains(a11yState.liveRegion)) {
      document.body.removeChild(a11yState.liveRegion);
    }
    
    // 重置状态
    a11yState = {
      container: null,
      liveRegion: null,
      hasFocus: false,
      isNavigatingWithKeyboard: false,
      lastAnnouncedAction: null,
      lastAnnouncedTime: 0,
      userPreferences: {
        prefersReducedMotion: false,
        prefersHighContrast: false,
      },
      ariaAttributes: new Map(),
      focusableElements: [],
      keyboardTrapActive: false,
    };
  };
  
  // 返回公共API
  return {
    setupAccessibility,
    bindA11yEvents,
    unbindA11yEvents,
    announce,
    setAriaAttributes,
    setRole,
    enableKeyboardTrap,
    disableKeyboardTrap,
    getA11yState,
    cleanup,
    boundHandlers
  };
};