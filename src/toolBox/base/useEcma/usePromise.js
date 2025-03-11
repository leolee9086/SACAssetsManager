/**
 * 带重试机制执行异步函数
 * @param {Function} 异步函数 - 要执行的异步函数
 * @param {Object} 配置 - 配置选项
 * @param {number} 配置.重试次数 - 最大重试次数，默认3次
 * @param {number} 配置.重试延迟 - 重试间隔时间(毫秒)，默认1000ms
 * @returns {Promise<any>} 异步函数执行结果
 */
export async function 带重试执行异步函数(异步函数, 配置 = {}) {
    let 当前重试次数 = 配置.重试次数 || 3;
    let 最后错误 = null;

    while (当前重试次数 >= 0) {
        try {
            return await 异步函数();
        } catch (错误) {
            最后错误 = 错误;
            console.error(`执行失败 (剩余重试次数: ${当前重试次数}):`, 错误);

            if (当前重试次数 > 0) {
                await new Promise(resolve => setTimeout(resolve, 配置.重试延迟 || 1000));
                当前重试次数--;
                continue;
            }

            throw new Error(`执行失败: ${最后错误.message}`);
        }
    }
}

/**
 * 带超时的Promise
 * @param {Promise} 原始Promise - 需要添加超时的Promise
 * @param {number} 超时时间 - 超时时间(毫秒)
 * @param {string} 超时信息 - 超时时抛出的错误信息
 * @returns {Promise<any>} 带超时限制的Promise
 */
export function 带超时Promise(原始Promise, 超时时间 = 5000, 超时信息 = '操作超时') {
    const 超时Promise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(超时信息)), 超时时间);
    });
    return Promise.race([原始Promise, 超时Promise]);
}

/**
 * 顺序执行Promise数组
 * @param {Function[]} 任务数组 - 返回Promise的函数数组
 * @returns {Promise<any[]>} 所有Promise结果的数组
 */
export async function 顺序执行(任务数组) {
    const 结果数组 = [];
    for (const 任务 of 任务数组) {
        结果数组.push(await 任务());
    }
    return 结果数组;
}

/**
 * 控制并发数的Promise执行器
 * @param {Function[]} 任务数组 - 返回Promise的函数数组
 * @param {number} 并发数 - 最大并发执行数量
 * @returns {Promise<any[]>} 所有Promise结果的数组
 */
export async function 限制并发执行(任务数组, 并发数 = 3) {
    const 结果数组 = [];
    const 执行中任务 = [];
    
    for (let i = 0; i < 任务数组.length; i++) {
        const 任务Promise = 任务数组[i]();
        const 任务包装 = 任务Promise.then(结果 => {
            结果数组[i] = 结果;
            执行中任务.splice(执行中任务.indexOf(任务包装), 1);
        });
        
        执行中任务.push(任务包装);
        
        if (执行中任务.length >= 并发数) {
            await Promise.race(执行中任务);
        }
    }
    
    await Promise.all(执行中任务);
    return 结果数组;
}

/**
 * 创建可取消的Promise
 * @param {Function} 异步函数 - 接收取消函数作为参数的异步函数
 * @returns {Object} 包含Promise和取消函数的对象
 */
export function 可取消Promise(异步函数) {
    let 取消函数;
    
    const promise = new Promise((resolve, reject) => {
        取消函数 = () => {
            reject(new Error('操作已取消'));
        };
        
        异步函数(取消函数).then(resolve).catch(reject);
    });
    
    return { promise, 取消: 取消函数 };
}

/**
 * 轮询直到条件满足
 * @param {Function} 检查函数 - 返回Promise的检查条件函数
 * @param {Object} 配置 - 配置选项
 * @param {number} 配置.间隔时间 - 轮询间隔(毫秒)，默认1000ms
 * @param {number} 配置.超时时间 - 最大轮询时间(毫秒)，默认60000ms
 * @returns {Promise<any>} 满足条件时的返回值
 */
export async function 轮询直到满足(检查函数, 配置 = {}) {
    const 间隔时间 = 配置.间隔时间 || 1000;
    const 超时时间 = 配置.超时时间 || 60000;
    const 开始时间 = Date.now();
    
    while (Date.now() - 开始时间 < 超时时间) {
        const 结果 = await 检查函数();
        if (结果) {
            return 结果;
        }
        await new Promise(resolve => setTimeout(resolve, 间隔时间));
    }
    
    throw new Error('轮询超时');
}

/**
 * 缓存Promise结果
 * @param {Function} 异步函数 - 要缓存结果的异步函数
 * @param {Function} 生成键函数 - 根据参数生成缓存键的函数
 * @param {number} 缓存时间 - 缓存有效期(毫秒)，默认为5分钟
 * @returns {Function} 带缓存的异步函数
 */
export function 缓存Promise结果(异步函数, 生成键函数 = (...args) => JSON.stringify(args), 缓存时间 = 5 * 60 * 1000) {
    const 缓存 = new Map();
    
    return async function(...参数) {
        const 缓存键 = 生成键函数(...参数);
        const 当前时间 = Date.now();
        
        if (缓存.has(缓存键)) {
            const { 数据, 过期时间 } = 缓存.get(缓存键);
            if (过期时间 > 当前时间) {
                return 数据;
            }
            缓存.delete(缓存键);
        }
        
        const 结果 = await 异步函数(...参数);
        缓存.set(缓存键, {
            数据: 结果,
            过期时间: 当前时间 + 缓存时间
        });
        
        return 结果;
    };
}

/**
 * 带进度的Promise
 * @param {Function} 异步函数 - 接收进度回调的异步函数
 * @param {Function} 进度回调 - 处理进度更新的回调函数
 * @returns {Promise<any>} 异步操作的结果
 */
export function 带进度Promise(异步函数, 进度回调) {
    return new Promise((resolve, reject) => {
        异步函数(进度 => {
            try {
                进度回调(进度);
            } catch (错误) {
                console.error('进度回调错误:', 错误);
            }
        }).then(resolve).catch(reject);
    });
}

/**
 * 处理多个Promise，即使部分失败也返回所有结果
 * @param {Promise[]} promises - Promise数组
 * @returns {Promise<Array<{状态: string, 数据?: any, 错误?: Error}>>} 处理结果数组
 */
export async function 处理多个Promise(promises) {
    return Promise.all(promises.map(async promise => {
        try {
            const 数据 = await promise;
            return { 状态: '成功', 数据 };
        } catch (错误) {
            return { 状态: '失败', 错误 };
        }
    }));
}

/**
 * 带钩子的Promise - 在Promise生命周期的不同阶段执行钩子函数
 * @param {Function} 异步函数 - 要执行的异步函数
 * @param {Object} 钩子对象 - 包含各个生命周期钩子的对象
 * @param {Function} [钩子对象.执行前] - Promise执行前调用
 * @param {Function} [钩子对象.成功时] - Promise成功时调用，接收结果作为参数
 * @param {Function} [钩子对象.失败时] - Promise失败时调用，接收错误作为参数
 * @param {Function} [钩子对象.完成后] - 无论成功失败都会调用
 * @returns {Promise<any>} 异步函数的执行结果
 */
export async function 带钩子Promise(异步函数, 钩子对象 = {}) {
    const { 执行前, 成功时, 失败时, 完成后 } = 钩子对象;
    
    if (typeof 执行前 === 'function') {
        await Promise.resolve(执行前());
    }
    
    try {
        const 结果 = await 异步函数();
        
        if (typeof 成功时 === 'function') {
            await Promise.resolve(成功时(结果));
        }
        
        return 结果;
    } catch (错误) {
        if (typeof 失败时 === 'function') {
            await Promise.resolve(失败时(错误));
        }
        
        throw 错误;
    } finally {
        if (typeof 完成后 === 'function') {
            await Promise.resolve(完成后());
        }
    }
}

/**
 * 创建可扩展的Promise管道 - 通过钩子链接多个Promise处理步骤
 * @param {Function[]} 处理函数数组 - 一系列Promise处理函数
 * @param {Object} 全局钩子 - 应用于整个管道的钩子
 * @returns {Function} 返回一个接收初始值并执行整个管道的函数
 */
export function Promise管道(处理函数数组 = [], 全局钩子 = {}) {
    return async function(初始值) {
        if (typeof 全局钩子.管道开始 === 'function') {
            await Promise.resolve(全局钩子.管道开始(初始值));
        }
        
        let 当前值 = 初始值;
        let 管道位置 = 0;
        
        try {
            for (const 处理函数 of 处理函数数组) {
                if (typeof 全局钩子.步骤开始 === 'function') {
                    await Promise.resolve(全局钩子.步骤开始(当前值, 管道位置));
                }
                
                当前值 = await 处理函数(当前值);
                
                if (typeof 全局钩子.步骤完成 === 'function') {
                    await Promise.resolve(全局钩子.步骤完成(当前值, 管道位置));
                }
                
                管道位置++;
            }
            
            if (typeof 全局钩子.管道成功 === 'function') {
                await Promise.resolve(全局钩子.管道成功(当前值));
            }
            
            return 当前值;
        } catch (错误) {
            if (typeof 全局钩子.管道错误 === 'function') {
                await Promise.resolve(全局钩子.管道错误(错误, 管道位置));
            }
            
            throw 错误;
        } finally {
            if (typeof 全局钩子.管道结束 === 'function') {
                await Promise.resolve(全局钩子.管道结束(管道位置));
            }
        }
    };
}

/**
 * 创建带事件监听的Promise
 * @param {Function} 异步函数 - 要执行的异步函数
 * @returns {Object} 包含promise和事件发射器的对象
 */
export function 带事件Promise(异步函数) {
    const 事件处理器 = {
        监听器: {},
        添加监听器(事件名称, 回调函数) {
            if (!this.监听器[事件名称]) {
                this.监听器[事件名称] = [];
            }
            this.监听器[事件名称].push(回调函数);
            return this; // 支持链式调用
        },
        触发事件(事件名称, 数据) {
            if (this.监听器[事件名称]) {
                for (const 回调 of this.监听器[事件名称]) {
                    回调(数据);
                }
            }
        }
    };
    
    const promise = (async () => {
        事件处理器.触发事件('开始', null);
        try {
            const 结果 = await 异步函数((事件名称, 数据) => {
                事件处理器.触发事件(事件名称, 数据);
            });
            事件处理器.触发事件('成功', 结果);
            return 结果;
        } catch (错误) {
            事件处理器.触发事件('错误', 错误);
            throw 错误;
        } finally {
            事件处理器.触发事件('完成', null);
        }
    })();
    
    return {
        promise,
        事件: 事件处理器
    };
}