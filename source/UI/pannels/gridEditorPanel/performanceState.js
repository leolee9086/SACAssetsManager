// 性能统计相关
export const createPerfStats = () => ({
    totalCalls: 0,
    totalTime: 0,
    maxTime: 0,
    minTime: Infinity
})
export const updatePerfStats = (stats, renderTime) => {
    stats.totalCalls++
    stats.totalTime += renderTime
    stats.maxTime = Math.max(stats.maxTime, renderTime)
    stats.minTime = Math.min(stats.minTime, renderTime)
    if (stats.totalCalls % 10 === 0) {
        console.log('网格渲染性能统计:', {
            调用次数: stats.totalCalls,
            平均渲染时间: `${(stats.totalTime / stats.totalCalls).toFixed(2)}ms`,
            最长渲染时间: `${stats.maxTime.toFixed(2)}ms`,
            最短渲染时间: `${stats.minTime.toFixed(2)}ms`
        })
    }
}

