# 索引工具集 (forIndex)

本目录包含各种高性能索引算法的实现，用于向量检索、数据索引和相似度搜索等场景。

## 分区式HNSW索引

分区式HNSW (Hierarchical Navigable Small World) 索引是一种支持大规模数据集的近似最近邻搜索算法实现。该实现在标准HNSW算法的基础上增加了分区管理机制，实现了动态增删、无缝分区加载与卸载的功能。

### 主要特性

- **分区管理**：自动将大规模数据集分割为多个分区，降低内存占用
- **动态加载/卸载**：根据使用情况智能管理内存中的分区数量
- **持久化支持**：可定制分区数据的保存和加载机制
- **高效搜索**：保持HNSW的对数时间复杂度近似最近邻搜索性能
- **无缝扩展**：可以不断添加新向量而无需重建整个索引

### 使用示例

```javascript
import { createPartitionedHNSW } from './usePartitionedHNSW.js';

// 创建分区式HNSW索引
const index = createPartitionedHNSW({
  // 分区配置
  partitionSize: 100000,           // 每个分区最多10万向量
  partitionsInMemory: 3,           // 内存中最多保留3个分区
  
  // 持久化回调函数
  persistCallback: async (partitionId, partitionData) => {
    // 将分区数据保存到文件系统或数据库
    await fs.writeFile(`partition_${partitionId}.json`, JSON.stringify(partitionData));
  },
  
  // 加载回调函数
  loadCallback: async (partitionId) => {
    // 从存储中加载分区数据
    try {
      const data = await fs.readFile(`partition_${partitionId}.json`, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      return null; // 分区不存在或加载失败
    }
  },
  
  // HNSW参数
  distanceFunction: 'euclidean',   // 距离函数类型：euclidean, cosine, innerProduct
  M: 16,                           // 每个节点最大连接数
  efConstruction: 200,             // 构建时的候选集大小
  efSearch: 50                     // 搜索时的候选集大小
});

// 添加向量到索引
const vectorId1 = await index.addVector([0.1, 0.2, 0.3, 0.4]);
const vectorId2 = await index.addVector([0.2, 0.3, 0.4, 0.5], { label: 'sample' });

// 批量添加向量
const vectors = [
  [0.3, 0.4, 0.5, 0.6],
  [0.4, 0.5, 0.6, 0.7]
];
const data = [{ label: 'batch1' }, { label: 'batch2' }];
const vectorIds = await index.batchAddVectors(vectors, data);

// 搜索最近邻
const queryVector = [0.2, 0.3, 0.4, 0.5];
const results = await index.search(queryVector, 5);
console.log(results);
// [
//   { id: 1, distance: 0.0, data: { label: 'sample' }, partitionId: 0 },
//   { id: 0, distance: 0.2, data: null, partitionId: 0 },
//   ...
// ]

// 删除向量
await index.removeVector(vectorId1);

// 获取分区信息
const partitionInfo = index.getPartitionInfo();
console.log(partitionInfo);

// 获取向量信息
const vectorInfo = await index.getVectorInfo(vectorId2);
console.log(vectorInfo);

// 强制保存所有分区
await index.saveAllPartitions();
```

### 运行完整示例

本目录包含一个完整的示例文件 `usePartitionedHNSWExample.js`，演示了分区式HNSW索引的所有主要功能。要运行此示例：

1. 确保您已安装Node.js环境
2. 在命令行中执行：

```bash
# 创建测试数据目录
mkdir -p ./data

# 运行示例
node --experimental-modules usePartitionedHNSWExample.js
```

示例会执行以下操作：
- 创建一个分区式HNSW索引实例
- 生成随机向量并添加到索引中
- 执行向量搜索并验证结果
- 测试删除向量功能
- 测试分区切换和持久化
- 显示详细的统计信息

这个示例提供了一个全面的实际使用参考，并展示了如何处理实际应用中可能遇到的各种场景。

### 高级使用场景

#### 分区级别的搜索

可以指定只在特定分区中搜索，提高检索速度：

```javascript
// 只在指定分区中搜索
const results = await index.search(queryVector, 5, { 
  partitionIds: [0, 2] 
});
```

#### 自定义持久化策略

可以根据业务需求实现不同的持久化策略：

```javascript
// 使用数据库持久化
const index = createPartitionedHNSW({
  persistCallback: async (partitionId, partitionData) => {
    await db.collection('vector_partitions').updateOne(
      { partitionId },
      { $set: { data: partitionData } },
      { upsert: true }
    );
  },
  loadCallback: async (partitionId) => {
    const doc = await db.collection('vector_partitions').findOne({ partitionId });
    return doc ? doc.data : null;
  }
});
```

### 性能考量

1. **内存管理**：调整`partitionsInMemory`参数可以控制内存使用量，但会影响非活跃分区的访问速度
2. **分区大小**：较小的分区有利于灵活管理，但可能导致分区间连接不足，影响搜索精度
3. **持久化开销**：持久化和加载操作可能较为耗时，应合理安排这些操作的时机
4. **并发操作**：当前实现假定操作是串行的，并发场景需要额外的同步机制

### 限制

1. 跨分区查询可能不如单一HNSW索引精确
2. 频繁加载/卸载分区会影响性能
3. 对于在线学习或数据分布变化较大的场景，可能需要额外的重平衡策略 