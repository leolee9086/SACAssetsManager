/**
 * 事件标准化模块
 * 用于将原生DOM事件转换为标准化的事件对象
 */

/**
 * 创建事件标准化器
 * @param {Object} options - 配置选项
 * @returns {Object} 事件标准化器API
 */
export const createEventNormalizer = (options = {}) => {
  const {
    getContainer = () => null,
    updateState = () => {}
  } = options;
  
  // 添加事件对象缓存池以减少对象创建
  const eventCache = new Map();
  const MAX_CACHE_SIZE = 20;
  
  /**
   * 安全获取事件属性
   * @param {Object} obj - 源对象
   * @param {string} prop - 属性名
   * @param {*} defaultValue - 默认值
   * @returns {*} 属性值或默认值
   */
  const safeGet = (obj, prop, defaultValue) => {
    if (!obj || typeof obj !== 'object') return defaultValue;
    return obj[prop] !== undefined ? obj[prop] : defaultValue;
  };
  
  /**
   * 标准化事件对象，添加一致的属性
   * @param {Event} event - 原始事件对象
   * @param {Object} data - 附加数据
   * @returns {Object} 标准化的事件对象
   */
  const normalizeEvent = (event, data = {}) => {
    try {
      if (!event) return { type: 'unknown', synthetic: true, ...data };
      
      // 保留原始事件引用
      const originalEvent = event;
      const eventType = safeGet(event, 'type', 'unknown');
      
      // 创建基础标准化事件
      const normalizedEvent = {
        // 保留原始事件对象引用
        originalEvent,
        
        // 基本事件属性
        type: eventType,
        timeStamp: safeGet(event, 'timeStamp', Date.now()),
        target: safeGet(event, 'target', null),
        currentTarget: safeGet(event, 'currentTarget', null),
        
        // 从原始事件复制方法
        preventDefault: () => {
          if (originalEvent && typeof originalEvent.preventDefault === 'function') {
            originalEvent.preventDefault();
          }
        },
        stopPropagation: () => {
          if (originalEvent && typeof originalEvent.stopPropagation === 'function') {
            originalEvent.stopPropagation();
          }
        },
        
        // 附加数据
        ...data
      };
      
      // 处理不同的事件类型
      switch (eventType) {
        case 'mousedown':
        case 'mouseup':
        case 'mousemove':
        case 'click':
        case 'dblclick':
        case 'contextmenu':
          // 添加鼠标相关属性
          Object.assign(normalizedEvent, {
            clientX: safeGet(event, 'clientX', 0),
            clientY: safeGet(event, 'clientY', 0),
            pageX: safeGet(event, 'pageX', 0),
            pageY: safeGet(event, 'pageY', 0),
            offsetX: safeGet(event, 'offsetX', 0),
            offsetY: safeGet(event, 'offsetY', 0),
            button: safeGet(event, 'button', 0),
            buttons: safeGet(event, 'buttons', 0),
            ctrlKey: safeGet(event, 'ctrlKey', false),
            shiftKey: safeGet(event, 'shiftKey', false),
            altKey: safeGet(event, 'altKey', false),
            metaKey: safeGet(event, 'metaKey', false)
          });
          
          // 更新最后鼠标位置
          updateState({
            lastMousePosition: {
              x: safeGet(event, 'clientX', 0),
              y: safeGet(event, 'clientY', 0)
            }
          });
          break;
          
        case 'keydown':
        case 'keyup':
        case 'keypress':
          // 添加键盘相关属性
          Object.assign(normalizedEvent, {
            key: safeGet(event, 'key', ''),
            code: safeGet(event, 'code', ''),
            keyCode: safeGet(event, 'keyCode', safeGet(event, 'which', 0)),
            ctrlKey: safeGet(event, 'ctrlKey', false),
            shiftKey: safeGet(event, 'shiftKey', false),
            altKey: safeGet(event, 'altKey', false),
            metaKey: safeGet(event, 'metaKey', false),
            repeat: safeGet(event, 'repeat', false),
            isComposing: safeGet(event, 'isComposing', false)
          });
          
          // 更新最后按键
          updateState({
            lastKeyPressed: safeGet(event, 'key', '')
          });
          break;
          
        case 'touchstart':
        case 'touchmove':
        case 'touchend':
        case 'touchcancel':
          // 安全获取触摸对象
          const touches = safeGet(event, 'touches', []);
          const changedTouches = safeGet(event, 'changedTouches', []);
          
          const touch = touches && touches[0] ? touches[0] : null;
          const changedTouch = changedTouches && changedTouches[0] ? changedTouches[0] : null;
          
          // 安全处理触摸数组
          const normalizeTouchList = (touchList) => {
            if (!touchList) return [];
            try {
              return Array.from(touchList).map(t => ({
                identifier: safeGet(t, 'identifier', null),
                clientX: safeGet(t, 'clientX', 0),
                clientY: safeGet(t, 'clientY', 0),
                pageX: safeGet(t, 'pageX', 0),
                pageY: safeGet(t, 'pageY', 0),
                radiusX: safeGet(t, 'radiusX', 0),
                radiusY: safeGet(t, 'radiusY', 0),
                rotationAngle: safeGet(t, 'rotationAngle', 0),
                force: safeGet(t, 'force', 0),
                target: safeGet(t, 'target', null)
              }));
            } catch (e) {
              return [];
            }
          };
          
          Object.assign(normalizedEvent, {
            touches: normalizeTouchList(touches),
            changedTouches: normalizeTouchList(changedTouches),
            clientX: touch ? safeGet(touch, 'clientX', 0) : (changedTouch ? safeGet(changedTouch, 'clientX', 0) : 0),
            clientY: touch ? safeGet(touch, 'clientY', 0) : (changedTouch ? safeGet(changedTouch, 'clientY', 0) : 0),
            pageX: touch ? safeGet(touch, 'pageX', 0) : (changedTouch ? safeGet(changedTouch, 'pageX', 0) : 0),
            pageY: touch ? safeGet(touch, 'pageY', 0) : (changedTouch ? safeGet(changedTouch, 'pageY', 0) : 0)
          });
          
          // 如果有触摸点，更新最后位置
          if (touch || changedTouch) {
            updateState({
              lastMousePosition: {
                x: normalizedEvent.clientX,
                y: normalizedEvent.clientY
              }
            });
          }
          break;
          
        // 添加滚轮事件处理
        case 'wheel':
        case 'mousewheel':
        case 'DOMMouseScroll':
          Object.assign(normalizedEvent, {
            clientX: safeGet(event, 'clientX', 0),
            clientY: safeGet(event, 'clientY', 0),
            pageX: safeGet(event, 'pageX', 0),
            pageY: safeGet(event, 'pageY', 0),
            deltaX: safeGet(event, 'deltaX', 0),
            deltaY: safeGet(event, 'deltaY', 0),
            deltaZ: safeGet(event, 'deltaZ', 0),
            deltaMode: safeGet(event, 'deltaMode', 0),
            // 兼容非标准滚轮事件
            wheelDelta: safeGet(event, 'wheelDelta', 0),
            detail: safeGet(event, 'detail', 0)
          });
          break;
        
        // 添加焦点事件处理
        case 'focus':
        case 'blur':
        case 'focusin':
        case 'focusout':
          Object.assign(normalizedEvent, {
            relatedTarget: safeGet(event, 'relatedTarget', null)
          });
          break;
          
        // 添加输入法事件处理
        case 'compositionstart':
        case 'compositionupdate':
        case 'compositionend':
          Object.assign(normalizedEvent, {
            data: safeGet(event, 'data', ''),
            locale: safeGet(event, 'locale', '')
          });
          break;
          
        // 添加剪贴板事件处理
        case 'copy':
        case 'cut':
        case 'paste':
          Object.assign(normalizedEvent, {
            clipboardData: safeGet(event, 'clipboardData', null),
          });
          break;
          
        // 添加拖拽事件处理
        case 'dragstart':
        case 'drag':
        case 'dragenter':
        case 'dragleave':
        case 'dragover':
        case 'drop':
        case 'dragend':
          Object.assign(normalizedEvent, {
            dataTransfer: safeGet(event, 'dataTransfer', null),
            clientX: safeGet(event, 'clientX', 0),
            clientY: safeGet(event, 'clientY', 0),
            pageX: safeGet(event, 'pageX', 0),
            pageY: safeGet(event, 'pageY', 0)
          });
          break;
          
        default:
          // 处理未知事件类型，保留一般事件属性
          // 不做额外处理
          break;
      }
      
      return normalizedEvent;
      
    } catch (error) {
      console.error('事件标准化出错：', error);
      // 发生错误时返回最简事件对象
      return {
        type: event?.type || 'unknown',
        timeStamp: Date.now(),
        target: event?.target || null,
        error: true,
        errorMessage: error.message,
        ...data
      };
    }
  };
  
  /**
   * 创建合成事件
   * @param {string} type - 事件类型
   * @param {Object} data - 事件数据
   * @returns {Object} 合成事件对象
   */
  const createSyntheticEvent = (type, data = {}) => {
    try {
      // 获取容器，安全地处理可能的错误
      let container = null;
      try {
        container = getContainer();
      } catch (e) {
        console.warn('获取容器失败:', e);
      }
      
      // 创建基本的合成事件
      return {
        type,
        synthetic: true,
        timeStamp: Date.now(),
        target: container,
        currentTarget: container,
        preventDefault: () => {},
        stopPropagation: () => {},
        ...data
      };
    } catch (error) {
      console.error('创建合成事件出错:', error);
      return {
        type,
        synthetic: true,
        timeStamp: Date.now(),
        error: true,
        errorMessage: error.message
      };
    }
  };
  
  /**
   * 从原生事件创建具有指定类型的事件
   * @param {Event} sourceEvent - 源事件
   * @param {string} newType - 新事件类型
   * @param {Object} additionalData - 附加数据
   * @returns {Object} 新的标准化事件
   */
  const deriveEvent = (sourceEvent, newType, additionalData = {}) => {
    try {
      if (!sourceEvent || !newType) {
        return createSyntheticEvent(newType || 'unknown', additionalData);
      }
      
      const normalized = normalizeEvent(sourceEvent);
      return {
        ...normalized,
        type: newType,
        derived: true,
        originalType: sourceEvent?.type || 'unknown',
        ...additionalData
      };
    } catch (error) {
      console.error('派生事件出错:', error);
      return createSyntheticEvent(newType || 'unknown', {
        error: true,
        errorMessage: error.message,
        ...additionalData
      });
    }
  };
  
  /**
   * 获取特定事件类型对应的标准化属性映射
   * @param {string} eventType - 事件类型
   * @returns {Object} 标准化属性映射
   */
  const getEventPropertyMap = (eventType) => {
    if (!eventType) return [];
    
    const commonProperties = ['type', 'target', 'currentTarget', 'timeStamp'];
    
    const propertyMaps = {
      mouse: [...commonProperties, 'clientX', 'clientY', 'pageX', 'pageY', 'offsetX', 'offsetY', 'button', 'buttons', 'altKey', 'ctrlKey', 'metaKey', 'shiftKey'],
      keyboard: [...commonProperties, 'key', 'code', 'keyCode', 'altKey', 'ctrlKey', 'metaKey', 'shiftKey', 'repeat', 'isComposing'],
      touch: [...commonProperties, 'touches', 'targetTouches', 'changedTouches', 'clientX', 'clientY', 'pageX', 'pageY'],
      focus: [...commonProperties, 'relatedTarget'],
      clipboard: [...commonProperties, 'clipboardData'],
      dragdrop: [...commonProperties, 'dataTransfer', 'clientX', 'clientY', 'pageX', 'pageY'],
      composition: [...commonProperties, 'data', 'locale'],
      wheel: [...commonProperties, 'deltaX', 'deltaY', 'deltaZ', 'deltaMode', 'wheelDelta', 'detail', 'clientX', 'clientY']
    };
    
    // 根据事件类型确定要返回的属性集
    if (eventType.startsWith('mouse') || eventType === 'click' || eventType === 'dblclick' || eventType === 'contextmenu') {
      return propertyMaps.mouse;
    } else if (eventType.startsWith('key')) {
      return propertyMaps.keyboard;
    } else if (eventType.startsWith('touch')) {
      return propertyMaps.touch;
    } else if (eventType.startsWith('focus') || eventType === 'blur') {
      return propertyMaps.focus;
    } else if (['copy', 'cut', 'paste'].includes(eventType)) {
      return propertyMaps.clipboard;
    } else if (eventType.includes('drag') || eventType === 'drop') {
      return propertyMaps.dragdrop;
    } else if (eventType.includes('composition')) {
      return propertyMaps.composition;
    } else if (eventType === 'wheel' || eventType === 'mousewheel' || eventType === 'DOMMouseScroll') {
      return propertyMaps.wheel;
    }
    
    return commonProperties;
  };
  
  /**
   * 清除事件缓存
   */
  const clearCache = () => {
    eventCache.clear();
  };
  
  return {
    normalizeEvent,
    createSyntheticEvent,
    deriveEvent,
    getEventPropertyMap,
    clearCache
  };
}; 