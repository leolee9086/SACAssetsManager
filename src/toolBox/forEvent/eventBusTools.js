/**
 * EventBus - 轻量级事件总线
 * 
 * 核心功能:
 * - 基础事件订阅/发布(on/emit)
 * - 取消订阅(off)
 * - 一次性事件监听(once)
 * 
 * 扩展机制支持:
 * - 优先级控制
 * - 命名空间
 * - 事件流控制
 * - 调试工具
 */
export function createEventBus() {
    // 存储所有事件监听器，使用Map<事件名, Map<优先级, Set<回调>>>结构
    const listeners = new Map();

    // 优化: 采用Object.create(null)来创建无原型对象，比普通对象更快
    const extensions = Object.create(null);
    const metadata = new WeakMap();
    
    // 采用Map存储扩展依赖关系
    const extensionDependencies = new Map();

    // 预定义常用常量，缓存为局部变量提高访问速度
    const WILDCARD = '*';

    // 优化: 使用数组而非对象，减少属性查找开销
    const hooks = {
        beforeOn: [],
        afterOn: [],
        beforeOff: [],
        afterOff: [],
        beforeOnce: [],
        afterOnce: [], 
        beforeEmit: [],
        afterEmit: [],
        // 调试钩子
        debug: []
    };

    // 优化: 缓存事件处理器排序结果
    const sortedCallbacksCache = new Map();
    
    // 优化: 标记缓存是否有效的映射表
    const cacheValidFlags = new Map();

    // 调试状态
    let debugEnabled = false;

    // 公共接口
    const eventBus = {
        on,
        off,
        once,
        emit,
        removeAllListeners,
        listenerCount,
        eventNames,
        offByNamespace,
        // 扩展机制
        extend,
        // 调试相关
        enableDebug,
        disableDebug
    };

    /**
     * 触发调试事件 - 进一步优化版本
     * @private
     */
    function triggerDebug(type, data) {
        // 快速路径: 不启用调试时直接返回
        if (!debugEnabled) return;
        // 快速路径: 没有调试钩子时直接返回
        const debugHooks = hooks.debug;
        const len = debugHooks.length;
        if (len === 0) return;
        
        // 延迟创建调试事件对象，仅当确实需要时
        const debugEvent = { type, data, timestamp: Date.now() };
        
        // 手动循环展开优化 (当调试钩子通常很少时效果明显)
        let i = 0;
        while (i < len) {
            debugHooks[i++](debugEvent);
            // 每次最多处理4个，减少循环开销
            if (i < len) debugHooks[i++](debugEvent);
            if (i < len) debugHooks[i++](debugEvent);
            if (i < len) debugHooks[i++](debugEvent);
        }
    }

    /**
     * 启用调试模式
     */
    function enableDebug() {
        debugEnabled = true;
        return eventBus;
    }

    /**
     * 禁用调试模式
     */
    function disableDebug() {
        debugEnabled = false;
        return eventBus;
    }

    /**
     * 添加事件监听器 - 进一步优化版本
     */
    function on(event, callback, options = null) {
        // 类型检查快速路径 - 使用typeof比instanceof更快
        if (typeof callback !== 'function') {
            throw new TypeError('事件监听器必须是函数');
        }
        
        // 钩子处理优化：预检查钩子数量避免不必要的逻辑
        const beforeHooks = hooks.beforeOn;
        const beforeHooksLength = beforeHooks.length;
        let hookResult;
        
        if (beforeHooksLength > 0) {
            // 仅当必要时创建对象
            hookResult = { event, callback, options: options || {} };
            
            // 优化的钩子执行，使用缓存长度
            for (let i = 0; i < beforeHooksLength; i++) {
                const result = beforeHooks[i](hookResult);
                if (result === false) {
                    triggerDebug('on-cancelled', { event, options });
                    return () => false;
                }
                if (result && typeof result === 'object') {
                    // 直接修改对象而非创建新对象
                    Object.assign(hookResult, result);
                }
            }
            
            event = hookResult.event;
            callback = hookResult.callback;
            options = hookResult.options;
        } else if (options === null) {
            // 避免后续null检查，使用空对象
            options = Object.create(null); // 比{}更快，无原型
        }

        // 位运算优化：无符号右移比||0更高效
        const priority = options.priority >>> 0;
        
        // 使用局部变量减少Map查找
        let eventListeners = listeners.get(event);
        if (!eventListeners) {
            // 优化Map初始容量，预计大多数事件只有少量优先级
            eventListeners = new Map();
            listeners.set(event, eventListeners);
        }
        
        let priorityGroup = eventListeners.get(priority);
        if (!priorityGroup) {
            priorityGroup = new Set();
            eventListeners.set(priority, priorityGroup);
        }
        
        priorityGroup.add(callback);

        // 元数据对象创建优化
        // 1. 使用Object.create(null)创建无原型对象
        // 2. 直接赋值而不是使用对象字面量，减少隐藏类变化
        const metaObj = Object.create(null);
        metaObj.event = event;
        metaObj.isWildcard = event === WILDCARD;
        metaObj.priority = priority;
        metaObj.namespace = options.namespace;
        
        // 选择性复制其他选项，避免不必要复制
        const optionsKeys = Object.keys(options);
        if (optionsKeys.length > 3) { // 超过基本属性数量时才复制
            for (let i = 0; i < optionsKeys.length; i++) {
                const key = optionsKeys[i];
                // 跳过已经复制的基本属性
                if (key !== 'priority' && key !== 'namespace') {
                    metaObj[key] = options[key];
                }
            }
        }
        
        metadata.set(callback, metaObj);
        
        // 缓存失效标记优化 - 使用简单赋值
        cacheValidFlags.set(event, false);
        if (event !== WILDCARD) {
            cacheValidFlags.set(WILDCARD, false);
        }
        
        // 后置钩子优化
        const afterHooks = hooks.afterOn;
        const afterHooksLength = afterHooks.length;
        if (afterHooksLength > 0) {
            // 仅当必要时创建对象
            const hookData = { event, callback, options };
            for (let i = 0; i < afterHooksLength; i++) {
                afterHooks[i](hookData);
            }
        }

        triggerDebug('on', { event, hasCallback: true, options, priority });

        // 返回优化的卸载函数 - 使用闭包捕获必要变量
        return function unsubscribe() { 
            return off(event, callback); 
        };
    }

    /**
     * 移除事件监听器 - 性能优化版本
     */
    function off(event, callback) {
        if (typeof callback !== 'function') {
            throw new TypeError('回调必须是函数');
        }
        
        // 优化: 只在有钩子时才执行钩子逻辑
        const beforeHooks = hooks.beforeOff;
        if (beforeHooks.length > 0) {
            let hookResult = { event, callback };
            
            for (let i = 0; i < beforeHooks.length; i++) {
                const result = beforeHooks[i](hookResult);
                if (result === false) {
                    triggerDebug('off-cancelled', { event });
                    return false;
                }
                if (result && typeof result === 'object') {
                    Object.assign(hookResult, result);
                }
            }
            
            event = hookResult.event;
            callback = hookResult.callback;
        }

        // 优化: 使用局部变量缓存查询结果
        const eventListeners = listeners.get(event);
        if (!eventListeners) return false;
        
        // 优化: 使用局部变量缓存元数据
        const meta = metadata.get(callback);
        if (!meta) return false;
        
        const priority = meta.priority || 0;
        const priorityGroup = eventListeners.get(priority);
        
        if (!priorityGroup) return false;
        
        const removed = priorityGroup.delete(callback);
        
        // 清理空集合
        if (removed) {
            // 优化: 立即标记缓存无效，而不是检查集合大小
            cacheValidFlags.set(event, false);
            if (event !== WILDCARD) {
                cacheValidFlags.set(WILDCARD, false);
            }
            
            // 仅在确认删除后才进行后续清理
            if (priorityGroup.size === 0) {
                eventListeners.delete(priority);
                
                if (eventListeners.size === 0) {
                    listeners.delete(event);
                    // 同时删除缓存
                    sortedCallbacksCache.delete(event);
                    cacheValidFlags.delete(event);
                }
            }
            
            metadata.delete(callback);
        }
        
        // 只在有钩子和确实删除了监听器时执行后置钩子
        const afterHooks = hooks.afterOff;
        if (removed && afterHooks.length > 0) {
            const hookData = { event, callback, removed, meta };
            for (let i = 0; i < afterHooks.length; i++) {
                afterHooks[i](hookData);
            }
        }
        
        triggerDebug('off', { event, removed, meta });
        
        return removed;
    }

    /**
     * 添加一次性事件监听器
     */
    function once(event, callback, options = {}) {
        if (typeof callback !== 'function') {
            throw new TypeError('事件监听器必须是函数');
        }
        
        // 执行前置钩子
        let hookResult = { event, callback, options };
        for (const hook of hooks.beforeOnce) {
            const result = hook(hookResult);
            if (result === false) {
                triggerDebug('once-cancelled', { event, options });
                return () => false;
            }
            if (result && typeof result === 'object') {
                hookResult = { ...hookResult, ...result };
            }
        }
        
        event = hookResult.event;
        callback = hookResult.callback;
        options = hookResult.options;

        function wrapper(data) {
            off(event, wrapper);

            const result = metadata.get(wrapper).isWildcard ?
                callback(event, data) :
                callback(data);
                
            // 执行后置钩子
            for (const hook of hooks.afterOnce) {
                hook({ event, originalCallback: callback, data, result });
            }
            
            return result;
        }

        metadata.set(wrapper, {
            event,
            isWildcard: event === WILDCARD,
            isOnce: true,
            originalCallback: callback,
            priority: options.priority || 0,
            namespace: options.namespace,
            ...options // 存储其他选项
        });

        triggerDebug('once', { event, options });

        return on(event, wrapper, options);
    }

    /**
     * 触发事件 - 超级极限性能优化版本
     */
    function emit(event, data, options = null) {
        // 超快速路径: 缓存+优化判断
        // 1. 直接检查事件是否有监听器
        if (!listeners.has(event) && !listeners.has(WILDCARD)) {
            // 无监听器快速返回 - 跳过所有其他处理
            if (debugEnabled && hooks.debug.length > 0) {
                triggerDebug('emit-no-listeners', { event });
            }
            return false;
        }
        
        // 2. 前置钩子快速路径
        const beforeHooks = hooks.beforeEmit;
        const beforeHooksLen = beforeHooks.length;
        
        // 局部变量缓存 - 避免反复访问属性
        let eventToEmit = event;
        let dataToEmit = data;
        let optionsToUse = options;
        
        if (beforeHooksLen > 0) {
            // 仅在必要时才创建对象，避免GC压力
            const hookObj = { 
                event: eventToEmit, 
                data: dataToEmit, 
                options: optionsToUse || (Object.create(null))
            };
            
            // 手动展开循环迭代钩子 (通常钩子很少)
            let i = 0;
            while (i < beforeHooksLen) {
                const result = beforeHooks[i++](hookObj);
                
                if (result === false) {
                    if (debugEnabled && hooks.debug.length > 0) {
                        triggerDebug('emit-cancelled', { event: eventToEmit });
                    }
                    return false;
                }
                
                if (result && typeof result === 'object') {
                    // 直接修改对象而非创建新对象
                    if (result.event !== undefined) hookObj.event = result.event;
                    if (result.data !== undefined) hookObj.data = result.data;
                    if (result.options !== undefined) hookObj.options = result.options;
                }
                
                // 每次最多展开3个，减少循环开销
                if (i < beforeHooksLen) {
                    const result = beforeHooks[i++](hookObj);
                    if (result === false) {
                        if (debugEnabled) triggerDebug('emit-cancelled', { event: hookObj.event });
                        return false;
                    }
                    if (result && typeof result === 'object') {
                        if (result.event !== undefined) hookObj.event = result.event;
                        if (result.data !== undefined) hookObj.data = result.data;
                        if (result.options !== undefined) hookObj.options = result.options;
                    }
                }
                
                if (i < beforeHooksLen) {
                    const result = beforeHooks[i++](hookObj);
                    if (result === false) {
                        if (debugEnabled) triggerDebug('emit-cancelled', { event: hookObj.event });
                        return false;
                    }
                    if (result && typeof result === 'object') {
                        if (result.event !== undefined) hookObj.event = result.event;
                        if (result.data !== undefined) hookObj.data = result.data;
                        if (result.options !== undefined) hookObj.options = result.options;
                    }
                }
            }
            
            // 从钩子对象更新变量
            eventToEmit = hookObj.event;
            dataToEmit = hookObj.data;
            optionsToUse = hookObj.options;
        } else if (!optionsToUse) {
            // 快速路径：使用无原型对象
            optionsToUse = Object.create(null);
        }
        
        // 3. 获取回调 - 缓存优化
        let callbacks;
        const isCacheValid = cacheValidFlags.get(eventToEmit);
        
        if (isCacheValid) {
            callbacks = sortedCallbacksCache.get(eventToEmit);
            // 缓存命中但为空数组时快速返回
            if (!callbacks || callbacks.length === 0) {
                if (debugEnabled) triggerDebug('emit-no-listeners', { event: eventToEmit });
                return false;
            }
        } else {
            callbacks = getSortedCallbacks(eventToEmit);
            
            // 缓存策略：只缓存有回调的事件
            if (callbacks.length > 0) {
                sortedCallbacksCache.set(eventToEmit, callbacks);
                cacheValidFlags.set(eventToEmit, true);
            } else {
                if (debugEnabled) triggerDebug('emit-no-listeners', { event: eventToEmit });
                return false;
            }
        }
        
        // 4. 执行回调 - 极限优化路径
        const callbacksLength = callbacks.length;
        const isSync = !!optionsToUse.sync;
        
        // 特殊优化：只有1个回调的常见情况
        if (callbacksLength === 1) {
            const singleCallback = callbacks[0];
            const meta = metadata.get(singleCallback);
            
            function executeSingle() {
                try {
                    if (meta && meta.isWildcard) {
                        return singleCallback(eventToEmit, dataToEmit);
                    } else {
                        return singleCallback(dataToEmit);
                    }
                } catch (error) {
                    console.error(`事件监听器错误 (${eventToEmit}):`, error);
                    if (debugEnabled) triggerDebug('listener-error', { event: eventToEmit, error });
                    return undefined;
                }
            }
            
            // 同步/异步处理
            let result;
            if (isSync) {
                result = executeSingle();
            } else {
                // 使用最高效的异步API
                if (typeof queueMicrotask === 'function') {
                    queueMicrotask(executeSingle);
                } else if (typeof Promise !== 'undefined') {
                    Promise.resolve().then(executeSingle);
                } else {
                    setTimeout(executeSingle, 0);
                }
            }
            
            // 后置钩子处理
            const afterHooks = hooks.afterEmit;
            const afterHooksLen = afterHooks.length;
            if (debugEnabled || afterHooksLen > 0) {
                if (debugEnabled) {
                    triggerDebug('emit', { 
                        event: eventToEmit, 
                        listenersCount: 1,
                        sync: isSync 
                    });
                }
                
                if (afterHooksLen > 0) {
                    const hookData = { 
                        event: eventToEmit, 
                        data: dataToEmit, 
                        options: optionsToUse, 
                        callbackResults: isSync ? [result] : null 
                    };
                    
                    for (let i = 0; i < afterHooksLen; i++) {
                        afterHooks[i](hookData);
                    }
                }
            }
            
            return true;
        }
        
        // 5. 处理多个回调
        function executeCallbacks() {
            const results = isSync ? new Array(callbacksLength) : null;
            
            // 小规模循环展开优化
            if (callbacksLength <= 4) {
                // 展开处理2-4个回调的情况
                let i = 0;
                try {
                    const callback0 = callbacks[0];
                    const meta0 = metadata.get(callback0);
                    const result0 = meta0 && meta0.isWildcard ? 
                        callback0(eventToEmit, dataToEmit) : callback0(dataToEmit);
                    if (results) results[0] = result0;
                } catch (error) {
                    console.error(`事件监听器错误 (${eventToEmit}):`, error);
                    if (debugEnabled) triggerDebug('listener-error', { event: eventToEmit, error });
                }
                
                if (callbacksLength > 1) {
                    try {
                        const callback1 = callbacks[1];
                        const meta1 = metadata.get(callback1);
                        const result1 = meta1 && meta1.isWildcard ? 
                            callback1(eventToEmit, dataToEmit) : callback1(dataToEmit);
                        if (results) results[1] = result1;
                    } catch (error) {
                        console.error(`事件监听器错误 (${eventToEmit}):`, error);
                        if (debugEnabled) triggerDebug('listener-error', { event: eventToEmit, error });
                    }
                }
                
                if (callbacksLength > 2) {
                    try {
                        const callback2 = callbacks[2];
                        const meta2 = metadata.get(callback2);
                        const result2 = meta2 && meta2.isWildcard ? 
                            callback2(eventToEmit, dataToEmit) : callback2(dataToEmit);
                        if (results) results[2] = result2;
                    } catch (error) {
                        console.error(`事件监听器错误 (${eventToEmit}):`, error);
                        if (debugEnabled) triggerDebug('listener-error', { event: eventToEmit, error });
                    }
                }
                
                if (callbacksLength > 3) {
                    try {
                        const callback3 = callbacks[3];
                        const meta3 = metadata.get(callback3);
                        const result3 = meta3 && meta3.isWildcard ? 
                            callback3(eventToEmit, dataToEmit) : callback3(dataToEmit);
                        if (results) results[3] = result3;
                    } catch (error) {
                        console.error(`事件监听器错误 (${eventToEmit}):`, error);
                        if (debugEnabled) triggerDebug('listener-error', { event: eventToEmit, error });
                    }
                }
            } else {
                // 标准多回调处理：分批处理大量回调
                for (let i = 0; i < callbacksLength;) {
                    try {
                        const callback = callbacks[i];
                        const meta = metadata.get(callback);
                        let result;
                        
                        if (meta && meta.isWildcard) {
                            result = callback(eventToEmit, dataToEmit);
                        } else {
                            result = callback(dataToEmit);
                        }
                        
                        if (results) results[i] = result;
                    } catch (error) {
                        console.error(`事件监听器错误 (${eventToEmit}):`, error);
                        if (debugEnabled) triggerDebug('listener-error', { event: eventToEmit, error });
                    }
                    i++;
                    
                    // 每批处理4个回调
                    const batchEnd = Math.min(i + 3, callbacksLength);
                    while (i < batchEnd) {
                        try {
                            const callback = callbacks[i];
                            const meta = metadata.get(callback);
                            let result;
                            
                            if (meta && meta.isWildcard) {
                                result = callback(eventToEmit, dataToEmit);
                            } else {
                                result = callback(dataToEmit);
                            }
                            
                            if (results) results[i] = result;
                        } catch (error) {
                            console.error(`事件监听器错误 (${eventToEmit}):`, error);
                            if (debugEnabled) triggerDebug('listener-error', { event: eventToEmit, error });
                        }
                        i++;
                    }
                }
            }
            
            return results;
        }
        
        // 执行同步/异步回调
        let callbackResults = null;
        if (isSync) {
            callbackResults = executeCallbacks();
        } else {
            if (typeof queueMicrotask === 'function') {
                queueMicrotask(executeCallbacks);
            } else if (typeof Promise !== 'undefined') {
                Promise.resolve().then(executeCallbacks);
            } else {
                setTimeout(executeCallbacks, 0);
            }
        }
        
        // 处理后置钩子和调试
        if (debugEnabled || hooks.afterEmit.length > 0) {
            if (debugEnabled) {
                triggerDebug('emit', { 
                    event: eventToEmit, 
                    listenersCount: callbacksLength,
                    sync: isSync,
                    options: optionsToUse 
                });
            }
            
            const afterHooks = hooks.afterEmit;
            const afterHooksLen = afterHooks.length;
            if (afterHooksLen > 0) {
                const hookData = { 
                    event: eventToEmit, 
                    data: dataToEmit, 
                    options: optionsToUse, 
                    callbackResults: isSync ? callbackResults : null 
                };
                
                for (let i = 0; i < afterHooksLen; i++) {
                    afterHooks[i](hookData);
                }
            }
        }
        
        return true;
    }

    /**
     * 获取排序后的回调数组 - 超级优化版本
     * @private
     */
    function getSortedCallbacks(event) {
        const specificCallbacks = listeners.get(event);
        const wildcardCallbacks = event !== WILDCARD ? listeners.get(WILDCARD) : null;

        // 快速判断: 使用位运算检查回调存在 (||替换为|)
        // 位运算在此处更快，因为只需要检查是否至少有一个为真
        const hasSpecificCallbacks = specificCallbacks && specificCallbacks.size > 0;
        const hasWildcardCallbacks = wildcardCallbacks && wildcardCallbacks.size > 0;
        
        if (!(hasSpecificCallbacks | hasWildcardCallbacks)) {
            return [];
        }

        // 预分配数组容量计算优化
        let totalCallbacks = 0;
        
        if (hasSpecificCallbacks) {
            // 使用迭代器避免创建中间数组
            const setsIterator = specificCallbacks.values();
            let current = setsIterator.next();
            while (!current.done) {
                totalCallbacks += current.value.size;
                current = setsIterator.next();
            }
        }
        
        if (hasWildcardCallbacks) {
            // 同样使用迭代器
            const setsIterator = wildcardCallbacks.values();
            let current = setsIterator.next();
            while (!current.done) {
                totalCallbacks += current.value.size;
                current = setsIterator.next();
            }
        }
        
        // 微优化: 针对小数据量场景的快速路径
        if (totalCallbacks === 0) {
            return [];
        } else if (totalCallbacks === 1) {
            // 单回调特殊优化：直接返回单元素数组
            const result = new Array(1);
            if (hasSpecificCallbacks) {
                for (const callbackSet of specificCallbacks.values()) {
                    if (callbackSet.size > 0) {
                        result[0] = callbackSet.values().next().value;
                        return result;
                    }
                }
            }
            // 如果没找到，肯定在通配符中
            for (const callbackSet of wildcardCallbacks.values()) {
                if (callbackSet.size > 0) {
                    result[0] = callbackSet.values().next().value;
                    return result;
                }
            }
        }
        
        // 常见情况快速路径 (6个或更少的回调)
        if (totalCallbacks <= 6) {
            const callbacks = new Array(totalCallbacks);
            let index = 0;
            
            // 直接用特定优先级简化的排序逻辑
            const allPriorities = [];
            
            if (hasSpecificCallbacks) {
                for (const priority of specificCallbacks.keys()) {
                    allPriorities.push([priority, true]); // true表示特定事件
                }
            }
            
            if (hasWildcardCallbacks) {
                for (const priority of wildcardCallbacks.keys()) {
                    allPriorities.push([priority, false]); // false表示通配符
                }
            }
            
            // 内联排序，避免重复比较
            allPriorities.sort((a, b) => b[0] - a[0]);
            
            // 填充回调数组
            for (let i = 0; i < allPriorities.length; i++) {
                const [priority, isSpecific] = allPriorities[i];
                const source = isSpecific ? specificCallbacks : wildcardCallbacks;
                const callbackSet = source.get(priority);
                
                for (const callback of callbackSet) {
                    callbacks[index++] = callback;
                }
            }
            
            return callbacks;
        }
        
        // 数量较大时使用高效数组预分配
        const callbacks = new Array(totalCallbacks);
        const allEntries = new Array(totalCallbacks);
        let entriesIndex = 0;
        
        // 使用移位操作为优先级添加偏移，确保特定事件优先级高于通配符
        // 前31位为优先级，最低1位标记是否为特定事件
        if (hasSpecificCallbacks) {
            for (const [priority, callbackSet] of specificCallbacks.entries()) {
                for (const callback of callbackSet) {
                    // 设置特定事件标记位为1
                    allEntries[entriesIndex++] = [(priority << 1) | 1, callback];
                }
            }
        }
        
        if (hasWildcardCallbacks) {
            for (const [priority, callbackSet] of wildcardCallbacks.entries()) {
                for (const callback of callbackSet) {
                    // 设置通配符标记位为0
                    allEntries[entriesIndex++] = [priority << 1, callback];
                }
            }
        }
        
        // 位运算排序：同优先级时特定事件优先
        allEntries.sort((a, b) => b[0] - a[0]);
        
        // 提取排序后的回调
        for (let i = 0; i < totalCallbacks; i++) {
            callbacks[i] = allEntries[i][1];
        }
        
        return callbacks;
    }

    /**
     * 移除所有事件监听器
     */
    function removeAllListeners(event) {
        if (event) {
            const result = listeners.delete(event);
            triggerDebug('remove-all-listeners', { event, success: result });
            return result;
        } else {
            listeners.clear();
            triggerDebug('remove-all-listeners', { allEvents: true });
            return true;
        }
    }

    /**
     * 获取特定事件的监听器数量
     */
    function listenerCount(event) {
        const eventListeners = listeners.get(event);
        if (!eventListeners) return 0;
        
        let count = 0;
        for (const priorityGroup of eventListeners.values()) {
            count += priorityGroup.size;
        }
        return count;
    }

    /**
     * 获取所有注册的事件名称
     */
    function eventNames() {
        return Array.from(listeners.keys());
    }

    /**
     * 按命名空间移除事件监听器
     */
    function offByNamespace(namespace) {
        if (!namespace) return false;
        
        let removed = false;
        
        // 遍历所有事件和监听器
        for (const [eventName, eventListeners] of listeners.entries()) {
            for (const [priority, priorityGroup] of eventListeners.entries()) {
                const toRemove = [];
                
                // 找出匹配命名空间的监听器
                for (const callback of priorityGroup) {
                    const meta = metadata.get(callback);
                    if (meta && meta.namespace === namespace) {
                        toRemove.push(callback);
                    }
                }
                
                // 移除找到的监听器
                for (const callback of toRemove) {
                    priorityGroup.delete(callback);
                    metadata.delete(callback);
                    removed = true;
                }
                
                // 清理空集合
                if (priorityGroup.size === 0) {
                    eventListeners.delete(priority);
                }
            }
            
            // 清理空事件
            if (eventListeners.size === 0) {
                listeners.delete(eventName);
            }
        }
        
        triggerDebug('off-by-namespace', { namespace, removed });
        return removed;
    }

    /**
     * 扩展事件总线功能
     * @param {string} name - 扩展名称
     * @param {Object} implementation - 扩展实现
     * @param {string[]} [dependencies] - 依赖的其他扩展
     * @returns {Object} - 扩展后的事件总线实例
     */
    function extend(name, implementation, dependencies = []) {
        if (extensions[name]) {
            console.warn(`扩展'${name}'已存在，将被覆盖`);
        }
        
        // 记录依赖关系
        extensionDependencies.set(name, dependencies);
        
        // 检查依赖是否已安装
        for (const dep of dependencies) {
            if (!extensions[dep]) {
                throw new Error(`扩展'${name}'依赖的'${dep}'未安装，请先安装依赖`);
            }
        }

        // 将扩展存储在扩展库中
        extensions[name] = implementation;

        // 创建扩展上下文，提供给扩展使用
        const extensionContext = {
            eventBus,
            internal: {
                listeners,
                metadata,
                WILDCARD,
                hooks
            },
            // 提供对其他已安装扩展的访问
            getExtension: (extName) => extensions[extName],
            // 添加钩子函数
            addHook: (hookType, handler) => {
                if (!hooks[hookType]) hooks[hookType] = [];
                hooks[hookType].push(handler.bind(extensionContext));
                return () => removeHook(hookType, handler);
            },
            // 调试工具支持
            debug: {
                log: (type, data) => triggerDebug(`${name}:${type}`, data),
                isEnabled: () => debugEnabled
            }
        };

        // 如果扩展提供了init方法，则执行它
        if (typeof implementation.init === 'function') {
            implementation.init(extensionContext);
        }

        // 将扩展的公共方法添加到eventBus
        if (implementation.methods) {
            Object.entries(implementation.methods).forEach(([methodName, method]) => {
                if (eventBus[methodName] && methodName !== 'extend') {
                    console.warn(`方法'${methodName}'已存在，将被扩展'${name}'覆盖`);
                }
                eventBus[methodName] = method.bind(extensionContext);
            });
        }

        // 注册扩展提供的钩子
        if (implementation.hooks) {
            Object.entries(implementation.hooks).forEach(([hookName, handler]) => {
                if (hooks[hookName]) {
                    hooks[hookName].push(handler.bind(extensionContext));
                }
            });
        }

        triggerDebug('extension-loaded', { name, dependencies });
        return eventBus;
    }

    /**
     * 移除特定钩子
     * @private
     */
    function removeHook(type, handler) {
        if (hooks[type]) {
            const index = hooks[type].indexOf(handler);
            if (index !== -1) {
                hooks[type].splice(index, 1);
                return true;
            }
        }
        return false;
    }

    return eventBus;
}





/**
 * 创建中文事件总线
 * @returns {Object} 事件总线实例
 */
export function 创建事件总线() {
    // 使用原始英文API创建事件总线
    const 原始事件总线 = createEventBus();
    
    // 中文方法映射表
    const 中文事件总线 = {
        // 基础事件API
        监听: 原始事件总线.on,
        注册: 原始事件总线.on, // 别名
        取消监听: 原始事件总线.off,
        解除监听: 原始事件总线.off, // 别名
        单次监听: 原始事件总线.once,
        一次性监听: 原始事件总线.once, // 别名
        触发: 原始事件总线.emit,
        发布: 原始事件总线.emit, // 别名
        
        // 管理类方法
        移除所有监听器: 原始事件总线.removeAllListeners,
        获取监听器数量: 原始事件总线.listenerCount,
        获取事件名列表: 原始事件总线.eventNames,
        按命名空间解除: 原始事件总线.offByNamespace,
        
        // 扩展与调试
        扩展: 原始事件总线.extend,
        启用调试: 原始事件总线.enableDebug,
        关闭调试: 原始事件总线.disableDebug,
        
        // 保留原始方法以兼容现有代码
        ...原始事件总线
    };
    
    return 中文事件总线;
}