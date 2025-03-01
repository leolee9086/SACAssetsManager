export const 异步清理重复元素 = async (数组, 批次大小 = 1000) => {
    const 去重集合 = new Set();
    for (let i = 0; i < 数组.length; i += 批次大小) {
        await new Promise(resolve => setTimeout(resolve, 0));
        const 当前批次 = 数组.slice(i, i + 批次大小);
        当前批次.forEach(项 => 去重集合.add(项));
    }
    return Array.from(去重集合);
}

// 按指定键值去重
export const 按键值异步去重 = async (数组, 键名, 批次大小 = 1000) => {
    const 去重映射 = new Map();
    for (let i = 0; i < 数组.length; i += 批次大小) {
        await new Promise(resolve => setTimeout(resolve, 0));
        const 当前批次 = 数组.slice(i, i + 批次大小);
        当前批次.forEach(项 => 去重映射.set(项[键名], 项));
    }
    return Array.from(去重映射.values());
}

// 获取重复元素
export const 获取重复项 = async (数组, 批次大小 = 1000) => {
    const 计数映射 = new Map();
    for (let i = 0; i < 数组.length; i += 批次大小) {
        await new Promise(resolve => setTimeout(resolve, 0));
        const 当前批次 = 数组.slice(i, i + 批次大小);
        当前批次.forEach(项 => {
            计数映射.set(项, (计数映射.get(项) || 0) + 1);
        });
    }
    return Array.from(计数映射.entries())
        .filter(([_, 计数]) => 计数 > 1)
        .map(([值, _]) => 值);
}

// 保留最后出现的重复项
export const 保留最后重复项 = async (数组, 批次大小 = 1000) => {
    const 反向数组 = [...数组].reverse();
    const 去重结果 = await 异步清理重复元素(反向数组, 批次大小);
    return 去重结果.reverse();
} 