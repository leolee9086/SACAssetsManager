# 向量嵌入与高性能索引

本模块提供了高性能向量索引实现，用于大规模向量相似度搜索，支持各种向量嵌入模型的结果存储和检索。

## 功能概述

- HNSW (Hierarchical Navigable Small World) 高性能近似最近邻搜索
- 多种距离度量支持：欧几里得距离、余弦距离、内积距离
- 向量量化压缩：支持PQ (Product Quantization) 和 Delta+PQ 压缩
- 批量向量处理与索引构建
- 序列化与反序列化支持

## HNSW索引

HNSW (Hierarchical Navigable Small World) 是一种高性能的近似最近邻搜索算法，具有以下特点：

- 对数级别的查询复杂度 O(log n)
- 高召回率（可达90%以上）
- 支持增量式构建与动态添加/删除
- 内存效率与CPU效率的良好平衡

### 使用方法

```javascript
import { createHNSWIndex } from './useDeltaPQHNSW/useCustomedHNSW.js';

// 创建索引
const index = createHNSWIndex({
  distanceFunction: 'euclidean', // 可选: 'euclidean', 'cosine', 'inner_product'
  M: 16,                        // 每个节点的最大连接数
  efConstruction: 200,          // 构建时的候选集大小，影响构建质量
  efSearch: 200,                // 搜索时的候选集大小，影响搜索质量
  ml: 16                        // 最大层数
});

// 添加向量
const id1 = index.insertNode(new Float32Array([0.1, 0.2, 0.3]), { text: "文档1" });
const id2 = index.insertNode(new Float32Array([0.2, 0.3, 0.4]), { text: "文档2" });

// 批量添加向量
const vectors = [
  new Float32Array([0.3, 0.4, 0.5]),
  new Float32Array([0.4, 0.5, 0.6])
];
const data = [
  { text: "文档3" },
  { text: "文档4" }
];
const ids = index.batchInsertNodes(vectors, data);

// 搜索最近邻
const queryVector = new Float32Array([0.2, 0.2, 0.3]);
const results = index.searchKNN(queryVector, 5);
// 返回结果格式: [{ id, distance, data }, ...]

// 删除节点
index.removeNode(id1);

// 序列化索引
const serialized = index.serialize();

// 恢复索引
const newIndex = createHNSWIndex();
newIndex.restore(serialized);
```

### 性能注意事项

1. 增大 `efConstruction` 可以提高索引质量，但会降低构建速度
2. 增大 `efSearch` 可以提高搜索精度，但会降低搜索速度
3. 增大 `M` 可以提高召回率，但会增加内存消耗
4. 对于大规模索引，建议使用量化技术减少内存占用

## 距离函数

本模块支持多种向量距离计算方法：

- `computeEuclideanDistance`: 欧几里得距离，适合一般相似度场景
- `computeCosineDistance`: 余弦距离，适合文本嵌入等归一化向量
- `computeInnerProduct`: 内积距离，适合某些特殊模型的相似度计算

## 故障排除

如遇到召回率低的问题，可以尝试：

1. 增大 `efSearch` 参数
2. 确保索引和查询使用相同的距离度量
3. 检查向量数据是否正确规范化（对余弦距离尤其重要）
4. 确保查询ID和结果ID的正确对应关系

对于高维向量，建议使用量化技术以减少内存占用并提高性能。 