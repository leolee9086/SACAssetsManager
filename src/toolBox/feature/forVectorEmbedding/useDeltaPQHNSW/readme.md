# HNSW向量检索模块

## 简介

本模块是一个高性能的HNSW（Hierarchical Navigable Small World）向量检索实现，专为高维向量的近似最近邻（ANN）搜索而设计。它是基于经典HNSW算法的JavaScript实现，针对性能和内存效率进行了优化。

## 原理

HNSW是一种图索引结构，通过构建多层导航图来实现高效的向量搜索：

1. **多层结构**：创建层级化的图结构，顶层稀疏连接，底层密集连接
2. **贪心搜索**：从顶层开始逐层贪心搜索最近点
3. **启发式邻居选择**：使用启发式规则选择最优邻居，保证图的导航性能

核心优势：
- 搜索复杂度：O(log N)
- 高查询精度：接近精确最近邻结果
- 动态添加：支持在线添加新向量

## 使用方法

```javascript
import { createHNSWIndex } from './useCustomedHNSW.js';

// 创建索引
const index = createHNSWIndex({
  distanceFunction: 'cosine',  // 支持：'cosine', 'euclidean', 'inner_product'
  M: 16,                       // 每层的最大连接数
  efConstruction: 200,         // 构建时的探索因子
  efSearch: 100,               // 搜索时的探索因子
  ml: 16                       // 最大层数
});

// 添加向量
const id1 = index.insertNode([0.1, 0.2, 0.3], { label: 'vector1' });
const id2 = index.insertNode([0.2, 0.3, 0.4], { label: 'vector2' });
// ...添加更多向量

// 搜索最近邻
const queryVector = [0.15, 0.25, 0.35];
const results = index.searchKNN(queryVector, 5, {
  ef: 50,              // 自定义搜索效率参数
  excludeIds: [id1],   // 排除特定ID
  useWithCandidate: true  // 使用带候选的搜索方法
});

// 删除向量
index.removeNode(id1);

// 获取统计信息
const stats = index.getStats();
```

## 性能优化

本实现针对JavaScript环境进行了以下优化：

1. 使用Float32Array存储向量，提高内存效率
2. 使用Map数据结构高效管理节点
3. 提供距离计算缓存机制，减少重复计算
4. 使用优化的二进制堆进行候选排序
5. 严格遵循经典HNSW实现的核心逻辑

## 参数调优

- **M**：较大的M值提高准确性，但增加内存占用和构建时间
- **efConstruction**：较大值提高索引质量，但增加构建时间
- **efSearch**：较大值提高搜索准确性，但降低速度
- **ml**：影响图的层数，通常无需手动调整

对于大多数应用场景，默认参数已经能提供良好的性能平衡。

## 实现特点

- 基于函数式编程风格实现
- 完全参照horaHnsw算法实现的核心图结构
- 针对JavaScript环境优化的内存和性能管理
- 支持多种距离度量方式：余弦相似度、欧氏距离、内积等
- 支持逻辑删除节点功能

## 主要API

### 创建索引

```javascript
import { createHNSWIndex } from './useCustomedHNSW.js';

const hnsw = createHNSWIndex({
  distanceFunction: 'cosine', // 可选: 'cosine', 'euclidean', 'inner_product'
  M: 32,                      // 每层最大连接数
  efConstruction: 800,        // 构建时的候选集大小
  efSearch: 800,              // 搜索时的候选集大小
  ml: 32,                     // 最大层数
  useDistanceCache: true,     // 使用距离缓存优化
  recallFactor: 1.5,          // 召回率因子
  autoOptimize: true          // 自动优化图结构
});
```

### 添加向量

```javascript
// 向索引添加向量
const vector = new Float32Array([0.1, 0.2, 0.3, ...]);
const id = hnsw.insertNode(vector, { metadata: 'optional data' });
```

### 搜索最近邻

```javascript
// 查询最近的k个向量
const queryVector = new Float32Array([0.2, 0.3, 0.4, ...]);
const results = hnsw.searchKNN(queryVector, 10, {
  // 可选参数
  excludeIds: new Set([1, 2, 3]), // 排除特定ID
  ef: 100                         // 自定义ef参数
});

// 结果格式: [{id, distance, data, score}, ...]
console.log(results);
```

### 删除向量

```javascript
// 删除指定ID的向量
hnsw.removeNode(id);
```

### 获取统计信息

```javascript
// 获取索引状态和统计信息
const stats = hnsw.getStats();
console.log(stats);
```

## 参数说明

| 参数 | 说明 | 默认值 | 推荐范围 |
|------|------|--------|----------|
| distanceFunction | 距离计算方式 | 'cosine' | 'cosine', 'euclidean', 'inner_product' |
| M | 每层最大连接数 | 32 | 16-64 |
| efConstruction | 构建时候选集大小 | 800 | 400-1000 |
| efSearch | 搜索时候选集大小 | 800 | 400-1000 |
| ml | 最大层数 | 32 | 16-64 |
| recallFactor | 召回率因子 | 1.5 | 1.0-2.0 |

## 性能优化建议

1. **向量维度**：过高的维度会降低性能，考虑使用降维技术
2. **efSearch参数**：增大可提高召回率但降低速度
3. **大型数据集**：大型数据集可能需要增大M和ef参数
4. **内存限制**：如果内存受限，可降低M和ml参数

## 典型使用场景

- 相似图片搜索
- 文本语义搜索
- 推荐系统
- 去重和聚类

## 与其他索引的比较

HNSW相比其他算法的优势：

- 比暴力搜索快100-1000倍
- 比KD树和VP树在高维空间更高效
- 比LSH具有更高的精度
- 支持增量式构建

## 限制和注意事项

- 不支持精确搜索，仅提供近似结果
- 内存消耗相对较高
- 构建时间随数据集增大而增加
- 对于非常大的数据集可能需要分片处理 