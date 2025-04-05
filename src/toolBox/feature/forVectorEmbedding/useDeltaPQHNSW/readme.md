# DeltaPQ-HNSW 向量索引

## 功能概述

本模块实现了将DeltaPQ向量压缩与HNSW图索引结合的高性能向量检索系统，同时保持高压缩比和高检索性能。

## 核心优势

1. **高压缩比**：通过DeltaPQ量化技术大幅减少向量存储空间，降低内存占用
2. **高性能检索**：通过HNSW图索引保持次线性时间复杂度的快速检索能力
3. **灵活配置**：支持多种配置参数调整，适应不同场景需求
4. **兼顾精度与速度**：量化压缩与图索引结合，在降低存储成本的同时保持较高查询精度

## 搜索放大策略

本模块采用三层搜索放大策略，提高查询的召回率和精度：

1. **初始搜索放大**：在HNSW搜索阶段获取k*SEARCH_AMPLIFICATION_FACTOR个候选结果
2. **ef参数放大**：使用k*EF_AMPLIFICATION_FACTOR的ef值确保HNSW搜索质量
3. **重排放大**：从初步候选中选取k*RERANK_AMPLIFICATION_FACTOR个结果进行精确距离重排

放大策略的优势：
- 单次搜索即可获得高质量结果，无需多次尝试不同参数
- 通过重排序阶段确保最终结果精度
- 效率更高，相比多ef策略减少了重复搜索的开销

## 使用示例

```javascript
import { createCombinedDeltaPQHNSW } from './useCombinedDeltaPQHNSW.js';

// 创建索引实例
const index = createCombinedDeltaPQHNSW({
  numSubvectors: 8,
  bitsPerCode: 8,
  distanceFunction: 'euclidean',
  efConstruction: 200,
  efSearch: 200
});

// 训练索引
index.train(trainingVectors);

// 添加向量
for (const vector of vectors) {
  index.addVector(vector);
}

// 搜索
const results = index.search(queryVector, 10);
```

## 适用场景

- 大规模向量库的相似性搜索
- 内存受限环境下的向量检索
- 需要兼顾速度和精度的应用场景
- 特征向量检索、语义搜索、图像检索等领域

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

# HNSW高性能向量索引实现

## 算法概述

HNSW（分层可导航小世界）是一种高性能近似最近邻搜索算法，通过构建多层次图结构实现对数时间复杂度的查询。

### 核心特点

- **多层图结构**：底层包含所有节点，高层包含随机子集，形成导航结构
- **贪婪搜索策略**：从高层开始，逐层下降寻找最近邻
- **连接优化**：控制每层每个节点的连接数，平衡索引质量和大小

## 参数传递与防御性编程

在复杂算法实现中，防御性编程至关重要。我们的代码通过以下方式增强健壮性：

### 1. 参数校验的重要性

良好的参数校验可以：
- 捕获90%的潜在错误
- 提供明确的错误信息而非模糊的空指针异常
- 减少调试时间并提高系统可靠性

### 2. 常见错误类型及防御措施

对于`TypeError: Cannot read properties of undefined (reading 'id')`错误：

```javascript
// 错误写法
const id1 = v1.id;  // v1可能为undefined

// 正确写法
const id1 = v1 && v1.id !== undefined ? v1.id : '0';
```

### 3. 关键函数的防御检查

- **distanceWithCache**：确保向量和ID有效
- **searchLayer**：验证入口点和连接的有效性
- **insertNode**：检查节点和向量存在性

## 高效实现策略

### 1. 距离计算优化

- 使用LRU缓存存储常用距离计算
- 避免重复计算相同向量对之间的距离
- 支持多种距离度量（欧几里得、余弦、内积）

### 2. 搜索策略优化

- 最小堆实现高效的候选集管理
- 跨层共享已访问节点集合
- 基于距离的早期终止策略

### 3. 连接管理优化

- 高效的连接添加和修剪算法
- 使用Set进行快速存在性检查
- 分层的连接数控制策略

## 调试与异常处理

为帮助调试复杂问题，代码加入了多级异常处理：

1. **详细日志**：记录关键操作和状态变更
2. **精确错误信息**：包含出错对象、ID和上下文
3. **失败优雅降级**：在关键点检测失败并尝试合理恢复

## 性能优化建议

1. **合理设置参数**：
   - `M`：16-32之间，影响索引质量和大小
   - `efConstruction`：100-200，影响建构质量
   - `efSearch`：50-100，影响查询精度和速度

2. **内存优化**：
   - 使用Float32Array而非普通数组
   - 根据数据集大小调整距离缓存

3. **批量操作**：
   - 使用批量插入代替单个插入
   - 预计算批次内向量距离

## 使用示例

```javascript
// 创建索引
const index = createHNSWIndex({
  distanceFunction: 'euclidean',
  M: 16,
  efConstruction: 200,
  efSearch: 50
});

// 添加向量
const nodeId = index.insertNode(vector, { metadata: 'example' });

// 查询最近邻
const results = index.searchKNN(queryVector, 10);
```

## 故障排查指南

| 错误类型 | 可能原因 | 解决方案 |
|---------|---------|---------|
| TypeError: Cannot read property 'id' | 无效节点对象传入 | 检查节点创建和查询向量格式 |
| 查询结果为空 | 入口点无效或被删除 | 重新设置入口点或检查节点状态 |
| 连接数量异常 | 层级计算错误 | 检查层级随机函数和参数设置 | 