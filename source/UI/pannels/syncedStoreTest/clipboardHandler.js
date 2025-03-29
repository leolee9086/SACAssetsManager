/**
 * 剪贴板处理模块
 * 用于处理复制、剪切和粘贴操作
 */

/**
 * 创建剪贴板处理器
 * @param {Object} options - 配置项
 * @returns {Object} 剪贴板处理器API
 */
export const createClipboardHandler = (options = {}) => {
  const {
    enabled = true,               // 是否启用剪贴板拦截
    dispatch = () => {},          // 事件派发函数
    preventDefault = true,        // 是否阻止默认行为
    allowedMimeTypes = [          // 允许处理的MIME类型
      'text/plain',
      'text/html',
      'text/rtf',
      'image/png',
      'image/jpeg',
      'image/gif'
    ],
    customDataProcessors = {},    // 自定义数据处理器
    onCopy = null,                // 复制事件回调
    onCut = null,                 // 剪切事件回调
    onPaste = null,               // 粘贴事件回调
    getSelectionData = () => ({}) // 获取当前选区数据的函数
  } = options;
  
  // 存储绑定的事件处理函数
  const boundHandlers = new Map();
  
  /**
   * 处理剪贴板事件
   * @param {ClipboardEvent} event - 剪贴板事件
   */
  const handleClipboardEvent = (event) => {
    if (!enabled) return;
    
    const clipboardType = event.type;
    const eventData = {};
    
    // 根据事件类型处理
    switch (clipboardType) {
      case 'paste':
        handlePaste(event, eventData);
        break;
      case 'copy':
      case 'cut':
        handleCopyOrCut(event, eventData, clipboardType);
        break;
    }
    
    // 派发事件
    dispatch(clipboardType, event, eventData);
    
    // 阻止默认行为（如果配置为true）
    if (preventDefault) {
      event.preventDefault();
    }
  };
  
  /**
   * 处理粘贴事件
   * @param {ClipboardEvent} event - 粘贴事件
   * @param {Object} eventData - 事件数据对象
   */
  const handlePaste = (event, eventData) => {
    // 获取剪贴板内容
    if (event.clipboardData) {
      // 处理文本数据
      if (event.clipboardData.types.includes('text/plain')) {
        eventData.text = event.clipboardData.getData('text/plain');
      }
      
      // 处理HTML数据
      if (event.clipboardData.types.includes('text/html')) {
        eventData.html = event.clipboardData.getData('text/html');
      }
      
      // 处理RTF数据
      if (event.clipboardData.types.includes('text/rtf')) {
        eventData.rtf = event.clipboardData.getData('text/rtf');
      }
      
      // 处理自定义数据类型
      event.clipboardData.types.forEach(type => {
        if (allowedMimeTypes.includes(type) && !eventData[type]) {
          try {
            eventData[type] = event.clipboardData.getData(type);
          } catch (err) {
            console.error(`获取剪贴板数据类型 ${type} 失败:`, err);
          }
        }
      });
      
      // 处理文件
      if (event.clipboardData.files && event.clipboardData.files.length > 0) {
        eventData.files = Array.from(event.clipboardData.files);
        
        // 提取文件类型信息
        eventData.fileTypes = eventData.files.map(file => file.type);
        
        // 预先提取图片文件的URL
        eventData.imageUrls = [];
        
        // 处理图片预览
        eventData.files.forEach(file => {
          if (file.type.startsWith('image/')) {
            const imageUrl = URL.createObjectURL(file);
            eventData.imageUrls.push(imageUrl);
          }
        });
      }
      
      // 应用自定义处理器
      Object.entries(customDataProcessors).forEach(([type, processor]) => {
        if (event.clipboardData.types.includes(type)) {
          try {
            const data = event.clipboardData.getData(type);
            eventData[`processed_${type}`] = processor(data, event);
          } catch (err) {
            console.error(`处理剪贴板数据类型 ${type} 失败:`, err);
          }
        }
      });
    }
    
    // 调用自定义粘贴回调
    if (typeof onPaste === 'function') {
      const customData = onPaste(event, eventData);
      if (customData) {
        Object.assign(eventData, customData);
      }
    }
  };
  
  /**
   * 处理复制或剪切事件
   * @param {ClipboardEvent} event - 复制/剪切事件
   * @param {Object} eventData - 事件数据对象
   * @param {string} operation - 操作类型 ('copy' 或 'cut')
   */
  const handleCopyOrCut = (event, eventData, operation) => {
    // 获取选中内容
    const selection = window.getSelection();
    eventData.selection = selection;
    eventData.text = selection.toString();
    
    // 获取额外的选区数据
    const selectionData = getSelectionData();
    Object.assign(eventData, selectionData);
    
    // 如果剪贴板API可用且允许写入，设置剪贴板数据
    if (event.clipboardData && !event.defaultPrevented) {
      if (eventData.text) {
        event.clipboardData.setData('text/plain', eventData.text);
      }
      
      // 如果有HTML格式数据，也设置
      if (eventData.html) {
        event.clipboardData.setData('text/html', eventData.html);
      }
      
      // 设置其他自定义数据
      Object.entries(eventData).forEach(([key, value]) => {
        if (typeof value === 'string' && key !== 'text' && key !== 'html') {
          try {
            const mimeType = key.includes('/') ? key : `application/x-${key}`;
            event.clipboardData.setData(mimeType, value);
          } catch (err) {
            // 某些MIME类型可能不被支持
          }
        }
      });
    }
    
    // 调用适当的自定义回调
    const callback = operation === 'copy' ? onCopy : onCut;
    if (typeof callback === 'function') {
      const customData = callback(event, eventData);
      if (customData) {
        Object.assign(eventData, customData);
      }
    }
  };
  
  /**
   * 手动执行复制操作
   * @param {Object} data - 要复制的数据
   * @returns {boolean} 是否成功
   */
  const performCopy = (data = {}) => {
    // 创建合成事件
    const syntheticEvent = new ClipboardEvent('copy', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer()
    });
    
    // 设置数据
    if (data.text) {
      syntheticEvent.clipboardData.setData('text/plain', data.text);
    }
    
    if (data.html) {
      syntheticEvent.clipboardData.setData('text/html', data.html);
    }
    
    // 处理事件
    handleClipboardEvent(syntheticEvent);
    
    // 尝试使用Clipboard API（如果可用）
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        navigator.clipboard.writeText(data.text || '');
        return true;
      } catch (e) {
        console.error('Clipboard API 写入失败:', e);
      }
    }
    
    // 回退：使用document.execCommand（即将废弃，但兼容性更好）
    try {
      // 创建临时元素
      const tempElement = document.createElement('textarea');
      tempElement.value = data.text || '';
      tempElement.style.position = 'absolute';
      tempElement.style.left = '-9999px';
      document.body.appendChild(tempElement);
      tempElement.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(tempElement);
      return success;
    } catch (e) {
      console.error('execCommand 复制失败:', e);
      return false;
    }
  };
  
  /**
   * 手动执行粘贴操作
   * @returns {Promise<Object>} 粘贴的数据
   */
  const performPaste = async () => {
    // 尝试使用Clipboard API
    if (navigator.clipboard && navigator.clipboard.readText) {
      try {
        const text = await navigator.clipboard.readText();
        
        // 创建合成事件
        const syntheticEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: new DataTransfer()
        });
        
        syntheticEvent.clipboardData.setData('text/plain', text);
        
        // 处理事件
        const eventData = {};
        handlePaste(syntheticEvent, eventData);
        return eventData;
      } catch (e) {
        console.error('Clipboard API 读取失败:', e);
      }
    }
    
    // 回退：尝试使用document.execCommand
    try {
      // 创建临时元素
      const tempElement = document.createElement('textarea');
      tempElement.style.position = 'absolute';
      tempElement.style.left = '-9999px';
      document.body.appendChild(tempElement);
      tempElement.focus();
      
      const success = document.execCommand('paste');
      const text = tempElement.value;
      document.body.removeChild(tempElement);
      
      if (success) {
        return { text };
      }
    } catch (e) {
      console.error('execCommand 粘贴失败:', e);
    }
    
    return { text: '' };
  };
  
  /**
   * 绑定剪贴板事件
   * @param {HTMLElement} container - 容器元素
   */
  const bindEvents = (container) => {
    if (!container || !enabled) return;
    
    const clipboardEvents = ['copy', 'cut', 'paste'];
    
    clipboardEvents.forEach(type => {
      const handler = (e) => handleClipboardEvent(e);
      container.addEventListener(type, handler);
      boundHandlers.set(type, {
        element: container,
        type,
        handler,
        options: {}
      });
    });
  };
  
  /**
   * 清理绑定的事件
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
    bindEvents,
    cleanup,
    handleClipboardEvent,
    performCopy,
    performPaste,
    boundHandlers
  };
}; 