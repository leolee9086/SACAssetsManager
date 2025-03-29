/**
 * 键盘快捷键管理模块
 * 用于处理和注册键盘快捷键操作
 */

/**
 * 创建键盘快捷键管理器
 * @param {Object} options - 配置项
 * @returns {Object} 快捷键管理器API
 */
export const createKeyboardShortcutManager = (options = {}) => {
  const {
    enabled = true,         // 是否启用快捷键
    preventDefault = true,  // 是否阻止默认行为
    dispatch = () => {}     // 事件派发函数
  } = options;
  
  // 存储注册的快捷键处理器
  const shortcutHandlers = new Map();
  
  /**
   * 标准化键盘组合
   * @param {string} combo - 键盘组合字符串，如 'ctrl+z'
   * @returns {Object} 标准化的键盘组合对象
   */
  const normalizeKeyCombo = (combo) => {
    const parts = combo.toLowerCase().split('+');
    const result = {
      alt: false,
      ctrl: false,
      meta: false,
      shift: false,
      key: ''
    };
    
    parts.forEach(part => {
      switch (part) {
        case 'alt':
        case 'option':
          result.alt = true;
          break;
        case 'ctrl':
        case 'control':
          result.ctrl = true;
          break;
        case 'meta':
        case 'cmd':
        case 'command':
          result.meta = true;
          break;
        case 'shift':
          result.shift = true;
          break;
        default:
          result.key = part;
      }
    });
    
    return result;
  };
  
  /**
   * 注册快捷键处理函数
   * @param {string|Array} keys - 快捷键组合，如 'ctrl+z' 或 ['ctrl+z', 'meta+z']
   * @param {Function} handler - 处理函数
   * @param {boolean} preventDefaultAction - 是否阻止默认行为
   * @returns {Function} 用于注销快捷键的函数
   */
  const registerShortcut = (keys, handler, preventDefaultAction = preventDefault) => {
    if (!enabled) return () => {};
    
    const keyArray = Array.isArray(keys) ? keys : [keys];
    
    keyArray.forEach(keyCombo => {
      const normalized = normalizeKeyCombo(keyCombo);
      shortcutHandlers.set(JSON.stringify(normalized), {
        handler,
        preventDefault: preventDefaultAction
      });
    });
    
    // 返回删除函数
    return () => {
      keyArray.forEach(keyCombo => {
        const normalized = normalizeKeyCombo(keyCombo);
        shortcutHandlers.delete(JSON.stringify(normalized));
      });
    };
  };
  
  /**
   * 处理键盘事件，检查是否触发快捷键
   * @param {KeyboardEvent} event - 键盘事件
   * @returns {boolean} 是否有快捷键被触发
   */
  const handleKeyboardEvent = (event) => {
    if (!enabled) return false;
    
    const keyEvent = {
      alt: event.altKey,
      ctrl: event.ctrlKey,
      meta: event.metaKey,
      shift: event.shiftKey,
      key: event.key.toLowerCase()
    };
    
    // 尝试匹配已注册的快捷键
    const keyString = JSON.stringify(keyEvent);
    const shortcut = shortcutHandlers.get(keyString);
    
    if (shortcut) {
      if (shortcut.preventDefault) {
        event.preventDefault();
      }
      
      try {
        shortcut.handler(event);
        
        // 触发自定义快捷键事件
        dispatch('shortcutTriggered', event, {
          shortcut: keyEvent,
          originalEvent: event
        });
        
        return true;
      } catch (err) {
        console.error('快捷键处理错误:', err);
      }
    }
    
    return false;
  };
  
  /**
   * 判断是否为特定快捷键组合
   * @param {KeyboardEvent} event - 键盘事件
   * @param {string} shortcutCombo - 快捷键组合字符串
   * @returns {boolean} 是否匹配
   */
  const isShortcut = (event, shortcutCombo) => {
    const normalized = normalizeKeyCombo(shortcutCombo);
    
    return (
      event.altKey === normalized.alt &&
      event.ctrlKey === normalized.ctrl &&
      event.metaKey === normalized.meta &&
      event.shiftKey === normalized.shift &&
      event.key.toLowerCase() === normalized.key
    );
  };
  
  /**
   * 获取当前注册的所有快捷键
   * @returns {Array} 快捷键列表
   */
  const getRegisteredShortcuts = () => {
    return Array.from(shortcutHandlers.keys()).map(key => {
      try {
        return JSON.parse(key);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
  };
  
  /**
   * 清理所有注册的快捷键
   */
  const clearShortcuts = () => {
    shortcutHandlers.clear();
  };
  
  return {
    registerShortcut,
    handleKeyboardEvent,
    isShortcut,
    getRegisteredShortcuts,
    clearShortcuts
  };
}; 