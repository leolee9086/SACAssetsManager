/**
 * 键盘事件处理模块
 * 负责处理基础键盘输入事件，与文本编辑相关的键盘交互
 * @module keyboardEventHandler
 */

/**
 * 创建键盘事件处理器
 * @param {Object} options - 配置选项
 * @param {Function} options.dispatch - 事件分发函数
 * @param {Function} options.getContainer - 获取容器元素的函数
 * @param {boolean} [options.preventDefault=true] - 是否阻止默认行为
 * @param {boolean} [options.enabled=true] - 是否启用键盘事件处理
 * @param {Object} [options.shortcutManager=null] - 快捷键管理器引用
 * @param {Object} [options.imeHandler=null] - 输入法处理器引用
 * @param {Function} [options.updateState=()=>{}] - 更新状态的函数
 * @param {Function} [options.errorHandler=console.error] - 错误处理函数
 * @param {Object} [options.customKeyMap={}] - 自定义键码映射
 * @param {number} [options.repeatDelay=500] - 按键重复延迟(ms)
 * @param {number} [options.repeatInterval=50] - 按键重复间隔(ms)
 * @returns {Object} 键盘事件处理API
 */
export const createKeyboardEventHandler = (options = {}) => {
  const {
    dispatch,                  // 事件分发函数
    getContainer,              // 获取容器元素的函数
    preventDefault = true,     // 是否阻止默认行为
    enabled = true,            // 是否启用键盘事件处理
    shortcutManager = null,    // 快捷键管理器引用
    imeHandler = null,         // 输入法处理器引用
    updateState = () => {},    // 更新状态的函数
    errorHandler = console.error,  // 错误处理函数
    customKeyMap = {},         // 自定义键码映射
    repeatDelay = 500,         // 按键重复延迟(ms)
    repeatInterval = 50,       // 按键重复间隔(ms)
  } = options;

  // 存储绑定的事件处理函数引用
  const boundHandlers = new Map();
  
  // 按键重复状态
  let keyRepeatTimer = null;
  let activeRepeatKey = null;
  
  // 记录最后按下的键
  let lastKeyPressed = null;
  let lastKeyTime = 0;
  
  // 特殊键码映射
  const KeyCodes = {
    BACKSPACE: 8,
    TAB: 9,
    ENTER: 13,
    SHIFT: 16,
    CTRL: 17,
    ALT: 18,
    PAUSE: 19,
    CAPS_LOCK: 20,
    ESCAPE: 27,
    SPACE: 32,
    PAGE_UP: 33,
    PAGE_DOWN: 34,
    END: 35,
    HOME: 36,
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    INSERT: 45,
    DELETE: 46,
    META: 91,
    F1: 112,
    F2: 113,
    F3: 114,
    F4: 115,
    F5: 116,
    F6: 117,
    F7: 118,
    F8: 119,
    F9: 120,
    F10: 121,
    F11: 122,
    F12: 123,
    NUM_LOCK: 144,
    SCROLL_LOCK: 145,
    SEMICOLON: 186,
    EQUAL: 187,
    COMMA: 188,
    DASH: 189,
    PERIOD: 190,
    FORWARD_SLASH: 191,
    GRAVE_ACCENT: 192,
    OPEN_BRACKET: 219,
    BACK_SLASH: 220,
    CLOSE_BRACKET: 221,
    SINGLE_QUOTE: 222,
    // 合并自定义键码映射
    ...customKeyMap
  };

  // 常用字符键的范围
  const isCharacterKey = (keyCode) => {
    return (keyCode >= 48 && keyCode <= 90) ||  // 0-9, A-Z
           (keyCode >= 96 && keyCode <= 111) || // 小键盘
           (keyCode >= 186 && keyCode <= 222);  // 特殊字符
  };
  
  // 判断是否为编辑键
  const isEditingKey = (keyCode) => {
    return keyCode === KeyCodes.BACKSPACE || 
           keyCode === KeyCodes.DELETE || 
           keyCode === KeyCodes.ENTER;
  };
  
  // 判断是否为修饰键
  const isModifierKey = (keyCode) => {
    return keyCode === KeyCodes.SHIFT || 
           keyCode === KeyCodes.CTRL || 
           keyCode === KeyCodes.ALT || 
           keyCode === KeyCodes.META;
  };
  
  // 判断是否为导航键
  const isNavigationKey = (keyCode) => {
    return (keyCode >= KeyCodes.LEFT && keyCode <= KeyCodes.DOWN) || 
           keyCode === KeyCodes.HOME || 
           keyCode === KeyCodes.END || 
           keyCode === KeyCodes.PAGE_UP || 
           keyCode === KeyCodes.PAGE_DOWN;
  };

  /**
   * 启动按键重复
   * @param {number} keyCode - 键码
   * @param {Object} eventData - 事件数据
   */
  const startKeyRepeat = (keyCode, eventData) => {
    // 只对导航和编辑键启用重复
    if (!isNavigationKey(keyCode) && !isEditingKey(keyCode)) return;
    
    // 清除任何现有的重复定时器
    clearKeyRepeat();
    
    // 记录当前重复的键
    activeRepeatKey = { keyCode, eventData };
    
    // 设置初始延迟
    keyRepeatTimer = setTimeout(() => {
      // 第一次重复后，以较短的间隔继续重复
      keyRepeatTimer = setInterval(() => {
        if (!activeRepeatKey) return;
        
        // 根据键类型触发特定重复事件
        if (isNavigationKey(keyCode)) {
          dispatch('navigationRepeat', { keyCode }, eventData);
        } else if (isEditingKey(keyCode)) {
          const editEvents = {
            [KeyCodes.BACKSPACE]: 'backspaceRepeat',
            [KeyCodes.DELETE]: 'deleteRepeat',
            [KeyCodes.ENTER]: 'enterRepeat'
          };
          dispatch(editEvents[keyCode] || 'keyRepeat', { keyCode }, eventData);
        }
      }, repeatInterval);
    }, repeatDelay);
  };
  
  /**
   * 清除按键重复
   */
  const clearKeyRepeat = () => {
    if (keyRepeatTimer) {
      clearTimeout(keyRepeatTimer);
      clearInterval(keyRepeatTimer);
      keyRepeatTimer = null;
    }
    activeRepeatKey = null;
  };

  /**
   * 处理键盘按下事件
   * @param {KeyboardEvent} event - 键盘事件对象
   */
  const handleKeyDown = (event) => {
    if (!enabled) return;
    
    try {
      // 获取按键信息
      const keyCode = event.keyCode || event.which;
      const key = event.key;
      const isChar = isCharacterKey(keyCode);
      const isModifier = isModifierKey(keyCode);
      
      // 记录按键时间，用于双击检测
      const now = Date.now();
      const isDoublePress = key === lastKeyPressed && (now - lastKeyTime) < 300;
      lastKeyPressed = key;
      lastKeyTime = now;
      
      // 更新最后按下的键
      updateState({ lastKeyPressed: key });
      
      // 检查是否被快捷键管理器处理
      if (shortcutManager && typeof shortcutManager.handleKeyDown === 'function' && 
          shortcutManager.handleKeyDown(event)) {
        return; // 已被快捷键管理器处理
      }
      
      // 处理组合输入法状态
      if (imeHandler && typeof imeHandler.isComposing === 'function' && 
          imeHandler.isComposing()) {
        // 组合输入期间，大多数按键应该交给IME处理
        if (keyCode === KeyCodes.ESCAPE) {
          // ESC键可能用于取消组合输入
          imeHandler.handleCompositionCancel(event);
          if (preventDefault) event.preventDefault();
        }
        return;
      }
      
      // 处理特殊功能键
      const handled = handleSpecialKey(event, keyCode);
      
      // 处理字符输入
      if (!handled && isChar && !event.ctrlKey && !event.altKey && !event.metaKey) {
        handleCharacterInput(event, key);
      }
      
      // 如果是可重复的键，启动重复机制
      if (!isModifier) {
        startKeyRepeat(keyCode, {
          key,
          isChar,
          isCtrl: event.ctrlKey,
          isShift: event.shiftKey,
          isAlt: event.altKey,
          isMeta: event.metaKey,
          isDoublePress
        });
      }
      
      // 向外部分发规范化的事件
      dispatch('keyDown', event, {
        key,
        keyCode,
        isChar,
        isModifier,
        isCtrl: event.ctrlKey,
        isShift: event.shiftKey,
        isAlt: event.altKey,
        isMeta: event.metaKey,
        isDoublePress,
        isRepeat: event.repeat
      });
    } catch (err) {
      errorHandler('处理键盘按下事件失败', err);
    }
  };

  /**
   * 处理特殊键的按下
   * @param {KeyboardEvent} event - 键盘事件对象
   * @param {number} keyCode - 键码
   * @returns {boolean} 是否处理了特殊键
   */
  const handleSpecialKey = (event, keyCode) => {
    try {
      switch (keyCode) {
        case KeyCodes.BACKSPACE:
          dispatch('backspace', event, { 
            isCtrl: event.ctrlKey,
            isAlt: event.altKey,
            isShift: event.shiftKey,
            deleteWordBackward: event.ctrlKey
          });
          if (preventDefault) event.preventDefault();
          return true;
          
        case KeyCodes.DELETE:
          dispatch('delete', event, { 
            isCtrl: event.ctrlKey,
            isAlt: event.altKey,
            isShift: event.shiftKey,
            deleteWordForward: event.ctrlKey
          });
          if (preventDefault) event.preventDefault();
          return true;
          
        case KeyCodes.ENTER:
          dispatch('enter', event, { 
            isShift: event.shiftKey,
            isCtrl: event.ctrlKey,
            isAlt: event.altKey,
            shouldCreateNewLine: event.shiftKey || !event.ctrlKey,
            shouldSubmit: event.ctrlKey && !event.shiftKey && !event.altKey
          });
          if (preventDefault) event.preventDefault();
          return true;
          
        case KeyCodes.TAB:
          dispatch('tab', event, { 
            isShift: event.shiftKey,
            isIndent: !event.shiftKey,
            isOutdent: event.shiftKey
          });
          if (preventDefault) event.preventDefault();
          return true;
          
        // 导航键 (左右上下/Home/End/PageUp/PageDown)
        case KeyCodes.LEFT:
        case KeyCodes.RIGHT:
        case KeyCodes.UP:
        case KeyCodes.DOWN:
        case KeyCodes.HOME:
        case KeyCodes.END:
        case KeyCodes.PAGE_UP:
        case KeyCodes.PAGE_DOWN:
          const directionMap = {
            [KeyCodes.LEFT]: 'left',
            [KeyCodes.RIGHT]: 'right',
            [KeyCodes.UP]: 'up',
            [KeyCodes.DOWN]: 'down',
            [KeyCodes.HOME]: 'home',
            [KeyCodes.END]: 'end',
            [KeyCodes.PAGE_UP]: 'pageUp',
            [KeyCodes.PAGE_DOWN]: 'pageDown'
          };
          
          const moveByWord = (keyCode === KeyCodes.LEFT || keyCode === KeyCodes.RIGHT) && event.ctrlKey;
          const moveToDocumentBoundary = (keyCode === KeyCodes.HOME || keyCode === KeyCodes.END) && event.ctrlKey;
          
          dispatch('navigation', event, {
            direction: directionMap[keyCode],
            isShift: event.shiftKey,
            isCtrl: event.ctrlKey,
            isAlt: event.altKey,
            moveByWord,
            moveToDocumentBoundary,
            extendSelection: event.shiftKey
          });
          
          // 对于导航操作，只在选取变更或按住Control键时阻止默认行为
          if ((event.shiftKey || event.ctrlKey) && preventDefault) {
            event.preventDefault();
          }
          return true;
          
        // 特殊编辑操作
        case KeyCodes.SPACE:
          if (event.ctrlKey || event.altKey || event.metaKey) {
            // 如果按下了修饰键，可能是特殊快捷键
            return false;
          }
          dispatch('space', event);
          return true;
          
        case KeyCodes.ESCAPE:
          dispatch('escape', event);
          return true;
          
        // 常用编辑快捷键
        default:
          // 处理常见的编辑组合键 (Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z)
          if (event.ctrlKey || event.metaKey) {
            const cmdKey = String.fromCharCode(keyCode).toLowerCase();
            const shortcutMap = {
              'a': 'selectAll',
              'c': 'copy',
              'v': 'paste',
              'x': 'cut',
              'z': event.shiftKey ? 'redo' : 'undo',
              'y': 'redo',
              'b': 'bold',
              'i': 'italic',
              'u': 'underline'
            };
            
            if (shortcutMap[cmdKey]) {
              dispatch(shortcutMap[cmdKey], event);
              if (preventDefault) event.preventDefault();
              return true;
            }
          }
          return false;
      }
    } catch (err) {
      errorHandler('处理特殊键失败', err);
      return false;
    }
  };

  /**
   * 处理字符键的输入
   * @param {KeyboardEvent} event - 键盘事件对象
   * @param {string} char - 输入的字符
   */
  const handleCharacterInput = (event, char) => {
    try {
      // 对于字符键输入，通常应该让默认的编辑行为发生
      // 但我们仍然分发事件以便监听
      dispatch('characterInput', event, { 
        char,
        isShift: event.shiftKey
      });
    } catch (err) {
      errorHandler('处理字符输入失败', err);
    }
  };

  /**
   * 处理键盘抬起事件
   * @param {KeyboardEvent} event - 键盘事件对象
   */
  const handleKeyUp = (event) => {
    if (!enabled) return;
    
    try {
      const keyCode = event.keyCode || event.which;
      const key = event.key;
      
      // 清除按键重复
      clearKeyRepeat();
      
      // 检查是否被快捷键管理器处理
      if (shortcutManager && typeof shortcutManager.handleKeyUp === 'function' && 
          shortcutManager.handleKeyUp(event)) {
        return; // 已被快捷键管理器处理
      }
      
      // 向外部分发规范化的事件
      dispatch('keyUp', event, {
        key,
        keyCode,
        isCtrl: event.ctrlKey,
        isShift: event.shiftKey,
        isAlt: event.altKey,
        isMeta: event.metaKey
      });
    } catch (err) {
      errorHandler('处理键盘抬起事件失败', err);
    }
  };

  /**
   * 处理键盘按下并抬起事件
   * @param {KeyboardEvent} event - 键盘事件对象
   */
  const handleKeyPress = (event) => {
    if (!enabled) return;
    
    try {
      // 大多数浏览器已经不推荐使用keypress事件
      // 但为了兼容性，我们仍然处理它
      const char = String.fromCharCode(event.charCode || event.which);
      
      dispatch('keyPress', event, { char });
      
      // 通常不阻止默认行为，让浏览器处理字符输入
    } catch (err) {
      errorHandler('处理按键事件失败', err);
    }
  };

  /**
   * 处理输入事件
   * @param {InputEvent} event - 输入事件对象
   */
  const handleInput = (event) => {
    if (!enabled) return;
    
    try {
      // 如果是组合输入过程中，交由IME处理器处理
      if (imeHandler && typeof imeHandler.isComposing === 'function' && 
          imeHandler.isComposing()) {
        return;
      }
      
      // 输入事件包含的数据
      const inputType = event.inputType || '';
      const data = event.data || '';
      
      // 根据inputType细分不同类型的输入操作
      const inputTypeMap = {
        'insertText': 'textInput',
        'insertReplacementText': 'textReplace',
        'insertLineBreak': 'insertLineBreak',
        'insertParagraph': 'insertParagraph',
        'deleteContentBackward': 'backspaceInput',
        'deleteContentForward': 'deleteInput',
        'deleteWordBackward': 'deleteWordBackward',
        'deleteWordForward': 'deleteWordForward',
        'deleteByCut': 'cut',
        'insertFromPaste': 'paste',
        'insertFromDrop': 'drop',
        'historyUndo': 'undo',
        'historyRedo': 'redo',
        'formatBold': 'bold',
        'formatItalic': 'italic',
        'formatUnderline': 'underline'
        // 可以根据需要添加更多映射
      };
      
      const eventType = inputTypeMap[inputType] || 'input';
      
      dispatch(eventType, event, {
        inputType,
        data,
        isComposing: event.isComposing
      });
    } catch (err) {
      errorHandler('处理输入事件失败', err);
    }
  };

  /**
   * 处理before input事件
   * @param {InputEvent} event - before input事件对象
   */
  const handleBeforeInput = (event) => {
    if (!enabled) return;
    
    try {
      const inputType = event.inputType || '';
      const data = event.data || '';
      
      // 对于特定的输入类型可能需要拦截和处理
      const shouldPreventDefault = dispatch('beforeInput', event, {
        inputType,
        data,
        isComposing: event.isComposing,
        // 提供取消默认行为的能力
        getTargetRanges: () => {
          try {
            return event.getTargetRanges ? Array.from(event.getTargetRanges()) : [];
          } catch (e) {
            return [];
          }
        }
      });
      
      // 如果返回true，则阻止默认行为
      if (shouldPreventDefault && preventDefault) {
        event.preventDefault();
      }
    } catch (err) {
      errorHandler('处理beforeInput事件失败', err);
    }
  };

  /**
   * 处理组合输入开始事件
   * @param {CompositionEvent} event - 组合事件对象
   */
  const handleCompositionStart = (event) => {
    if (!enabled || !imeHandler) return;
    
    try {
      imeHandler.handleCompositionStart(event);
    } catch (err) {
      errorHandler('处理组合输入开始事件失败', err);
    }
  };

  /**
   * 处理组合输入更新事件
   * @param {CompositionEvent} event - 组合事件对象
   */
  const handleCompositionUpdate = (event) => {
    if (!enabled || !imeHandler) return;
    
    try {
      imeHandler.handleCompositionUpdate(event);
    } catch (err) {
      errorHandler('处理组合输入更新事件失败', err);
    }
  };

  /**
   * 处理组合输入结束事件
   * @param {CompositionEvent} event - 组合事件对象
   */
  const handleCompositionEnd = (event) => {
    if (!enabled || !imeHandler) return;
    
    try {
      imeHandler.handleCompositionEnd(event);
    } catch (err) {
      errorHandler('处理组合输入结束事件失败', err);
    }
  };

  /**
   * 绑定键盘相关事件
   * @param {HTMLElement} container - 容器元素
   */
  const bindEvents = (container) => {
    if (!container || !enabled) return;
    
    try {
      // 绑定键盘事件
      container.addEventListener('keydown', handleKeyDown, false);
      boundHandlers.set('keydown', {
        element: container,
        type: 'keydown',
        handler: handleKeyDown,
        options: false
      });
      
      container.addEventListener('keyup', handleKeyUp, false);
      boundHandlers.set('keyup', {
        element: container,
        type: 'keyup',
        handler: handleKeyUp,
        options: false
      });
      
      container.addEventListener('keypress', handleKeyPress, false);
      boundHandlers.set('keypress', {
        element: container,
        type: 'keypress',
        handler: handleKeyPress,
        options: false
      });
      
      // 绑定输入事件
      container.addEventListener('input', handleInput, false);
      boundHandlers.set('input', {
        element: container,
        type: 'input',
        handler: handleInput,
        options: false
      });
      
      // 绑定beforeinput事件（现代浏览器支持）
      if ('InputEvent' in window && typeof InputEvent.prototype.getTargetRanges === 'function') {
        container.addEventListener('beforeinput', handleBeforeInput, false);
        boundHandlers.set('beforeinput', {
          element: container,
          type: 'beforeinput',
          handler: handleBeforeInput,
          options: false
        });
      }
      
      // 绑定组合输入事件
      container.addEventListener('compositionstart', handleCompositionStart, false);
      boundHandlers.set('compositionstart', {
        element: container,
        type: 'compositionstart',
        handler: handleCompositionStart,
        options: false
      });
      
      container.addEventListener('compositionupdate', handleCompositionUpdate, false);
      boundHandlers.set('compositionupdate', {
        element: container,
        type: 'compositionupdate',
        handler: handleCompositionUpdate,
        options: false
      });
      
      container.addEventListener('compositionend', handleCompositionEnd, false);
      boundHandlers.set('compositionend', {
        element: container,
        type: 'compositionend',
        handler: handleCompositionEnd,
        options: false
      });
    } catch (err) {
      errorHandler('键盘事件绑定失败', err);
    }
  };

  /**
   * 模拟键盘事件
   * @param {string} type - 事件类型 (keydown/keyup/keypress)
   * @param {Object} options - 事件选项
   * @returns {boolean} 是否成功模拟
   */
  const simulateKeyEvent = (type, options = {}) => {
    const container = getContainer();
    if (!container) return false;
    
    try {
      const {
        key = '',
        keyCode = 0,
        code = '',
        ctrlKey = false,
        shiftKey = false,
        altKey = false,
        metaKey = false,
        repeat = false
      } = options;
      
      // 创建键盘事件
      const event = new KeyboardEvent(type, {
        key,
        keyCode,
        code,
        ctrlKey,
        shiftKey,
        altKey,
        metaKey,
        repeat,
        bubbles: true,
        cancelable: true
      });
      
      // 触发事件
      container.dispatchEvent(event);
      
      // 如果是keydown事件，可能需要触发input事件
      if (type === 'keydown' && isCharacterKey(keyCode) && 
          !ctrlKey && !altKey && !metaKey) {
        // 模拟输入事件
        const inputEvent = new InputEvent('input', {
          data: key,
          inputType: 'insertText',
          bubbles: true,
          cancelable: true
        });
        container.dispatchEvent(inputEvent);
      }
      
      return true;
    } catch (err) {
      errorHandler('模拟键盘事件失败', err);
      return false;
    }
  };

  /**
   * 清理资源
   */
  const cleanup = () => {
    // 清除按键重复
    clearKeyRepeat();
    
    // 解绑所有事件
    boundHandlers.forEach(({ element, type, handler, options }) => {
      if (element && typeof element.removeEventListener === 'function') {
        element.removeEventListener(type, handler, options);
      }
    });
    boundHandlers.clear();
  };

  /**
   * 获取键盘处理器状态
   * @returns {Object} 键盘处理器状态
   */
  const getState = () => {
    return {
      lastKeyPressed,
      lastKeyTime,
      hasActiveRepeatKey: !!activeRepeatKey,
      isEnabled: enabled
    };
  };

  // 返回公共API
  return {
    bindEvents,
    simulateKeyEvent,
    cleanup,
    getState,
    boundHandlers,
    KEY_CODES: KeyCodes
  };
}; 