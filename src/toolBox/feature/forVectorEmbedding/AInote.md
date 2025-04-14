# 这个区段由开发者编写,未经允许禁止AI修改
<开发者将会在这里提出要求,AI需要判断并满足这些要求>

# 向量嵌入与相似度计算工具

## 模块组织

```
forVectorEmbedding/
├── similarity.js            # 主入口文件，整合所有相似度算法
├── vectorSimilarity.js      # 向量空间相似度算法集合
├── stringSimilarity.js      # 字符串相似度算法集合
├── forQuery.js              # 向量查询相关工具
├── useDeltaPQHNSW/          # 高性能向量索引实现
│   └── useCustomedHNSW.js   # 自定义HNSW实现
└── README.md                # 使用文档
```

## 迁移记录

### 已完成迁移

从 `source/utils/vector/similarity.js` 迁移了以下功能：

- [x] 余弦相似度计算 (`计算余弦相似度`)
- [x] 归一化向量余弦相似度计算 (`计算归一化向量余弦相似度`)
- [x] 欧氏距离计算 (`计算欧氏距离相似度` → `计算欧氏距离`)
- [x] Levenshtein距离计算 (`计算Levenshtein距离`)

### 新增功能

增加了以下新功能：

- [x] 智能相似度计算 (`智能计算相似度`)
- [x] 曼哈顿距离计算 (`计算曼哈顿距离`)
- [x] 点积计算 (`计算点积`)
- [x] 加权余弦相似度 (`计算加权余弦相似度`)
- [x] Jaccard相似度 (`计算Jaccard相似度`)
- [x] 基于Levenshtein的相似度转换 (`计算Levenshtein相似度`)
- [x] Jaro-Winkler相似度 (`计算JaroWinkler相似度`)
- [x] 最长公共子序列计算 (`计算最长公共子序列长度`)
- [x] 基于LCS的相似度 (`计算LCS相似度`)

### 优化内容

1. **性能优化**：
   - 添加了数组长度边界检查，避免越界访问
   - 使用Math.min优化循环长度
   - 提前处理特殊情况（如零向量）

2. **接口改进**：
   - 所有函数支持TypedArray输入
   - 增加了详细的JSDoc文档和使用示例
   - 提供了中英文双命名支持

3. **可用性增强**：
   - 添加智能相似度计算，能自动选择合适的算法
   - 分离了向量和字符串相似度到不同文件
   - 保持向后兼容性

## 使用指南

### 基本用法

```javascript
import { 计算余弦相似度, 计算Levenshtein距离 } from '../../../src/toolBox/feature/forVectorEmbedding/similarity.js';

// 计算向量相似度
const similarity = 计算余弦相似度([0.1, 0.2, 0.3], [0.2, 0.3, 0.4]);

// 计算字符串编辑距离
const distance = 计算Levenshtein距离('kitten', 'sitting');
```

### 使用智能相似度计算

```javascript
import { 智能计算相似度 } from '../../../src/toolBox/feature/forVectorEmbedding/similarity.js';

// 自动选择算法
const sim1 = 智能计算相似度([0.1, 0.2, 0.3], [0.2, 0.3, 0.4]);  // 使用余弦相似度
const sim2 = 智能计算相似度('hello', 'hallo');                   // 使用JaroWinkler或Levenshtein

// 指定算法
const sim3 = 智能计算相似度([1, 2, 3], [2, 3, 4], { type: 'euclidean' });
const sim4 = 智能计算相似度('hello', 'hallo', { type: 'lcs' });
```

### 英文接口

所有函数也提供了英文命名的接口：

```javascript
import { 
    calculateCosineSimilarity, 
    calculateLevenshteinDistance 
} from '../../../src/toolBox/feature/forVectorEmbedding/similarity.js';

calculateCosineSimilarity([0.1, 0.2, 0.3], [0.2, 0.3, 0.4]);
```

## 后续规划

1. **高性能索引扩展**：
   - 继续完善useDeltaPQHNSW实现
   - 添加向量量化和降维功能
   - 实现LSH (局部敏感哈希)

2. **增强功能**：
   - 添加样本权重支持
   - 实现批量相似度计算
   - 优化大规模向量处理性能

3. **专业领域扩展**：
   - 文本嵌入特定相似度计算
   - 图像特征向量相似度
   - 语义相似度计算 