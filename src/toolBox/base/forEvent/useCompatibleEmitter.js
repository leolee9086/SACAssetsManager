/**
 * @fileoverview 兼容旧版 EventEmitter 的事件总线实现
 * @module toolBox/base/forEvent/useCompatibleEmitter
 * @description 提供与旧版 EventEmitter 类似的接口，内部使用 useEventBus 实现，
 * 并保留 eventListeners 属性以兼容旧代码。
 * 未来应考虑逐步移除对此类的依赖。
 */

import { createEventBus } from './useEventBus.js' // 调整相对路径

/**
 * 兼容旧版 EventEmitter 的类
 */
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
            // 从 this.eventListeners 中移除原始回调
            // 注意：如果同一个回调被 once 多次添加，这里可能会过早移除其他包装器对应的原始回调
            // 这是一个潜在的兼容性问题，但保持了与旧代码类似的可能行为
            if (this.eventListeners[eventName]) {
                const index = this.eventListeners[eventName].indexOf(originalCallback);
                if (index !== -1) {
                    this.eventListeners[eventName].splice(index, 1);
                }
            }
            originalCallback.apply(this, args);
        };
        
        // 保存原始回调引用，方便以后移除（如果需要通过 off(eventName, originalCallback) 来移除 once 监听）
        onceWrapper._originalCallback = originalCallback;
        
        // 添加到 eventListeners 以保持兼容性
        if (!this.eventListeners[eventName]) {
            this.eventListeners[eventName] = [];
        }
        // 这里仍然添加原始回调，而不是包装器，以匹配旧行为
        this.eventListeners[eventName].push(originalCallback);
        
        // 使用 eventBus 实现，传入包装器
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
        // 注意：这可能与直接检查 this.eventListeners[eventName].length 不同，
        // 因为 eventBus 内部可能有不同的管理方式（例如对于 once）
        // 但这是更接近 eventBus 实际状态的计数
        return this._eventBus.listenerCount(eventName);
    }
}

// 可以考虑添加一个工厂函数导出
export function createCompatibleEmitter() {
    return new IEventEmitterSimple();
} 