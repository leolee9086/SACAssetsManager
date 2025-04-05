export const 获取随机层级 = (maxLevel, p = 1 / Math.E) => {
    return Math.floor(-Math.log(Math.random()) / Math.log(1 / p)) % (maxLevel + 1);
}
export function 获取数据项所在hnsw层级(数据项, 模型名称) {
    let hnsw索引名称 = 模型名称 + "_hnsw";
    if (!数据项.neighbors || !Array.isArray(数据项.neighbors[hnsw索引名称])) {
        // 处理错误或返回一个合理的默认值，例如 0 或 -1
        return -1; // 或者抛出一个错误
    }
    let 数据项hnsw邻接表 = 数据项.neighbors[hnsw索引名称];
    return Math.max(数据项hnsw邻接表.length - 1, 0);
}
export function 校验节点邻接结构(数据项, 模型名称) {
    let hnsw索引名称 = 模型名称 + "_hnsw";
    let 邻接表 = 数据项.neighbors[hnsw索引名称];
    if (!邻接表) {
        throw new Error(`数据项缺少 ${hnsw索引名称} 邻接表`);
    }
    // 假设有一个全局配置对象，其中包含每个层级的最大邻居数
    const 最大邻居数配置 = {/* 层级: 最大邻居数 */ };
    for (let 层级 = 0; 层级 < 邻接表.length; 层级++) {
        let 邻居信息 = 邻接表[层级];
        if (!邻居信息 || !Array.isArray(邻居信息.items)) {
            throw new Error(`层级 ${层级} 的邻居信息格式不正确`);
        }

        if (邻居信息.items.length > 最大邻居数配置[层级]) {
            throw new Error(`层级 ${层级} 的邻居数量超过最大限制`);
        }

        if (邻居信息.items.includes(数据项.id)) {
            throw new Error(`层级 ${层级} 的邻居列表中包含数据项自身`);
        }
    }
    // 如果所有检查都通过，则返回 true 表示邻接结构有效
    return true;
}
export const 重建数据集的层级映射 = (数据集, hnsw层级映射, id) => {
    // 使用全局变量存储上次重建时间，适用于浏览器和Node.js
    const globalObj = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : {};
    
    // 如果已经在短时间内尝试重建了这个ID对应的映射，就不再重复重建
    const 当前时间 = Date.now();
    if (!globalObj._lastRebuildTimes) {
        globalObj._lastRebuildTimes = {};
    }
    
    // 对特定ID的重建，防止短时间内重复重建同一ID
    if (id) {
        const 上次重建时间 = globalObj._lastRebuildTimes[id] || 0;
        // 如果在最近1秒内已经重建过，就跳过
        if (当前时间 - 上次重建时间 < 1000) {
            console.log(`跳过数据项${id}的重建，因为刚刚在${当前时间 - 上次重建时间}ms前重建过`);
            return;
        }
        
        globalObj._lastRebuildTimes[id] = 当前时间;
        console.warn("正在重建数据项的层级映射", id);
        
        if (数据集[id]) {
            try {
                添加所有模型到hnsw层级映射(数据集[id], hnsw层级映射);
                console.log(`数据项${id}的层级映射重建完成`);
            } catch (e) {
                console.error(`重建数据项${id}的层级映射时出错:`, e);
            }
        } else {
            console.warn(`找不到ID为${id}的数据项，无法重建其层级映射`);
        }
        return;
    }
    
    // 全局重建映射的防重复机制
    const 全局重建键 = '全局重建';
    const 上次全局重建时间 = globalObj._lastRebuildTimes[全局重建键] || 0;
    if (当前时间 - 上次全局重建时间 < 5000) { // 5秒内不重复全局重建
        console.log(`跳过全局重建，因为刚刚在${当前时间 - 上次全局重建时间}ms前重建过`);
        return;
    }
    
    globalObj._lastRebuildTimes[全局重建键] = 当前时间;
    console.warn("正在重建全部数据集的层级映射");
    
    // 遍历数据集中的每一项数据项，立即处理而不使用setTimeout
    const 数据项列表 = Object.values(数据集);
    let 处理计数 = 0;
    
    // 批量处理数据项，避免大数据集导致的性能问题
    const 批量处理数据项 = (起始索引, 批量大小) => {
        const 结束索引 = Math.min(起始索引 + 批量大小, 数据项列表.length);
        
        for (let i = 起始索引; i < 结束索引; i++) {
            try {
                添加所有模型到hnsw层级映射(数据项列表[i], hnsw层级映射);
                处理计数++;
            } catch (e) {
                console.error(`处理数据项${数据项列表[i].id}时出错:`, e);
            }
        }
        
        // 如果还有未处理的数据项，安排下一批次
        if (结束索引 < 数据项列表.length) {
            setTimeout(() => 批量处理数据项(结束索引, 批量大小), 0);
        } else {
            console.log(`全部数据集的层级映射重建完成，共处理${处理计数}个数据项`);
        }
    };
    
    // 开始批量处理，每批50个
    批量处理数据项(0, 50);
};
export const 添加所有模型到hnsw层级映射 = (数据项, hnsw层级映射) => {
    // 防御性检查
    if (!数据项 || !数据项.vector || !数据项.id) {
        console.warn("添加到层级映射时发现无效数据项", 数据项);
        return;
    }
    
    // 遍历数据项的vector字段中的每个模型名称
    for (let 模型名称 in 数据项.vector) {
        if (!数据项.vector.hasOwnProperty(模型名称)) continue;
        
        // 获取hnsw索引名称
        let hnsw索引名称 = `${模型名称}_hnsw`;
        
        // 检查数据项是否有对应模型名称的邻接表
        if (!数据项.neighbors || !数据项.neighbors[hnsw索引名称]) {
            console.warn(`数据项${数据项.id}缺少${hnsw索引名称}邻接表`);
            continue;
        }
        
        // 确保hnsw层级映射为该模型名称初始化了一个对象
        if (!hnsw层级映射[模型名称]) {
            hnsw层级映射[模型名称] = {};
        }
        
        //修复邻接表结构
        const 邻接表数组 = 数据项.neighbors[hnsw索引名称];
        if (!Array.isArray(邻接表数组)) {
            console.warn(`数据项${数据项.id}的${hnsw索引名称}邻接表不是数组`);
            continue;
        }
        
        邻接表数组.forEach((层级邻接表, 索引) => {
            if (!层级邻接表) {
                console.warn(`数据项${数据项.id}的${hnsw索引名称}邻接表层级${索引}为空`);
                return;
            }
            
            // 确保items属性存在
            if (!层级邻接表.items) {
                层级邻接表.items = [];
            }
            
            // 过滤无效的邻居项
            try {
                层级邻接表.items = 层级邻接表.items
                    .filter(item => item && typeof item.id === 'string' || typeof item.id === 'number')
                    .filter(item => item && typeof item.distance === 'number')
                    .reduce((acc, item) => {
                        // 确保不会出现重复ID，并保留最近的邻居
                        if (!acc.some(x => x.id === item.id)) {
                            acc.push(item);
                        } else {
                            // 如果已存在相同ID，保留距离较小的那个
                            const 现有项索引 = acc.findIndex(x => x.id === item.id);
                            if (现有项索引 >= 0 && acc[现有项索引].distance > item.distance) {
                                acc[现有项索引] = item;
                            }
                        }
                        return acc;
                    }, []);
            } catch (e) {
                console.warn(`处理数据项${数据项.id}的邻居项时出错:`, e);
                层级邻接表.items = [];
            }
            
            // 设置或确认层级值
            let 层级值 = 索引; // 默认使用数组索引作为层级
            
            if (typeof 层级邻接表.type === 'string') {
                const layerMatch = 层级邻接表.type.match(/layer(\d+)/);
                if (layerMatch) {
                    层级值 = parseInt(layerMatch[1], 10);
                    层级邻接表.layer = 层级值;
                }
            }
            
            if (层级邻接表.layer === undefined) {
                层级邻接表.layer = 层级值;
            }
            
            // 确保hnsw层级映射在该层级有一个数组来存储ID
            if (!hnsw层级映射[模型名称][层级值]) {
                hnsw层级映射[模型名称][层级值] = [];
            }
            
            // 确保没有重复添加ID
            if (!hnsw层级映射[模型名称][层级值].includes(数据项.id)) {
                hnsw层级映射[模型名称][层级值].push(数据项.id);
            }
        });
    }
};
