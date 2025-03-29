/**
 * 输入法(IME)组合文本处理模块
 * 用于处理中文、日文等需要输入法组合状态的文本输入
 * @module imeCompositionHandler
 */

/**
 * 创建输入法组合文本处理器
 * @param {Object} options - 配置项
 * @param {boolean} [options.enabled=true] - 是否启用组合文本处理
 * @param {Function} [options.dispatch=()=>{}] - 事件派发函数
 * @param {Function} [options.getState=()=>({})] - 获取状态的函数
 * @param {Function} [options.setState=()=>{}] - 设置状态的函数
 * @returns {Object} 组合文本处理器API
 */
export const createImeCompositionHandler = (options = {}) => {
  const {
    enabled = true,        // 是否启用组合文本处理
    dispatch = () => {},   // 事件派发函数
    getState = () => ({}), // 获取状态的函数
    setState = () => {}    // 设置状态的函数
  } = options;
  
  // 存储处理函数绑定的引用
  const boundHandlers = new Map();
  
  // 记录是否检测到Safari兼容性问题
  let isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  // 辅助状态，用于Safari兼容性
  let lastCompositionText = '';
  let compositionEndTimer = null;
  
  /**
   * 开始输入法组合
   * @param {CompositionEvent} event - 组合开始事件
   */
  const handleCompositionStart = (event) => {
    if (!enabled) return;
    
    try {
      // 清除任何待处理的定时器
      if (compositionEndTimer) {
        clearTimeout(compositionEndTimer);
        compositionEndTimer = null;
      }
      
      setState({
        isComposing: true,
        pendingComposition: event.data || ''
      });
      
      lastCompositionText = event.data || '';
      
      dispatch('compositionstart', event, {
        text: event.data || '',
        sourceEvent: 'compositionstart'
      });
    } catch (error) {
      console.error('IME组合开始处理失败:', error);
    }
  };
  
  /**
   * 更新输入法组合状态
   * @param {CompositionEvent} event - 组合更新事件
   */
  const handleCompositionUpdate = (event) => {
    if (!enabled) return;
    
    try {
      const compositionText = event.data || '';
      setState({
        pendingComposition: compositionText
      });
      
      lastCompositionText = compositionText;
      
      dispatch('compositionupdate', event, {
        text: compositionText,
        sourceEvent: 'compositionupdate'
      });
      
      // 将更新通知到自定义事件
      dispatch('customCompositionUpdate', event, {
        text: compositionText,
        isComposing: true
      });
    } catch (error) {
      console.error('IME组合更新处理失败:', error);
    }
  };
  
  /**
   * 结束输入法组合
   * @param {CompositionEvent} event - 组合结束事件
   */
  const handleCompositionEnd = (event) => {
    if (!enabled) return;
    
    try {
      const state = getState();
      // 优先使用event.data，如果为空则使用之前保存的pendingComposition
      const composedText = event.data || lastCompositionText || state.pendingComposition || '';
      
      // 优先处理组合结束事件，但延迟更新状态
      // 这是为了确保在Safari等浏览器中先派发compositionend再处理input事件
      dispatch('compositionend', event, {
        text: composedText,
        sourceEvent: 'compositionend'
      });
      
      // 在Safari中，compositionend后可能还有额外的input事件
      // 使用setTimeout确保所有相关事件都已处理
      compositionEndTimer = setTimeout(() => {
        setState({
          isComposing: false,
          pendingComposition: ''
        });
        
        // 清除辅助状态
        lastCompositionText = '';
        
        // 派发自定义事件，通知组合结束
        dispatch('customCompositionEnd', {
          bubbles: true,
          cancelable: true,
          composed: true
        }, {
          text: composedText,
          finalComposition: true
        });
      }, isSafari ? 10 : 0);
      
      // 触发一个合成的input事件，确保组合文本被处理
      // 这对于自定义编辑器尤为重要
      const syntheticInputEvent = {
        bubbles: true,
        cancelable: true,
        composed: true,
        synthetic: true,
        inputType: 'insertCompositionText',
        data: composedText
      };
      
      dispatch('input', syntheticInputEvent, {
        text: composedText,
        isComposed: true,
        inputType: 'insertCompositionText',
        sourceEvent: 'compositionend'
      });
    } catch (error) {
      console.error('IME组合结束处理失败:', error);
      // 即使出错也尝试重置状态
      setState({
        isComposing: false,
        pendingComposition: ''
      });
    }
  };
  
  /**
   * 取消输入法组合
   * @param {Event} [event] - 触发取消的事件
   */
  const handleCompositionCancel = (event) => {
    if (!enabled) return;
    
    try {
      const state = getState();
      
      // 只有在组合状态时才处理取消
      if (!state.isComposing) return;
      
      setState({
        isComposing: false,
        pendingComposition: ''
      });
      
      // 清除辅助状态
      lastCompositionText = '';
      
      // 通知组合被取消
      dispatch('compositioncancel', event || {}, {
        wasCancelled: true,
        previousText: state.pendingComposition || ''
      });
    } catch (error) {
      console.error('IME组合取消处理失败:', error);
      // 即使出错也尝试重置状态
      setState({
        isComposing: false,
        pendingComposition: ''
      });
    }
  };
  
  /**
   * 处理输入事件
   * @param {InputEvent} event - 输入事件
   */
  const handleTextInput = (event) => {
    try {
      const state = getState();
      
      // 如果处于IME组合状态，记录但不直接处理
      if (state.isComposing) {
        // 在组合状态中，更新暂存的文本
        // 但通常此时应该由compositionupdate处理
        if (event.data) {
          setState({
            pendingComposition: event.data
          });
          lastCompositionText = event.data;
        }
        return;
      }
      
      // 派发文本输入事件
      dispatch('textinput', event, {
        text: event.data || '',
        inputType: event.inputType || 'insertText',
        sourceEvent: 'input'
      });
    } catch (error) {
      console.error('文本输入处理失败:', error);
    }
  };
  
  /**
   * 手动同步组合状态
   * 用于外部强制同步IME状态（如在粘贴或其他操作后）
   */
  const syncCompositionState = () => {
    try {
      const state = getState();
      
      // 如果正在组合但实际上应该已结束
      if (state.isComposing) {
        const selection = window.getSelection();
        // 检查是否有选区，如果有选区可能意味着组合已结束
        if (selection && selection.rangeCount > 0) {
          setState({
            isComposing: false,
            pendingComposition: ''
          });
          lastCompositionText = '';
        }
      }
    } catch (error) {
      console.error('同步组合状态失败:', error);
    }
  };
  
  /**
   * 绑定输入法相关事件到容器
   * @param {HTMLElement} container - 要绑定的容器元素
   * @param {Object} [options={}] - 绑定选项
   */
  const bindEvents = (container, options = {}) => {
    if (!container || !enabled) return;
    
    try {
      // 绑定组合事件
      container.addEventListener('compositionstart', handleCompositionStart);
      container.addEventListener('compositionupdate', handleCompositionUpdate);
      container.addEventListener('compositionend', handleCompositionEnd);
      container.addEventListener('input', handleTextInput);
      
      // 存储引用以便后续解绑
      boundHandlers.set('compositionstart', {
        element: container,
        type: 'compositionstart',
        handler: handleCompositionStart,
        options: {}
      });
      
      boundHandlers.set('compositionupdate', {
        element: container,
        type: 'compositionupdate',
        handler: handleCompositionUpdate,
        options: {}
      });
      
      boundHandlers.set('compositionend', {
        element: container,
        type: 'compositionend',
        handler: handleCompositionEnd,
        options: {}
      });
      
      boundHandlers.set('input', {
        element: container,
        type: 'input',
        handler: handleTextInput,
        options: {}
      });
    } catch (error) {
      console.error('绑定IME事件失败:', error);
    }
  };
  
  /**
   * 判断是否正在进行组合输入
   * @returns {boolean} 是否正在组合
   */
  const isComposing = () => {
    try {
      const state = getState();
      return state.isComposing || false;
    } catch (error) {
      console.error('检查组合状态失败:', error);
      return false;
    }
  };
  
  /**
   * 获取当前组合中的文本
   * @returns {string} 组合中的文本
   */
  const getPendingText = () => {
    try {
      const state = getState();
      return state.pendingComposition || '';
    } catch (error) {
      console.error('获取组合文本失败:', error);
      return '';
    }
  };
  
  /**
   * 清理绑定的事件处理器
   */
  const cleanup = () => {
    try {
      if (compositionEndTimer) {
        clearTimeout(compositionEndTimer);
        compositionEndTimer = null;
      }
      
      boundHandlers.forEach(({ element, type, handler, options }) => {
        if (element && typeof element.removeEventListener === 'function') {
          element.removeEventListener(type, handler, options);
        }
      });
      
      boundHandlers.clear();
      
      // 重置状态
      setState({
        isComposing: false,
        pendingComposition: ''
      });
      
      lastCompositionText = '';
    } catch (error) {
      console.error('清理IME处理器失败:', error);
    }
  };
  
  return {
    bindEvents,
    cleanup,
    isComposing,
    getPendingText,
    handleCompositionStart,
    handleCompositionUpdate,
    handleCompositionEnd,
    handleCompositionCancel,  // 新增：取消组合处理
    handleTextInput,
    syncCompositionState,     // 新增：手动同步状态
    boundHandlers
  };
}; 