# DeltaPQ向量压缩与检索

高性能、低内存占用的向量压缩与检索库，支持多种距离度量方法。

## 主要特性

- 高压缩率：将向量压缩到原始大小的1/16至1/32
- 多距离度量支持：欧几里得、曼哈顿、切比雪夫、余弦、内积
- 快速近似检索：比原始向量检索快数倍
- 完整序列化支持：可保存与加载训练好的模型

## 基本使用

### 创建和训练量化器

```javascript
import { createDeltaPQ, DISTANCE_METRICS } from './useCustomedDeltaPQ.js';

// 创建量化器
const quantizer = createDeltaPQ({
  numSubvectors: 8,                     // 子向量数量
  bitsPerCode: 8,                       // 每个子向量编码位数
  sampleSize: 1000,                     // 训练样本大小
  maxIterations: 25,                    // 训练最大迭代次数
  distanceMetric: DISTANCE_METRICS.EUCLIDEAN  // 距离度量类型
});

// 准备训练数据
const trainingVectors = [
  new Float32Array([0.1, 0.2, 0.3]),
  new Float32Array([0.4, 0.5, 0.6]),
  // ...更多向量
];

// 训练量化器
const trainingResult = quantizer.train(trainingVectors);
console.log('训练结果:', trainingResult);
```

### 向量编码与解码

```javascript
// 对向量进行量化编码
const vector = new Float32Array([0.1, 0.2, 0.3]);
const { codes, deltaVector } = quantizer.quantizeVector(vector);

// 从编码还原向量（近似值）
const reconstructed = quantizer.dequantizeVector(codes);

// 计算量化误差
const original = vector;
let errorSum = 0;
for (let i = 0; i < original.length; i++) {
  const diff = original[i] - reconstructed[i];
  errorSum += diff * diff;
}
const mse = errorSum / original.length;
console.log('量化均方误差:', mse);
```

### 批量处理

```javascript
// 批量量化多个向量
const vectors = [
  new Float32Array([0.1, 0.2, 0.3]),
  new Float32Array([0.4, 0.5, 0.6]),
  // ...更多向量
];

const encodedVectors = quantizer.batchQuantize(vectors);

// 批量反量化
const decodedVectors = quantizer.batchDequantize(encodedVectors);
```

### 计算量化向量间的距离

```javascript
// 计算两个量化编码间的近似距离
const distance = quantizer.computeApproximateDistance(codes1, codes2);

// 批量计算查询向量与数据库中所有向量的距离
const distances = quantizer.batchComputeDistances(queryCode, databaseCodes);
```

### 序列化和反序列化

```javascript
// 序列化模型
const serialized = quantizer.serialize();

// 保存到文件或数据库
// ...

// 创建新的量化器并恢复状态
const newQuantizer = createDeltaPQ();
const success = newQuantizer.deserialize(serialized);

if (success) {
  console.log('模型恢复成功!');
} else {
  console.error('模型恢复失败!');
}
```

## 使用DeltaPQ索引

```javascript
import { createDeltaPQIndex, DISTANCE_METRICS } from './useCustomedDeltaPQ.js';

// 创建索引
const index = createDeltaPQIndex({
  numSubvectors: 8,
  bitsPerCode: 8,
  distanceMetric: DISTANCE_METRICS.COSINE  // 使用余弦距离
});

// 添加向量到索引
const id1 = index.addVector([0.1, 0.2, 0.3]);
const id2 = index.addVector([0.4, 0.5, 0.6], 'custom_id');  // 可选自定义ID

// 构建索引
const buildResult = index.buildIndex();
console.log('索引构建结果:', buildResult);

// 搜索最近邻
const results = index.search([0.2, 0.3, 0.4], 5);  // 查找5个最近邻
console.log('搜索结果:', results);

// 移除向量
const removed = index.removeVector(id1);
```

## 多种距离度量指南

模块支持的距离度量类型如下：

```javascript
// 可用的距离度量类型
const DISTANCE_METRICS = {
  EUCLIDEAN: 'euclidean',     // 欧几里得距离 (L2)
  MANHATTAN: 'manhattan',     // 曼哈顿距离 (L1)
  CHEBYSHEV: 'chebyshev',     // 切比雪夫距离 (L∞)
  COSINE: 'cosine',           // 余弦距离
  INNER_PRODUCT: 'innerProduct'  // 内积距离 (相似度)
};
```

### 距离度量选择建议

1. **欧几里得距离** - 通用默认选择，适合需要考虑向量大小和方向的情况
   ```javascript
   const quantizer = createDeltaPQ({ distanceMetric: DISTANCE_METRICS.EUCLIDEAN });
   ```

2. **曼哈顿距离** - 适合稀疏数据或降低离群值影响
   ```javascript
   const quantizer = createDeltaPQ({ distanceMetric: DISTANCE_METRICS.MANHATTAN });
   ```

3. **切比雪夫距离** - 适合只关心最大差异的场景
   ```javascript
   const quantizer = createDeltaPQ({ distanceMetric: DISTANCE_METRICS.CHEBYSHEV });
   ```

4. **余弦距离** - 适合只考虑向量方向不考虑大小的场景（如文本向量）
   ```javascript
   const quantizer = createDeltaPQ({ distanceMetric: DISTANCE_METRICS.COSINE });
   ```

5. **内积距离** - 适合已归一化的向量相似度计算（注意：值越大表示越相似）
   ```javascript
   const quantizer = createDeltaPQ({ distanceMetric: DISTANCE_METRICS.INNER_PRODUCT });
   ```

### 性能与使用注意事项

1. 使用余弦或内积距离时，建议对向量进行归一化处理
2. 欧几里得距离在实现上有特殊优化，通常运算速度最快
3. 处理高维稀疏向量时，曼哈顿距离可能提供更好的区分度
4. 如需处理有特异值的数据，可考虑切比雪夫距离
5. 对于任务特定选择，建议在实际数据集上进行对比测试 