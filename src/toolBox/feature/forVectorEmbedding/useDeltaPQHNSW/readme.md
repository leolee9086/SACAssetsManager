# HNSW向量索引

高性能层次化导航小世界图索引实现，用于高维向量的近似最近邻搜索。

## 使用示例

```javascript
import { createHNSWIndex } from './useCustomedHNSW.js';

// 创建索引实例
const index = createHNSWIndex({
  distanceFunction: 'cosine',   // 距离函数：'cosine', 'euclidean', 'inner_product'
  M: 64,                        // 每层最大连接数
  efConstruction: 200,          // 构建时候选集大小
  efSearch: 200,                // 搜索时候选集大小
  ml: 16                        // 最大层数
});

// 插入向量
const id1 = index.insertNode([0.1, 0.2, 0.3], { label: 'vector1' });
const id2 = index.insertNode([0.4, 0.5, 0.6], { label: 'vector2' });

// 查询最近邻
const results = index.searchKNN([0.2, 0.3, 0.4], 5);

// 结果格式
// [
//   { id: '...', distance: 0.123, data: { label: 'vector1' } },
//   { id: '...', distance: 0.456, data: { label: 'vector2' } },
//   ...
// ]
```

## 批量操作

```javascript
import { batchInsertNodes } from './forHNSWBatch.js';

// 批量插入
const vectors = [
  [0.1, 0.2, 0.3],
  [0.4, 0.5, 0.6],
  // ...更多向量
];

const metadata = [
  { id: '1', label: 'vector1' },
  { id: '2', label: 'vector2' },
  // ...对应的元数据
];

const ids = batchInsertNodes(vectors, metadata, /* 其他参数 */);
```

## 主要文件

- **useCustomedHNSW.js** - 核心HNSW实现
- **forHNSWSearch.js** - 搜索相关函数
- **forHNSWBatch.js** - 批量操作函数
- **forHNSWOptimize.js** - 索引优化函数
- **forHNSWHelpers.js** - 辅助函数
- **forHNSWIdMapping.js** - ID映射管理

## 性能特点

- 构建时间复杂度：O(n log n)
- 查询时间复杂度：O(log n)
- 空间复杂度：O(n * M * L)，其中M为最大连接数，L为平均层数

## 参考资料

- [Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs](https://arxiv.org/abs/1603.09320)
- [HNSW GitHub (原始C++实现)](https://github.com/nmslib/hnswlib) 