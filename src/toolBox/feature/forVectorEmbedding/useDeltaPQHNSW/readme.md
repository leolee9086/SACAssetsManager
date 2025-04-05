# DeltaPQ-HNSW 向量检索模块

高性能、低内存占用的向量相似度检索工具集，结合了DeltaPQ向量压缩和HNSW图索引技术。

## 功能特性

- 高压缩比向量存储（DeltaPQ）
- 高性能相似度搜索（HNSW）
- 动态向量插入与删除
- 批量操作支持
- 无外部依赖

## 快速开始

### DeltaPQ使用示例

```javascript
// 导入DeltaPQ
import { createDeltaPQ } from './useCustomedDeltaPQ.js';

// 创建量化器
const quantizer = createDeltaPQ({
  numSubvectors: 8,    // 子向量数量
  bitsPerCode: 8       // 每个子向量编码位数
});

// 训练量化器
const vectors = [/* 向量数组 */];
const trainResult = quantizer.train(vectors);
console.log(`平均量化误差: ${trainResult.averageError}`);
console.log(`压缩比: ${trainResult.compressionRatio}:1`);

// 量化向量
const originalVector = new Float32Array([...]);
const { codes } = quantizer.quantizeVector(originalVector);

// 反量化（重建向量）
const reconstructedVector = quantizer.dequantizeVector(codes);

// 计算量化向量之间的距离
const vector1Codes = quantizer.quantizeVector(vector1).codes;
const vector2Codes = quantizer.quantizeVector(vector2).codes;
const distance = quantizer.computeApproximateDistance(vector1Codes, vector2Codes);
```

### 使用DeltaPQ索引

```javascript
// 导入DeltaPQ索引
import { createDeltaPQIndex } from './useCustomedDeltaPQ.js';

// 创建索引
const index = createDeltaPQIndex({
  numSubvectors: 8,
  bitsPerCode: 8
});

// 添加向量
const vectors = [/* 向量数组 */];
vectors.forEach(vec => index.addVector(vec));

// 构建索引
const buildResult = index.buildIndex();
console.log(`索引构建完成，包含 ${buildResult.numVectors} 个向量`);

// 执行搜索
const queryVector = new Float32Array([...]);
const searchResults = index.search(queryVector, 10); // 查找10个最近邻
console.log(searchResults); // [{id: 0, distance: 0.123}, ...]

// 删除向量
index.removeVector(vectorId);
```

## API参考

### DeltaPQ API

#### `createDeltaPQ(options)`

创建DeltaPQ量化器实例。

**参数:**
- `options` (可选): 配置对象
  - `numSubvectors` (默认: 8): 子向量数量
  - `bitsPerCode` (默认: 8): 每个子向量编码位数
  - `sampleSize` (默认: 1000): 训练使用的样本数量
  - `maxIterations` (默认: 25): K-means聚类最大迭代次数

**返回:** DeltaPQ实例，包含以下方法:

- `train(vectors)`: 训练量化器
- `quantizeVector(vector)`: 量化向量，返回编码
- `dequantizeVector(codes)`: 反量化向量，重建近似向量
- `computeApproximateDistance(codes1, codes2)`: 计算两个量化向量间的距离
- `batchQuantize(vectors)`: 批量量化多个向量
- `batchDequantize(codesList)`: 批量反量化多个向量
- `batchComputeDistances(queryCode, databaseCodes)`: 批量计算距离
- `getMetadata()`: 获取量化器元数据

#### `createDeltaPQIndex(options)`

创建基于DeltaPQ的向量索引。

**参数:**
- `options` (可选): 与`createDeltaPQ`相同的配置对象

**返回:** 索引实例，包含以下方法:

- `addVector(vector, id)`: 添加向量到索引
- `removeVector(id)`: 从索引中移除向量
- `buildIndex()`: 构建索引
- `search(queryVector, k)`: 搜索k个最近邻
- `getMetadata()`: 获取索引元数据

## 性能优化提示

1. 调整子向量数量和编码位数以平衡精度和内存使用
2. 对于大型数据集，考虑使用分批训练
3. 对于高维向量，增加子向量数量可提高精度
4. 对于需要高精度的应用，考虑使用更高的bitsPerCode值

## 限制与注意事项

- 量化过程会引入信息损失，不适用于需要绝对精确匹配的场景
- 训练需要足够数量的样本才能获得良好的码本
- 在使用前必须先调用train方法训练量化器

# HNSW向量搜索索引

本模块提供基于HNSW算法的高性能向量近似最近邻搜索实现，采用纯函数式风格设计，专注于高效和可扩展性。

## 特性

- **高性能**: 对数级搜索复杂度，适合大规模向量数据集
- **可调整的精度-速度平衡**: 通过参数精细调整以适应不同场景需求
- **多种距离度量支持**: 欧几里得距离、余弦距离、内积等
- **内存优化**: 使用LRU缓存减少重复距离计算
- **函数式设计**: 所有函数均为纯函数或明确标注副作用
- **序列化支持**: 支持索引数据持久化和恢复

## 使用示例

### 基本使用

```javascript
import { createHNSWIndex } from './useCustomedHNSW.js';

// 创建索引实例
const hnswIndex = createHNSWIndex({
  distanceFunction: 'euclidean', // 可选: 'euclidean', 'cosine', 'inner_product'
  M: 16,                         // 每个节点最大连接数
  efConstruction: 200,           // 构建时的候选集大小
  efSearch: 50,                  // 搜索时的候选集大小
  ml: 16                         // 最大层数
});

// 插入向量
const vector1 = new Float32Array([1.0, 2.0, 3.0]);
const vector2 = new Float32Array([4.0, 5.0, 6.0]);
const id1 = hnswIndex.insertNode(vector1, { name: "向量1" });
const id2 = hnswIndex.insertNode(vector2, { name: "向量2" });

// 查询最近邻
const queryVector = new Float32Array([1.1, 2.1, 3.1]);
const results = hnswIndex.searchKNN(queryVector, 5);  // 查找5个最近邻

// 处理结果
results.forEach(result => {
  console.log(`ID: ${result.id}, 距离: ${result.distance}, 数据: ${result.node.data.name}`);
});
```

### 高级用法

```javascript
// 序列化和反序列化
const serializedData = hnswIndex.serialize();
localStorage.setItem('hnsw-index', JSON.stringify(serializedData));

// 恢复索引
const restoredData = JSON.parse(localStorage.getItem('hnsw-index'));
const newIndex = createHNSWIndex();
newIndex.restore(restoredData);

// 删除节点
hnswIndex.removeNode(id1);

// 获取索引统计信息
const stats = hnswIndex.getStats();
console.log(`节点数: ${stats.nodeCount}, 最大层级: ${stats.maxLevel}`);

// 排除特定ID的搜索
const excludeIds = new Set([id2]);
const filteredResults = hnswIndex.searchKNN(queryVector, 5, null, excludeIds);
```

## 参数说明

| 参数 | 说明 | 默认值 | 推荐范围 |
|------|------|--------|---------|
| distanceFunction | 距离计算方式 | 'euclidean' | 'euclidean', 'cosine', 'inner_product' |
| M | 每个节点最大连接数 | 16 | 8-64，越大越精确但内存消耗更高 |
| efConstruction | 构建时的候选集大小 | 200 | 100-800，影响构建质量和时间 |
| efSearch | 搜索时的候选集大小 | 50 | 20-200，越大越精确但速度降低 |
| ml | 最大层数 | 16 | 8-24，根据数据集大小调整 |
| useDistanceCache | 是否使用距离缓存 | true | 大多数情况下保持启用 |

## 性能优化建议

1. 对于高维向量（>1000维），考虑先进行降维处理
2. 大规模数据集（>100万节点）时增加M和efConstruction
3. 对精度要求较高的场景增加efSearch
4. 频繁变动的数据集定期重建索引以清理已删除节点
5. 批量查询场景可提前预热距离缓存

## API参考

### 主要函数

- `createHNSWIndex(options)`: 创建新的HNSW索引实例
- `insertNode(vector, data)`: 向索引中插入新向量
- `searchKNN(queryVector, k, ef, excludeIds)`: 搜索K个最近邻
- `removeNode(id)`: 从索引中删除节点
- `getStats()`: 获取索引统计信息
- `serialize()`: 序列化索引数据
- `restore(data)`: 从序列化数据恢复索引

## 内部实现

有关内部算法实现的详细说明，请参考 [AInote.md](./AInote.md)。 