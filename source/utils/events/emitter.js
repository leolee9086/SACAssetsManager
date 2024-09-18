export class IEventEmitterSimple {
    constructor() {
        this.eventListeners = {};
    }

    on(eventName, callback) {
        if (typeof eventName !== 'string' || typeof callback !== 'function') {
            throw new TypeError('事件名必须为字符串，回调必须为函数');
        }
        if (!this.eventListeners[eventName]) {
            this.eventListeners[eventName] = [];
        }
        this.eventListeners[eventName].push(callback);
    }

    off(eventName, callback) {
        if (typeof eventName !== 'string' || typeof callback !== 'function') {
            throw new TypeError('事件名必须为字符串，回调必须为函数');
        }
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName] = this.eventListeners[eventName].filter(
                listener => listener !== callback
            );
        }
    }

    emit(eventName, data) {
        if (typeof eventName !== 'string') {
            throw new TypeError('事件名必须为字符串');
        }
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName].forEach(listener => {
                try {
                    listener(data);
                } catch (error) {
                    console.error(`执行事件 "${eventName}" 的监听器时发生错误:`, error);
                }
            });
        }
    }
    once(eventName, callback) {
        if (typeof eventName !== 'string' || typeof callback !== 'function') {
            throw new TypeError('事件名必须为字符串，回调必须为函数');
        }
        const onceWrapper = (...args) => {
            this.off(eventName, onceWrapper);
            callback.apply(this, args);
        };
        this.on(eventName, onceWrapper);
    }

    removeAllListeners(eventName) {
        if (eventName === undefined) {
            this.eventListeners = {};
        } else if (typeof eventName === 'string') {
            delete this.eventListeners[eventName];
        } else {
            throw new TypeError('事件名必须为字符串或未定义');
        }
    }

    listenerCount(eventName) {
        if (typeof eventName !== 'string') {
            throw new TypeError('事件名必须为字符串');
        }
        return (this.eventListeners[eventName] || []).length;
    }

}