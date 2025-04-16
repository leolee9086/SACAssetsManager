/**
 * @module observable
 * 
 * 提供事件发布订阅功能的基础类
 */

/**
 * 可观察对象基类
 * 提供事件订阅、取消订阅和触发事件的功能
 */
export class Observable {
  constructor() {
    this._observers = new Map();
  }
  
  /**
   * 订阅事件
   * @param {string} eventName - 事件名称
   * @param {function} eventHandler - 事件处理函数
   */
  on(eventName, eventHandler) {
    if (!this._observers.has(eventName)) {
      this._observers.set(eventName, new Set());
    }
    this._observers.get(eventName).add(eventHandler);
    return this;
  }
  
  /**
   * 取消订阅事件
   * @param {string} eventName - 事件名称
   * @param {function} [eventHandler] - 事件处理函数，如果不提供则删除该事件的所有处理函数
   */
  off(eventName, eventHandler) {
    const handlers = this._observers.get(eventName);
    if (handlers) {
      if (eventHandler) {
        handlers.delete(eventHandler);
        if (handlers.size === 0) {
          this._observers.delete(eventName);
        }
      } else {
        this._observers.delete(eventName);
      }
    }
    return this;
  }
  
  /**
   * 触发事件
   * @param {string} eventName - 事件名称
   * @param {Array} args - 事件参数
   */
  emit(eventName, args) {
    const handlers = this._observers.get(eventName);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(...args);
        } catch (error) {
          console.error(`事件处理器执行失败: ${eventName}`, error);
        }
      }
    }
    return this;
  }
  
  /**
   * 一次性订阅事件，事件触发后自动取消订阅
   * @param {string} eventName - 事件名称
   * @param {function} eventHandler - 事件处理函数
   */
  once(eventName, eventHandler) {
    const onceHandler = (...args) => {
      this.off(eventName, onceHandler);
      eventHandler(...args);
    };
    this.on(eventName, onceHandler);
    return this;
  }
  
  /**
   * 取消所有事件订阅
   */
  removeAllEventListeners() {
    this._observers.clear();
    return this;
  }
  
  /**
   * 销毁对象，清理所有事件监听器
   */
  destroy() {
    this.removeAllEventListeners();
  }
} 