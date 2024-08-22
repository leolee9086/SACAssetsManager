// 空闲队列,先进后出
export function idleIdle(callback, idleOptions = { deadline: 50, timeout: 1000 }) {
    // 调用 requestIdleCallback 并传递自定义的回调函数
    requestIdleCallback((deadlineTime) => {
        // 计算当前时间与浏览器认为的空闲时间结束的时间差
        const timeRemaining = deadlineTime.timeRemaining()
        // 如果剩余时间小于或等于 deadline，则执行回调
        if (timeRemaining >= idleOptions.deadline) {
            callback(timeRemaining);
        } else {

            // 否则，重新调度自己到下一轮空闲时段
            idleIdle(callback, idleOptions);
        }
    }, { timeout: idleOptions.timeout }); // 设置超时时间，以防浏览器没有空闲时间
}

export function $idleIdle(callback, idleOptions = { deadline: 50, timeout: 1000 }) {
    requestIdleCallback(callback, idleOptions)
}