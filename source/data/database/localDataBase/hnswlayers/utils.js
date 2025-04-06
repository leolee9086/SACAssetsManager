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
    
    // 初始化重建时间记录和重建计数器
    if (!globalObj._lastRebuildTimes) {
        globalObj._lastRebuildTimes = {};
    }
    
    if (!globalObj._rebuildCounts) {
        globalObj._rebuildCounts = {};
    }
    
    // 对特定ID的重建，防止短时间内重复重建同一ID
    if (id) {
        const 上次重建时间 = globalObj._lastRebuildTimes[id] || 0;
        const 当前时间 = Date.now();
        // 增加重建计数
        globalObj._rebuildCounts[id] = (globalObj._rebuildCounts[id] || 0) + 1;
        const 重建次数 = globalObj._rebuildCounts[id];
        
        // 动态调整冷却时间，频繁重建的ID需要更长的冷却时间
        let 冷却时间 = 1000; // 默认1秒
        if (重建次数 > 5) {
            冷却时间 = Math.min(10000, 重建次数 * 1000); // 最多10秒
        }
        
        // 如果在冷却期内已经重建过，就跳过
        if (当前时间 - 上次重建时间 < 冷却时间) {
            console.log(`跳过数据项${id}的重建，因为刚刚在${当前时间 - 上次重建时间}ms前重建过（已重建${重建次数}次）`);
            
            // 对于频繁重建的节点，记录警告
            if (重建次数 > 10) {
                console.warn(`警告：数据项${id}重建频率异常高（${重建次数}次），可能存在图结构损坏或循环依赖`);
                
                // 每10次重建记录一次详细日志，避免日志过多
                if (重建次数 % 10 === 0) {
                    console.error(`数据项${id}的频繁重建可能表明存在问题：`, {
                        id: id,
                        重建次数: 重建次数,
                        上次重建时间: new Date(上次重建时间).toISOString(),
                        数据项: 数据集[id] ? '存在' : '不存在',
                        数据项详情: 数据集[id] ? JSON.stringify({
                            id: 数据集[id].id,
                            neighbors: 数据集[id].neighbors ? Object.keys(数据集[id].neighbors) : 'null'
                        }) : 'null'
                    });
                    
                    // 清理异常节点的计数器，给它一个重新开始的机会
                    if (重建次数 > 50) {
                        globalObj._rebuildCounts[id] = 0;
                    }
                }
            }
            
            return;
        }
        
        globalObj._lastRebuildTimes[id] = 当前时间;
        console.warn("正在重建数据项的层级映射", id);
        
        if (数据集[id]) {
            try {
                添加所有模型到hnsw层级映射(数据集[id], hnsw层级映射);
                console.log(`数据项${id}的层级映射重建完成`);
                
                // 重建成功后重置计数器
                globalObj._rebuildCounts[id] = 0;
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
    const 当前时间 = Date.now();
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
    // 检查数据项是否有neighbors属性
    if (!数据项 || !数据项.neighbors) {
        console.warn(`数据项不存在或没有neighbors属性 ID: ${数据项 ? 数据项.id : 'undefined'}`);
        return;
    }
    
    // 遍历数据项中的所有特征向量邻接表
    Object.keys(数据项.neighbors).forEach(邻接表领域 => {
        // 只处理与HNSW索引相关的邻接表
        if (!邻接表领域.endsWith('_hnsw')) {
            return;
        }
        
        // 从领域名称中提取模型名称
        const 模型名称 = 邻接表领域.replace('_hnsw', '');
        
        // 确保hnsw层级映射中有该模型的映射
        if (!hnsw层级映射[模型名称]) {
            hnsw层级映射[模型名称] = {};
        }
        
        // 获取该模型的邻接表数组
        const 邻接表数组 = 数据项.neighbors[邻接表领域];
        
        // 如果邻接表数组不存在或不是数组，跳过
        if (!Array.isArray(邻接表数组)) {
            console.warn(`数据项${数据项.id}的${邻接表领域}不是数组`);
            return;
        }
        
        // 确保每个层级的邻接表都有items属性
        邻接表数组.forEach(层级邻接表 => {
            if (!层级邻接表.items) {
                层级邻接表.items = [];
            }
            
            // 修复items中的无效项
            if (Array.isArray(层级邻接表.items)) {
                层级邻接表.items = 层级邻接表.items.filter(item => item && typeof item.id === 'string' && typeof item.distance === 'number');
            }
            
            // 从type字段中解析出层级值
            let 层级值 = 0;
            
            // 尝试从array索引中获取层级值
            const 层级索引 = 邻接表数组.indexOf(层级邻接表);
            if (层级索引 !== -1) {
                层级值 = 层级索引;
                // 如果没有显式的layer属性，使用索引作为层级
            }
            
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
    });
};
