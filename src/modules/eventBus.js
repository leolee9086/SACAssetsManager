import { createEventBus } from '../toolBox/base/forEvent/useEventBus.js';

/**
 * 事件总线模块
 * 提供全局事件通信机制
 */
export function createEventBusModule() {
    // 创建事件总线实例
    const eventBus = createEventBus();
    
    // 存储模块注册的事件处理器，用于模块卸载时清理
    const moduleHandlers = new Map();
    
    // 创建本地广播通道
    let broadcastChannel;
    try {
        broadcastChannel = new BroadcastChannel('app-events');
    } catch (error) {
        console.warn('BroadcastChannel 不受支持，本地多窗口广播将不可用');
    }
    
    /**
     * 本地多窗口广播
     * @param {string} event - 事件名称
     * @param {any} data - 事件数据
     * @param {Object} [options] - 广播选项
     * @returns {boolean} 是否成功广播
     */
    function broadcastLocal(event, data, options = {}) {
        if (!broadcastChannel) {
            console.warn('本地广播不可用: BroadcastChannel 未初始化');
            return false;
        }
        
        try {
            broadcastChannel.postMessage({
                event,
                data,
                timestamp: Date.now(),
                source: window.name || 'unknown',
                ...options
            });
            return true;
        } catch (error) {
            console.error('本地广播失败:', error);
            return false;
        }
    }
    
    // 监听其他窗口的广播消息
    if (broadcastChannel) {
        broadcastChannel.onmessage = (event) => {
            const { event: eventName, data, source } = event.data;
            // 触发本地事件，但标记来源为其他窗口
            eventBus.emit(eventName, data, { 
                source,
                fromBroadcast: true
            });
        };
    }
    
    /**
     * 注册模块事件处理器
     * @param {string} moduleId - 模块ID 
     * @param {string} event - 事件名
     * @param {Function} handler - 处理函数
     * @param {Object} [options] - 配置选项
     */
    function registerModuleHandler(moduleId, event, handler, options = {}) {
        if (!moduleHandlers.has(moduleId)) {
            moduleHandlers.set(moduleId, new Set());
        }
        
        const unsubscribe = eventBus.on(event, handler, {
            ...options,
            namespace: moduleId // 使用模块ID作为命名空间
        });
        
        moduleHandlers.get(moduleId).add(unsubscribe);
        return unsubscribe;
    }
    
    /**
     * 注册模块一次性事件处理器
     */
    function registerModuleOnceHandler(moduleId, event, handler, options = {}) {
        if (!moduleHandlers.has(moduleId)) {
            moduleHandlers.set(moduleId, new Set());
        }
        
        const unsubscribe = eventBus.once(event, handler, {
            ...options,
            namespace: moduleId
        });
        
        moduleHandlers.get(moduleId).add(unsubscribe);
        return unsubscribe;
    }
    
    /**
     * 清理模块的所有事件处理器
     */
    function cleanupModuleHandlers(moduleId) {
        const handlers = moduleHandlers.get(moduleId);
        if (handlers) {
            handlers.forEach(unsubscribe => unsubscribe());
            handlers.clear();
            moduleHandlers.delete(moduleId);
        }
    }

    return {
        // 基础事件API
        on: eventBus.on,
        off: eventBus.off,
        once: eventBus.once,
        emit: eventBus.emit,
        
        // 模块级API
        registerModuleHandler,
        registerModuleOnceHandler,
        cleanupModuleHandlers,
        
        // 管理API
        removeAllListeners: eventBus.removeAllListeners,
        listenerCount: eventBus.listenerCount,
        eventNames: eventBus.eventNames,
        offByNamespace: eventBus.offByNamespace,
        
        // 调试API
        enableDebug: eventBus.enableDebug,
        disableDebug: eventBus.disableDebug,
        
        // 扩展API
        extend: eventBus.extend,
        
        // 添加本地广播API
        broadcastLocal,
        
        // 添加广播通道状态检查
        isBroadcastSupported: () => !!broadcastChannel
    };
}

// 创建全局单例
export const eventBusModule = createEventBusModule();

// 导出中文API
export const 事件总线 = {
    监听: eventBusModule.on,
    取消监听: eventBusModule.off,
    单次监听: eventBusModule.once,
    触发: eventBusModule.emit,
    
    注册模块处理器: eventBusModule.registerModuleHandler,
    注册模块单次处理器: eventBusModule.registerModuleOnceHandler,
    清理模块处理器: eventBusModule.cleanupModuleHandlers,
    
    移除所有监听器: eventBusModule.removeAllListeners,
    获取监听器数量: eventBusModule.listenerCount,
    获取事件名列表: eventBusModule.eventNames,
    按命名空间解除: eventBusModule.offByNamespace,
    
    启用调试: eventBusModule.enableDebug,
    关闭调试: eventBusModule.disableDebug,
    
    扩展: eventBusModule.extend,
    
    本地广播: eventBusModule.broadcastLocal,
    支持广播: eventBusModule.isBroadcastSupported
};

// 默认导出英文API
export default eventBusModule; 