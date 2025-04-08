/**
 * useInputEvents.js
 * 提供浏览器输入事件的常量定义和处理函数
 * 包括键盘、输入法、触摸等事件的处理
 */

// 物理事件分组
export const PHYSICAL_EVENTS = {
    // 键盘物理事件
    KEYBOARD: {
        KEY_DOWN: 'keydown',
        KEY_UP: 'keyup',
        KEY_PRESS: 'keypress'
    },
    
    // 输入法物理事件
    IME: {
        COMPOSITION_START: 'compositionstart',
        COMPOSITION_UPDATE: 'compositionupdate',
        COMPOSITION_END: 'compositionend'
    },
    
    // 触摸物理事件
    TOUCH: {
        TOUCH_START: 'touchstart',
        TOUCH_END: 'touchend',
        TOUCH_MOVE: 'touchmove',
        TOUCH_CANCEL: 'touchcancel'
    },
    
    // 鼠标物理事件
    MOUSE: {
        MOUSE_DOWN: 'mousedown',
        MOUSE_UP: 'mouseup',
        MOUSE_MOVE: 'mousemove',
        MOUSE_ENTER: 'mouseenter',
        MOUSE_LEAVE: 'mouseleave',
        CLICK: 'click',
        DBLCLICK: 'dblclick',
        CONTEXT_MENU: 'contextmenu',
        WHEEL: 'wheel'
    },
    
    // 指针事件 (统一触摸和鼠标)
    POINTER: {
        POINTER_DOWN: 'pointerdown',
        POINTER_UP: 'pointerup',
        POINTER_MOVE: 'pointermove',
        POINTER_ENTER: 'pointerenter',
        POINTER_LEAVE: 'pointerleave',
        POINTER_CANCEL: 'pointercancel'
    }
};

// 逻辑事件分组(组合物理事件)
export const TYPING_EVENTS = {
    // 键盘相关
    KEY_DOWN: PHYSICAL_EVENTS.KEYBOARD.KEY_DOWN,
    按键按下: PHYSICAL_EVENTS.KEYBOARD.KEY_DOWN,
    
    KEY_UP: PHYSICAL_EVENTS.KEYBOARD.KEY_UP,
    按键释放: PHYSICAL_EVENTS.KEYBOARD.KEY_UP,
    
    KEY_PRESS: PHYSICAL_EVENTS.KEYBOARD.KEY_PRESS,
    按键按压: PHYSICAL_EVENTS.KEYBOARD.KEY_PRESS,
    
    // 输入相关
    INPUT: 'input',
    输入: 'input',
    
    // 选择相关
    SELECT: 'select',
    文本选中: 'select',
    
    SELECTION_CHANGE: 'selectionchange', // 选择区域变化
    选择变化: 'selectionchange',
    COPY: 'copy',                // 复制
    复制: 'copy',
    CUT: 'cut',                  // 剪切
    剪切: 'cut',
    PASTE: 'paste',              // 粘贴
    粘贴: 'paste',
    COMPOSITION_START: 'compositionstart',  // 开始组合输入
    开始组合输入: 'compositionstart',
    COMPOSITION_UPDATE: 'compositionupdate', // 组合输入更新
    组合输入更新: 'compositionupdate',
    COMPOSITION_END: 'compositionend',       // 结束组合输入
    结束组合输入: 'compositionend',
    CHANGE: 'change',            // 值变化并失去焦点
    值变更: 'change',
    FOCUS: 'focus',              // 获得焦点
    获得焦点: 'focus',
    BLUR: 'blur',                // 失去焦点
    失去焦点: 'blur',
    TOUCH_START: 'touchstart',   // 触摸开始
    触摸开始: 'touchstart',
    TOUCH_END: 'touchend',       // 触摸结束
    触摸结束: 'touchend',
    KEY_HOLD: 'keyhold',         // 按键长按(需自定义实现)
    按键长按: 'keyhold'
};

// 特殊键代码常量
export const KEY_CODES = {
    ENTER: 'Enter',
    TAB: 'Tab',
    ESCAPE: 'Escape',
    SPACE: ' ',
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    BACKSPACE: 'Backspace',
    DELETE: 'Delete',
    CONTROL: 'Control',
    ALT: 'Alt',
    SHIFT: 'Shift',
    META: 'Meta'
};

/**
 * 添加事件监听器
 * @param {Element|Document|Window} target - 事件目标
 * @param {string} eventType - 事件类型
 * @param {Function} handler - 事件处理函数
 * @param {boolean|object} options - 事件选项 (可选)
 * @returns {Function} - 移除监听器的函数
 */
export const useAddEventListener = (target, eventType, handler, options = false) => {
    if (!target || !eventType || typeof handler !== 'function') return () => {};
    
    target.addEventListener(eventType, handler, options);
    
    // 返回移除事件的函数
    return () => {
        target.removeEventListener(eventType, handler, options);
    };
};

/**
 * 一次性事件监听器 (事件触发后自动移除)
 * @param {Element|Document|Window} target - 事件目标
 * @param {string} eventType - 事件类型
 * @param {Function} handler - 事件处理函数
 * @param {boolean|object} options - 事件选项 (可选)
 */
export const useOnceEventListener = (target, eventType, handler, options = false) => {
    if (!target || !eventType || typeof handler !== 'function') return;
    
    const onceHandler = (event) => {
        handler(event);
        target.removeEventListener(eventType, onceHandler, options);
    };
    
    target.addEventListener(eventType, onceHandler, options);
};

/**
 * 检测是否为修饰键事件
 * @param {KeyboardEvent} event - 键盘事件
 * @returns {boolean} - 是否为修饰键
 */
export const isModifierKey = (event) => {
    return event.ctrlKey || event.altKey || event.shiftKey || event.metaKey;
};

/**
 * 创建按键长按事件处理
 * @param {Element} element - 目标元素
 * @param {string} key - 要监听的按键
 * @param {Function} callback - 长按触发的回调
 * @param {number} delay - 触发长按的延迟时间(毫秒)
 * @param {number} interval - 长按期间重复触发的间隔(毫秒)
 * @returns {object} - 包含启动和停止长按监听的方法
 */
export const useKeyHold = (element, key, callback, delay = 500, interval = 50) => {
    if (!element || typeof callback !== 'function') {
        return { start: () => {}, stop: () => {} };
    }
    
    let timer = null;
    let intervalTimer = null;
    let isHolding = false;
    
    const handleKeyDown = (event) => {
        if (event.key === key && !isHolding) {
            timer = setTimeout(() => {
                isHolding = true;
                callback(event);
                
                // 设置定时器以按指定间隔重复触发
                intervalTimer = setInterval(() => {
                    callback(event);
                }, interval);
            }, delay);
        }
    };
    
    const handleKeyUp = (event) => {
        if (event.key === key) {
            clearTimeout(timer);
            clearInterval(intervalTimer);
            isHolding = false;
        }
    };
    
    const start = () => {
        element.addEventListener(PHYSICAL_EVENTS.KEYBOARD.KEY_DOWN, handleKeyDown);
        element.addEventListener(PHYSICAL_EVENTS.KEYBOARD.KEY_UP, handleKeyUp);
    };
    
    const stop = () => {
        element.removeEventListener(PHYSICAL_EVENTS.KEYBOARD.KEY_DOWN, handleKeyDown);
        element.removeEventListener(PHYSICAL_EVENTS.KEYBOARD.KEY_UP, handleKeyUp);
        clearTimeout(timer);
        clearInterval(intervalTimer);
        isHolding = false;
    };
    
    return { start, stop };
};

/**
 * 创建防止中文输入法组合期间触发的输入处理器
 * @param {Function} callback - 输入完成后的回调函数
 * @returns {object} - 包含事件处理方法
 */
export const useInputWithIME = (callback) => {
    if (typeof callback !== 'function') {
        return {
            handleCompositionStart: () => {},
            handleCompositionEnd: () => {},
            handleInput: () => {}
        };
    }
    
    let isComposing = false;
    let pendingInput = null;
    
    const handleCompositionStart = () => {
        isComposing = true;
    };
    
    const handleCompositionEnd = (event) => {
        isComposing = false;
        
        // 如果有待处理的输入，现在处理它
        if (pendingInput) {
            callback(pendingInput);
            pendingInput = null;
        } else {
            callback(event);
        }
    };
    
    const handleInput = (event) => {
        if (isComposing) {
            // 输入法组合期间，将输入事件存储起来，不立即处理
            pendingInput = event;
            return;
        }
        
        callback(event);
    };
    
    return {
        handleCompositionStart,
        handleCompositionEnd,
        handleInput
    };
};

/**
 * 创建防抖输入处理器
 * @param {Function} callback - 处理输入的回调
 * @param {number} delay - 延迟时间(毫秒)
 * @returns {Function} - 防抖处理函数
 */
export const useDebounceInput = (callback, delay = 300) => {
    if (typeof callback !== 'function') return () => {};
    
    let timeout = null;
    
    return (event) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            callback(event);
        }, delay);
    };
};

/**
 * 创建节流输入处理器(限制事件触发频率)
 * @param {Function} callback - 处理输入的回调
 * @param {number} limit - 触发间隔时间(毫秒)
 * @param {object} options - 配置选项
 * @returns {Function} - 节流处理函数
 */
export const useThrottleInput = (callback, limit = 100, options = {}) => {
    if (typeof callback !== 'function') return () => {};
    
    const { leading = true, trailing = true } = options;
    let lastTime = 0;
    let timer = null;
    
    return (event) => {
        const now = Date.now();
        
        // 保存事件的重要属性(防止异步访问时事件对象被回收)
        const eventCopy = {
            type: event.type,
            target: event.target,
            currentTarget: event.currentTarget,
            key: event.key,
            keyCode: event.keyCode,
            code: event.code,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey,
            metaKey: event.metaKey,
            value: event.target?.value,
            preventDefault: () => event.preventDefault(),
            stopPropagation: () => event.stopPropagation()
        };
        
        // 如果是第一次触发且允许第一次立即执行
        if (lastTime === 0 && leading) {
            lastTime = now;
            callback(event);
            return;
        }
        
        const elapsed = now - lastTime;
        
        // 如果距离上次执行的时间超过了限制
        if (elapsed >= limit) {
            lastTime = now;
            
            // 清除之前的定时器
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            
            callback(event);
        } else if (trailing && !timer) {
            // 如果允许结束后调用，设置定时器
            timer = setTimeout(() => {
                lastTime = Date.now();
                timer = null;
                callback(eventCopy);
            }, limit - elapsed);
        }
    };
};

/**
 * 事件委托 - 将多个子元素的事件委托给共同父元素处理
 * @param {Element} container - 容器元素
 * @param {string} eventType - 事件类型
 * @param {string} selector - CSS选择器(匹配要处理的子元素)
 * @param {Function} handler - 事件处理函数
 * @param {boolean|object} options - 事件选项
 * @returns {Function} - 移除事件委托的函数
 */
export const useEventDelegation = (container, eventType, selector, handler, options = false) => {
    if (!container || !eventType || !selector || typeof handler !== 'function') {
        return () => {};
    }
    
    const delegationHandler = (event) => {
        // 查找被点击元素的所有父元素(包括自身)
        const path = event.composedPath();
        
        // 遍历路径上的元素，找到第一个匹配选择器的元素
        const target = path.find(element => {
            // 仅处理元素节点且在容器内
            return (
                element instanceof Element && 
                element !== container &&
                container.contains(element) && 
                element.matches(selector)
            );
        });
        
        // 如果找到匹配的元素，调用处理函数
        if (target) {
            // 在处理函数中，设置currentTarget为匹配的元素
            const delegateEvent = Object.create(event);
            delegateEvent.currentTarget = target;
            delegateEvent.delegateTarget = target;
            
            handler.call(target, delegateEvent);
        }
    };
    
    // 添加事件监听器到容器
    container.addEventListener(eventType, delegationHandler, options);
    
    // 返回一个函数用于移除事件监听器
    return () => {
        container.removeEventListener(eventType, delegationHandler, options);
    };
};

/**
 * 捕获按键组合 (如快捷键)
 * @param {Element|Document|Window} target - 事件目标
 * @param {Array<string>} keyCombination - 按键组合数组
 * @param {Function} callback - 回调函数
 * @param {object} options - 选项
 * @returns {Function} - 移除监听的函数
 */
export const useKeyCombination = (target, keyCombination, callback, options = {}) => {
    if (!target || !Array.isArray(keyCombination) || typeof callback !== 'function') {
        return () => {};
    }
    
    const { preventDefault = true, eventType = PHYSICAL_EVENTS.KEYBOARD.KEY_DOWN } = options;
    
    const handler = (event) => {
        // 检查修饰键状态
        const ctrlRequired = keyCombination.includes(KEY_CODES.CONTROL);
        const altRequired = keyCombination.includes(KEY_CODES.ALT);
        const shiftRequired = keyCombination.includes(KEY_CODES.SHIFT);
        const metaRequired = keyCombination.includes(KEY_CODES.META);
        
        // 检查当前修饰键状态是否匹配
        if (ctrlRequired !== event.ctrlKey || 
            altRequired !== event.altKey || 
            shiftRequired !== event.shiftKey || 
            metaRequired !== event.metaKey) {
            return;
        }
        
        // 检查主按键
        const mainKeys = keyCombination.filter(k => 
            ![KEY_CODES.CONTROL, KEY_CODES.ALT, KEY_CODES.SHIFT, KEY_CODES.META].includes(k)
        );
        
        if (mainKeys.includes(event.key)) {
            if (preventDefault) {
                event.preventDefault();
            }
            callback(event);
        }
    };
    
    target.addEventListener(eventType, handler);
    
    return () => {
        target.removeEventListener(eventType, handler);
    };
};

// 使用示例：
// document.addEventListener(TYPING_EVENTS.KEY_DOWN, handler);
// document.addEventListener(PHYSICAL_EVENTS.KEYBOARD.KEY_DOWN, handler);
// 
// const removeListener = useAddEventListener(document, TYPING_EVENTS.按键按下, (e) => console.log(e.key));
// const keyHold = useKeyHold(document.getElementById('input'), KEY_CODES.ARROW_DOWN, () => console.log('持续向下'));
// keyHold.start();
//
// const { handleInput, handleCompositionStart, handleCompositionEnd } = useInputWithIME((e) => console.log('输入完成:', e.target.value));
// inputElement.addEventListener(TYPING_EVENTS.COMPOSITION_START, handleCompositionStart);
// inputElement.addEventListener(TYPING_EVENTS.COMPOSITION_END, handleCompositionEnd);
// inputElement.addEventListener(TYPING_EVENTS.INPUT, handleInput);
