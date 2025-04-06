# HNSW向量索引

高性能层次化导航小世界图索引实现，用于高维向量的近似最近邻搜索。本模块还包含DeltaPQ向量压缩功能，支持多种距离度量方法。

## 主要组件

- **HNSW索引** - 高效近似最近邻搜索
- **DeltaPQ压缩** - 向量压缩以减少内存占用
- **多距离度量支持** - 欧几里得、曼哈顿、切比雪夫、余弦、内积

## HNSW使用示例

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

## DeltaPQ向量压缩使用示例

```javascript
import { createDeltaPQ, DISTANCE_METRICS } from './useCustomedDeltaPQ.js';

// 创建量化器
const quantizer = createDeltaPQ({
  numSubvectors: 8,                    // 子向量数量
  bitsPerCode: 8,                      // 每个子向量编码位数
  distanceMetric: DISTANCE_METRICS.EUCLIDEAN  // 距离度量类型
});

// 训练量化器
const trainingVectors = [...]; // 向量数组
quantizer.train(trainingVectors);

// 对向量进行量化
const vector = [0.1, 0.2, 0.3];
const { codes } = quantizer.quantizeVector(vector);

// 从编码恢复原始向量（近似值）
const reconstructed = quantizer.dequantizeVector(codes);
```

## 支持的距离度量类型

现在本模块同时支持多种距离度量方法：

```javascript
// HNSW索引支持的距离类型
const distanceFunction = 'euclidean'; // 或 'cosine', 'inner_product'

// DeltaPQ支持的距离类型
import { DISTANCE_METRICS } from './useCustomedDeltaPQ.js';

const distanceMetric = DISTANCE_METRICS.EUCLIDEAN;  // 欧几里得距离
// 或
const distanceMetric = DISTANCE_METRICS.MANHATTAN;  // 曼哈顿距离
const distanceMetric = DISTANCE_METRICS.CHEBYSHEV;  // 切比雪夫距离
const distanceMetric = DISTANCE_METRICS.COSINE;     // 余弦距离
const distanceMetric = DISTANCE_METRICS.INNER_PRODUCT; // 内积距离
```

### 距离度量选择指南

- **欧几里得距离** - 通用几何距离，适合大多数场景
- **曼哈顿距离** - 适合稀疏特征，对离群值更稳健
- **切比雪夫距离** - 只考虑最大差异的维度
- **余弦距离** - 只关注向量夹角，忽略大小
- **内积距离** - 适合归一化向量的相似度计算

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

## 组合DeltaPQ和HNSW

```javascript
import { createCombinedIndex } from './useCombinedDeltaPQHNSW.js';

// 创建组合索引
const index = createCombinedIndex({
  // DeltaPQ配置
  pq: {
    numSubvectors: 8,
    bitsPerCode: 8,
    distanceMetric: DISTANCE_METRICS.COSINE
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

## 主要文件

- **useCustomedHNSW.js** - 核心HNSW实现
- **useCustomedDeltaPQ.js** - 核心DeltaPQ实现
- **forHNSWSearch.js** - 搜索相关函数
- **forHNSWBatch.js** - 批量操作函数
- **forHNSWOptimize.js** - 索引优化函数
- **forHNSWHelpers.js** - 辅助函数
- **forHNSWIdMapping.js** - ID映射管理
- **useCombinedDeltaPQHNSW.js** - 组合DeltaPQ和HNSW的实现

## 性能特点

- HNSW构建时间复杂度：O(n log n)
- HNSW查询时间复杂度：O(log n)
- HNSW空间复杂度：O(n * M * L)，其中M为最大连接数，L为平均层数
- DeltaPQ存储压缩比：通常为原始大小的1/16至1/32
- DeltaPQ训练时间：与向量数量、维度和聚类数成正比

## 性能优化建议

1. 对于大型数据集，先用DeltaPQ压缩再构建HNSW索引
2. 不同距离度量对不同任务效果不同，建议实验比较
3. 在使用余弦距离时，预先对向量进行归一化处理
4. efSearch参数影响召回率和速度，值越大结果越精确但速度越慢
5. numSubvectors和bitsPerCode参数影响DeltaPQ压缩率和精度

## 参考资料

- [Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs](https://arxiv.org/abs/1603.09320)
- [HNSW GitHub (原始C++实现)](https://github.com/nmslib/hnswlib)
- [Product Quantization for ANN Search](https://hal.inria.fr/inria-00514462v2/document) 