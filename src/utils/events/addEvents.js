import { addMethod, addMethodWithMetadata, removeMethodRecords } from '../object/addMethod.js';

// 各个事件方法的具体实现
const eventMethods = {
    once: (target) => (...args) => {
        const [event, handler] = args;
        if (!event || typeof event !== 'string') {
            throw new TypeError('事件名称必须是字符串类型');
        }
        if (typeof handler !== 'function') {
            throw new TypeError('事件处理器必须是函数类型');
        }
        
        const onceHandler = (...eventArgs) => {
            try {
                handler(...eventArgs);
            } catch (error) {
                console.error(`事件处理器执行错误 (${event}):`, error);
            }
            target.off(event, onceHandler);
        };
        target.on(event, onceHandler);
        return target;
    },

    on: (target) => (event, handler) => {
        if (!event || typeof event !== 'string') {
            throw new TypeError('事件名称必须是字符串类型');
        }
        if (typeof handler !== 'function') {
            throw new TypeError('事件处理器必须是函数类型');
        }

        if (!target._eventHandlers) {
            target._eventHandlers = new Map();
        }
        if (!target._eventHandlers.has(event)) {
            target._eventHandlers.set(event, new Set());
        }
        target._eventHandlers.get(event).add(handler);
        return target;
    },

    onMultiple: (target) => (events, handler) => {
        events.forEach(event => target.on(event, handler));
        return target;
    },

    off: (target) => (event, handler) => {
        if (!target._eventHandlers?.has(event)) return target;
        
        if (handler) {
            target._eventHandlers.get(event).delete(handler);
            if (target._eventHandlers.get(event).size === 0) {
                target._eventHandlers.delete(event);
            }
        } else {
            target._eventHandlers.delete(event);
        }
        
        if (target._eventHandlers.size === 0) {
            delete target._eventHandlers;
        }
        return target;
    },

    emitAsync: (target) => async (event, ...args) => {
        if (!event || typeof event !== 'string') {
            throw new TypeError('事件名称必须是字符串类型');
        }
        
        if (!target._eventHandlers?.has(event)) return target;
        
        const handlers = Array.from(target._eventHandlers.get(event));
        try {
            await Promise.all(
                handlers.map(handler => 
                    Promise.resolve(handler(...args))
                        .catch(error => {
                            console.error(`异步事件处理器执行错误 (${event}):`, error);
                        })
                )
            );
        } catch (error) {
            console.error(`事件批量处理错误 (${event}):`, error);
        }
        return target;
    },

    emit: (target) => (event, ...args) => {
        if (!event || typeof event !== 'string') {
            throw new TypeError('事件名称必须是字符串类型');
        }
        
        if (!target._eventHandlers?.has(event)) return target;
        
        target._eventHandlers.get(event).forEach(handler => {
            try {
                handler(...args);
            } catch (error) {
                console.error(`事件处理器执行错误 (${event}):`, error);
            }
        });
        return target;
    },

    listenerCount: (target) => (event) => {
        return target._eventHandlers?.get(event)?.size || 0;
    },

    eventNames: (target) => () => {
        return Array.from(target._eventHandlers?.keys() || []);
    },

    removeAllListeners: (target) => () => {
        delete target._eventHandlers;
        return target;
    },

    $destroyEvents: (target) => () => {
        delete target._eventHandlers;
        removeMethodRecords(target);
        return target;
    }
};

// 事件方法的元数据
const methodMetadata = {
    once: {
        description: '添加一次性事件监听器',
        params: ['event: string', 'handler: Function'],
        returns: 'target'
    },
    on: {
        description: '添加事件监听器',
        params: ['event: string', 'handler: Function'],
        returns: 'target'
    },
    onMultiple: {
        description: '为多个事件添加相同的监听器',
        params: ['events: string[]', 'handler: Function'],
        returns: 'target'
    },
    emit: {
        description: '同步触发事件',
        params: ['event: string', '...args: any[]'],
        returns: 'target'
    },
    emitAsync: {
        description: '异步触发事件',
        params: ['event: string', '...args: any[]'],
        returns: 'Promise<target>'
    }
};

// 主函数重构
export const addEvents = (target) => {
    if (!target || typeof target !== 'object') {
        throw new TypeError('目标对象必须是一个有效的对象');
    }
    
    // 防止重复初始化
    if (isEventEmitter(target)) {
        console.warn('目标对象已经是一个事件发射器');
        return target;
    }
    
    // 初始化事件处理器存储
    target._eventHandlers = new Map();
    
    // 使用 addMethodWithMetadata 添加所有方法
    Object.entries(eventMethods).forEach(([name, methodFactory]) => {
        addMethodWithMetadata(
            target,
            name,
            methodFactory(target),
            methodMetadata[name] || {}
        );
    });
    
    return target;
};

// 工具函数：检查对象是否是事件发射器
export const isEventEmitter = (target) => {
    return target && 
           typeof target.on === 'function' && 
           typeof target.emit === 'function';
};

// 工具函数：获取所有事件发射器
export const getAllEventEmitters = () => {
    return getObjectsWithAllMethods(['on', 'emit']);
};

export default addEvents;
