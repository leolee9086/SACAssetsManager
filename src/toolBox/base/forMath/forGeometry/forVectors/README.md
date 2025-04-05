# 向量计算工具函数集

本目录包含用于向量计算的各种工具函数，主要用于几何计算、空间距离分析和向量处理。

## 文件结构

- `forDistance.js` - 提供各种向量距离计算函数
- `forNormalization.js` - 提供向量归一化和标准化函数

## 主要功能

### 距离计算函数 (forDistance.js)

提供多种向量距离和相似度计算方法：

- `computeEuclideanDistance` - 欧几里得距离 (L2距离)
- `computeManhattanDistance` - 曼哈顿距离 (L1距离)
- `computeChebyshevDistance` - 切比雪夫距离 (L∞距离)
- `computeCosineDistance` - 余弦相似度
- `computeInnerProduct` - 内积相似度
- `computeHammingDistance` - 汉明距离 (用于二进制向量)
- `computeJaccardDistance` - 杰卡德距离 (用于集合)

### 归一化函数 (forNormalization.js)

提供向量归一化和标准化的方法：

- `computeVectorNormalization` - 向量归一化 (转为单位向量)

## 使用示例

```javascript
import { 
  computeEuclideanDistance, 
  computeCosineDistance 
} from 'base/forMath/forGeometry/forVectors/forDistance.js';

import { 
  computeVectorNormalization 
} from 'base/forMath/forGeometry/forVectors/forNormalization.js';

// 创建向量
const vectorA = [1, 2, 3];
const vectorB = [4, 5, 6];

// 计算距离
const euclideanDist = computeEuclideanDistance(vectorA, vectorB);
console.log('欧几里得距离:', euclideanDist);

// 计算相似度
const cosineSim = computeCosineDistance(vectorA, vectorB);
console.log('余弦相似度:', cosineSim);

// 向量归一化
const normalizedVector = computeVectorNormalization(vectorA);
console.log('归一化向量:', normalizedVector);
```

## 性能考量

- 所有距离计算函数优化了循环结构和变量使用
- 对于大规模向量计算，建议使用 `Float32Array` 而非普通数组
- 内部实现避免创建不必要的临时对象

## 扩展计划

未来计划添加以下功能：

1. 向量基本运算 (加、减、点积、叉积等)
2. 更多高级距离计算 (闵可夫斯基距离、马氏距离)
3. 向量投影和映射函数
4. 几何变换函数 