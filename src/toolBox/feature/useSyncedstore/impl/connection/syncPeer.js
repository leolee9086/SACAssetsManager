/**
 * 确保目标对象具有事件处理能力
 * @param {Object} target - 目标对象
 * @return {boolean} 是否成功确保
 */
function ensureEventSystem(target) {
  if (!target) return false;

  // 如果已经有事件能力，直接返回
  if (target._eventHandlers || 
      typeof target.addEventListener === 'function' || 
      typeof target.on === 'function') {
    return true;
  }

  try {
    // 添加事件处理器存储
    Object.defineProperty(target, '_eventHandlers', {
      value: {},
      enumerable: false,
      configurable: true,
      writable: true
    });
    
    // 添加标准事件方法
    if (typeof target.on !== 'function') {
      Object.defineProperty(target, 'on', {
        value: function(event, handler) {
          if (!this._eventHandlers[event]) {
            this._eventHandlers[event] = new Set();
          }
          this._eventHandlers[event].add(handler);
          return this;
        },
        enumerable: false,
        configurable: true,
        writable: true
      });
    }
    
    if (typeof target.off !== 'function') {
      Object.defineProperty(target, 'off', {
        value: function(event, handler) {
          if (this._eventHandlers && this._eventHandlers[event]) {
            this._eventHandlers[event].delete(handler);
          }
          return this;
        },
        enumerable: false,
        configurable: true,
        writable: true
      });
    }
    
    if (typeof target.emit !== 'function') {
      Object.defineProperty(target, 'emit', {
        value: function(event, ...args) {
          if (this._eventHandlers && this._eventHandlers[event]) {
            this._eventHandlers[event].forEach(handler => {
              try {
                handler.apply(this, args);
              } catch (err) {
                console.error(`[Event] Error in handler for '${event}':`, err);
              }
            });
          }
          return this;
        },
        enumerable: false,
        configurable: true,
        writable: true
      });
    }
    
    return true;
  } catch (err) {
    console.error('[SyncPeer] Failed to ensure event system:', err);
    return false;
  }
}

// 下面是处理_eventHandlers的地方，找到相关代码并添加安全检查:

// 例如，查找这样的代码:
// doc._eventHandlers[event].add(callback);

// 修改为:
// if (ensureEventSystem(doc)) {
//   doc.on(event, callback);
// } 