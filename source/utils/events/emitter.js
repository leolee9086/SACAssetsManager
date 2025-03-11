import { createEventBus } from '../../../src/utils/base/forEvent/useEventBus.js'

export class IEventEmitterSimple {
    constructor() {
        // 使用高性能的事件总线作为内部实现
        this._eventBus = createEventBus();
        // 保留原始接口兼容性
        this.eventListeners = {};
    }

    on(eventName, callback) {
        if (typeof eventName !== 'string' || typeof callback !== 'function') {
            throw new TypeError('事件名必须为字符串，回调必须为函数');
        }
        
        // 使用 eventBus 实现
        this._eventBus.on(eventName, callback);
        
        // 保持原始结构同步 (用于兼容依赖于直接访问 eventListeners 的代码)
        if (!this.eventListeners[eventName]) {
            this.eventListeners[eventName] = [];
        }
        this.eventListeners[eventName].push(callback);
        
        return this;
    }

    off(eventName, callback) {
        if (typeof eventName !== 'string' || typeof callback !== 'function') {
            throw new TypeError('事件名必须为字符串，回调必须为函数');
        }
        
        // 使用 eventBus 实现
        this._eventBus.off(eventName, callback);
        
        // 保持原始结构同步
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName] = this.eventListeners[eventName].filter(
                listener => listener !== callback
            );
        }
        
        return this;
    }

    emit(eventName, data) {
        if (typeof eventName !== 'string') {
            throw new TypeError('事件名必须为字符串');
        }
        
        // 使用 eventBus 实现 (同步模式)
        this._eventBus.emit(eventName, data, { sync: true });
        
        return this;
    }
    
    once(eventName, callback) {
        if (typeof eventName !== 'string' || typeof callback !== 'function') {
            throw new TypeError('事件名必须为字符串，回调必须为函数');
        }
        
        // 使用 once 功能实现一次性监听
        const originalCallback = callback;
        
        // 为了同步 eventListeners，需要自定义一个包装
        const onceWrapper = (...args) => {
            if (this.eventListeners[eventName]) {
                this.eventListeners[eventName] = this.eventListeners[eventName].filter(
                    listener => listener !== originalCallback
                );
            }
            originalCallback.apply(this, args);
        };
        
        // 保存原始回调引用，方便以后移除
        onceWrapper._originalCallback = originalCallback;
        
        // 添加到 eventListeners 以保持兼容性
        if (!this.eventListeners[eventName]) {
            this.eventListeners[eventName] = [];
        }
        this.eventListeners[eventName].push(originalCallback);
        
        // 使用 eventBus 实现
        this._eventBus.once(eventName, onceWrapper);
        
        return this;
    }

    removeAllListeners(eventName) {
        if (eventName === undefined) {
            // 移除所有事件监听器
            this._eventBus.removeAllListeners();
            this.eventListeners = {};
        } else if (typeof eventName === 'string') {
            // 移除特定事件的所有监听器
            this._eventBus.removeAllListeners(eventName);
            delete this.eventListeners[eventName];
        } else {
            throw new TypeError('事件名必须为字符串或未定义');
        }
        
        return this;
    }

    listenerCount(eventName) {
        if (typeof eventName !== 'string') {
            throw new TypeError('事件名必须为字符串');
        }
        
        // 使用 eventBus 的方法获取监听器数量
        return this._eventBus.listenerCount(eventName);
    }
}