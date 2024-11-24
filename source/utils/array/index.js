export const 异步清理重复元素 = async (数组, 批次大小 = 1000) => {
    // 使用 Set 先进行基础去重
    const 去重集合 = new Set();
    // 分批处理数组
    for (let i = 0; i < 数组.length; i += 批次大小) {
        // 使用 setTimeout 让出主线程，防止阻塞
        await new Promise(resolve => setTimeout(resolve, 0));
        // 获取当前批次的数据
        const 当前批次 = 数组.slice(i, i + 批次大小);
        // 将当前批次添加到 Set 中
        当前批次.forEach(项 => 去重集合.add(项));
    }
    return Array.from(去重集合);
}

export const 异步映射 = async (数组, 映射函数) => {
    // 使用 Promise.all 并行处理所有元素
    const 结果数组 = await Promise.all(
        数组.map(async (项) => {
            // 让出主线程
            await new Promise(resolve => setTimeout(resolve, 0));
            return await 映射函数(项);
        })
    );
    return 结果数组;
}