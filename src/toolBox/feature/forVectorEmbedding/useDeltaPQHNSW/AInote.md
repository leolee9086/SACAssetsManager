# HNSW向量索引实现说明

## 基本原理

HNSW (Hierarchical Navigable Small World) 是一种高效的近似最近邻搜索算法，通过构建分层小世界图实现对数级时间复杂度的搜索。本实现采用了函数式编程风格，参考hnswlayers的实现策略，优化了搜索准确性和性能。

## 核心数据结构

1. **节点**：
   ```javascript
   {
     id: number,              // 节点唯一标识符
     vector: Float32Array,    // 向量数据
     data: any,               // 可选的关联数据
     connections: Array[],    // 每一层的连接列表
     deleted: boolean         // 逻辑删除标记
   }
   ```

2. **入口点**：
   ```javascript
   {
     id: number,    // 入口节点ID
     level: number  // 入口节点层级
   }
   ```

3. **状态对象**：
   ```javascript
   {
     maxId: number,           // 当前最大ID
     maxLevel: number,        // 最大层级
     nodeCount: number,       // 活跃节点数量
     deletedCount: number,    // 已删除节点数量
     distanceCalculations: number   // 距离计算次数统计
   }
   ```

## 主要改进

1. **多入口点搜索策略**：
   - 实现多次搜索并合并结果
   - 当搜索结果不足时，动态选择新入口点
   - 完全匹配hnswlayers的3次搜索策略

2. **邻居选择算法优化**：
   - 使用贪心搜索快速找到近似最近点
   - 采用"高速公路"节点选择策略，避免图连通性差
   - 确保邻居节点提供有效的多样性和导航性能

3. **构建过程优化**：
   - 底层使用更多连接提高召回率
   - 动态调整构建时候选集大小
   - 为每层连接选择最优邻居集

4. **搜索效率提升**：
   - 引入暴力搜索策略，当结果不足时动态补充
   - 使用优先队列和最近距离剪枝加速搜索
   - 缓存距离计算减少重复计算

## 关键参数

- **M** = 48：每层最大连接数
- **efConstruction** = 600：构建时候选集大小
- **efSearch** = 150：搜索时候选集大小
- **maxLevel** = 48：最大层数
- **bottomLayerConnections** = 300：底层连接数（提高召回率）

## 核心算法

### 插入算法

1. 随机生成节点层级
2. 自顶向下，对每一层：
   - 贪心搜索找到当前层最近点
   - 扩展搜索找到多个候选邻居
   - 筛选最优邻居并建立双向连接
   - 使用最近邻作为下一层搜索起点

### 搜索算法

1. 多入口点策略：
   - 第一次使用全局入口点
   - 后续使用不同层级的新入口点
   - 最多尝试3次搜索并合并结果

2. 每次搜索流程：
   - 从最高层开始贪心搜索
   - 逐层下降直到底层（层级0）
   - 底层使用优先队列和结果队列的组合搜索
   - 如果结果不足，执行部分暴力搜索

## 与hnswlayers的对比

本实现保持了与hnswlayers相同的核心算法思想，但使用函数式编程实现，主要变化：

1. 采用对象方法而非类实现
2. 优化内存使用和性能
3. 保持API兼容性
4. 添加了更多调试和统计功能

## 性能考量

- **时间复杂度**：构建O(n log n)，查询O(log n)
- **空间复杂度**：O(n * M * L)，其中M为最大连接数，L为平均层数
- **内存使用**：使用Float32Array存储向量，减少内存占用
- **缓存优化**：距离计算缓存减少重复计算
- **并发安全**：函数式设计支持并发安全操作

## 模块结构

该模块按照关注点分离原则，将不同功能拆分为多个文件：

- `useCustomedHNSW.js` - 主模块实现，包括核心索引操作
- `useCustomedDeltaPQ.js` - DeltaPQ向量压缩实现，支持多种距离度量
- `forHNSWHelpers.js` - 辅助函数，包括距离缓存、随机层级生成等
- `forHNSWIdMapping.js` - ID映射管理相关函数
- `forHNSWSearch.js` - 搜索相关函数，包括层级搜索和最近邻搜索
- `forHNSWOptimize.js` - 索引优化和统计相关函数
- `forHNSWBatch.js` - 批量操作函数，支持高效批量插入和搜索
- `useCombinedDeltaPQHNSW.js` - 组合DeltaPQ和HNSW的实现

## 功能特点

1. 高性能近似最近邻搜索
2. 可扩展的多距离度量支持（欧几里得、余弦、内积、曼哈顿、切比雪夫等）
3. 距离计算缓存优化
4. 分层图结构，查询复杂度为O(log n)
5. 节点的逻辑删除而非物理删除，减少内存碎片
6. 高效批量操作支持
7. 连接结构优化功能，提高召回率
8. DeltaPQ向量压缩大幅减少内存占用

## 多距离度量支持

现在本模块同时支持HNSW和DeltaPQ的多种距离度量方法：

- **欧几里得距离** (L2距离) - 适用于一般场景的直观几何距离
- **曼哈顿距离** (L1距离) - 适用于稀疏特征，减少离群值影响
- **切比雪夫距离** (L∞距离) - 适用于需要考虑最大差异的场景
- **余弦距离** - 适用于方向相似性，忽略大小差异
- **内积距离** - 适用于已归一化的向量相似度计算

### 距离选择指南

- **文本或语义嵌入** - 推荐使用余弦距离
- **图像特征向量** - 推荐使用欧几里得距离
- **已归一化的向量** - 可使用内积距离获得最佳性能
- **高维稀疏数据** - 考虑使用曼哈顿距离
- **含噪声数据** - 考虑使用切比雪夫距离以减少异常值影响

在DeltaPQ压缩后，不同距离度量的特性依然保持，但需要注意量化过程可能引入微小误差。

## 使用方式

基本使用示例：

```javascript
import { createHNSWIndex } from './useCustomedHNSW.js';

// 创建索引
const index = createHNSWIndex({
  distanceFunction: 'cosine', // 'euclidean'、'cosine'或'inner_product'
  M: 64,                      // 每层最大连接数
  efConstruction: 200,        // 构建参数
  efSearch: 200,              // 搜索参数
  ml: 16                      // 最大层数
});

// 插入向量
const id1 = index.insertNode([0.1, 0.2, 0.3], { label: 'vector1' });
const id2 = index.insertNode([0.2, 0.3, 0.4], { label: 'vector2' });

// 搜索最近邻
const results = index.searchKNN([0.1, 0.2, 0.3], 10);
```

## DeltaPQ向量压缩使用示例

```javascript
import { createDeltaPQ, DISTANCE_METRICS } from './useCustomedDeltaPQ.js';

// 创建量化器
const quantizer = createDeltaPQ({
  numSubvectors: 8,
  bitsPerCode: 8, 
  distanceMetric: DISTANCE_METRICS.COSINE // 使用余弦距离
});

// 训练量化器
quantizer.train(trainingVectors);

// 对向量进行量化
const { codes } = quantizer.quantizeVector(vector);

// 计算两个量化向量之间的距离
const distance = quantizer.computeApproximateDistance(codes1, codes2);
```

## 组合使用DeltaPQ和HNSW

```javascript
import { createCombinedIndex } from './useCombinedDeltaPQHNSW.js';

// 创建组合索引
const index = createCombinedIndex({
  // DeltaPQ配置
  pq: {
    numSubvectors: 8,
    bitsPerCode: 8,
    distanceMetric: 'cosine'
  },
  // HNSW配置
  hnsw: {
    M: 16,
    efConstruction: 200,
    efSearch: 100
  }
});

// 构建索引
index.buildIndex(vectors);

// 搜索
const results = index.search(queryVector, 10);
```

## 性能优化建议

1. 较大数据集建议使用批量插入函数 `batchInsertNodes`
2. 搜索参数 `efSearch` 影响召回率和速度，值越大召回率越高但速度越慢
3. 构建参数 `efConstruction` 影响索引质量，值越大索引质量越高但构建越慢
4. 对于高维向量，推荐使用余弦距离
5. 如果需要提高召回率，可以使用 `optimizeConnectivity` 优化连接结构
6. 对于非常大的数据集，先使用DeltaPQ压缩再构建HNSW索引
7. 根据实际任务测试不同距离度量的效果

## 性能优化与问题排查

### ID匹配问题排查

召回率始终为0的核心问题通常与ID映射有关。HNSW索引内部使用自增ID，而测试数据使用原始ID，这两者需要正确映射：

1. 确保向量插入索引时，原始ID被保存在节点的metadata中
2. 在搜索结果返回时，应该返回原始ID而不是内部节点ID
3. 测试验证时，需要确保精确搜索和HNSW搜索返回的ID格式一致

### 常见问题解决

1. **召回率低问题**
   - 增大efSearch参数 (200以上)
   - 确保M参数足够大 (32-64)
   - 底层实现双向连接以提高图连通性
   
2. **ID映射问题**
   - 在节点metadata中明确保存原始ID
   - 搜索结果处理时返回原始ID
   - 保持精确搜索和HNSW搜索使用相同的ID格式

3. **向量规范化**
   - 使用余弦距离时，确保向量已规范化
   - 对于欧氏距离，确保向量维度和数值范围一致

4. **距离度量选择问题**
   - 测试比较不同距离度量在实际数据上的效果
   - 注意特殊距离度量可能需要特定的数据预处理

## 优化方向

1. 增加距离计算缓存，减少重复计算
2. 底层节点加入更多双向连接，提高召回率
3. 在查询时使用更大的ef值
4. 针对底层实现更密集的连接结构 
5. 支持更多类型的距离函数和自定义距离函数
6. 进一步优化DeltaPQ与HNSW的集成 