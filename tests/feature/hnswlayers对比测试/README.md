# HNSW算法对比测试套件

本测试套件用于比较不同的HNSW索引实现在向量搜索任务中的性能差异。

## 概述

测试套件比较了三种HNSW向量索引实现:
1. 自定义HNSW - 本项目自行实现的HNSW索引
2. 经典HNSW - 在数据集类中使用的HNSW索引或使用hnswClassic.js的实现
3. Hora WASM HNSW - WebAssembly编译的高性能HNSW索引

## 测试内容

测试内容包括:
- 索引构建速度
- 查询性能
- 召回率
- 不同向量规模下的性能扩展性

## 配置与运行

### 测试参数

测试使用如下默认参数:
- 向量维度: 1024
- 查询次数: 20
- 返回邻居数量(k): 10
- 最小可接受召回率: 90%
- 向量规模增长因子: 2
- 起始向量数量: 1000
- 最大测试向量数量: 8000

### HNSW配置参数

所有HNSW索引实现都使用如下配置:
- M值 (每个节点最大连接数): 48
- efConstruction (构建索引时的ef值): 800
- efSearch (搜索时的ef值): 800
- 最大层数: 16
- 距离函数: 余弦距离

### 运行测试

```javascript
import { 安全运行指数级扩展测试 } from './testSuite.mjs';

// 使用默认配置运行测试
安全运行指数级扩展测试();

// 使用自定义配置运行测试
安全运行指数级扩展测试({
  dimensions: 512,
  numQueries: 10,
  k: 20,
  minRecallRate: 95,
  maxVectorCount: 4000,
  startVectorCount: 500,
  hnswParams: {
    M: 32,
    efConstruction: 400,
    efSearch: 400,
    ml: 8
  }
});

// 使用hnswClassic.js作为经典实现运行测试
安全运行指数级扩展测试({
  dimensions: 512,
  numQueries: 10,
  k: 10,
  skipClassicImplementation: false,
  useClassicFromModule: true,  // 使用导入的HNSWClassic模块
  hnswParams: {
    M: 16,
    efConstruction: 200,
    efSearch: 100,
    ml: 8
  }
});
```

## 使用hnswClassic.js测试

从v2.0版本开始，测试套件支持使用hnswClassic.js（基于Rust horaHnsw.rs的1:1翻译）作为经典HNSW实现进行测试。

### 使用方法

1. 在测试入口文件中导入hnswClassic.js中的HNSWIndex和createHNSWParams：
```javascript
import { HNSWIndex, createHNSWParams } from '../src/toolBox/feature/forVectorEmbedding/useDeltaPQHNSW/hnswClassic.js';

// 添加到全局环境
global.HNSWClassic = {
  HNSWIndex,
  createHNSWParams
};
```

2. 在测试配置中设置useClassicFromModule为true：
```javascript
runTests({
  // ...其他参数...
  skipClassicImplementation: false, // 不跳过经典实现
  useClassicFromModule: true,       // 使用导入的模块
});
```

### hnswClassic.js与其他实现的区别

1. **API差异**：hnswClassic.js使用不同的API与其他实现交互
2. **内部实现**：hnswClassic.js是从Rust直接翻译的JavaScript实现
3. **距离计算**：使用Metric枚举（值为2表示余弦距离）
4. **内存效率**：纯JavaScript实现可能内存效率不如原生实现
5. **搜索机制**：使用两阶段分层搜索的经典HNSW算法

## 测试结果分析

测试完成后，会输出以下信息:
1. 各实现的查询时间(ms)
2. 相对于暴力搜索的速度提升(倍数)
3. 各实现的召回率(%)
4. 不同向量规模下的性能趋势
5. 综合评分结果(60%速度 + 40%召回率)

## 注意事项

1. 所有测试向量都进行了归一化处理，确保是单位向量
2. 使用余弦距离(1-余弦相似度)作为距离度量，值越小表示越相似
3. 在大规模向量测试中，如果所有实现都不满足性能要求或召回率阈值，测试会提前终止 

# HNSW层数对比测试

本测试模块用于比较不同HNSW索引实现的性能和准确性，特别是测试不同层数配置对查询性能和召回率的影响。

## 主要测试项

- 自定义HNSW实现
- 经典HNSW实现
- Hora WASM HNSW实现

## 测试指标

- 索引构建时间
- 查询性能
- 召回率
- 内存使用

## 测试参数说明

- `M`: 每个节点的最大连接数
- `efConstruction`: 构建索引时的搜索宽度
- `efSearch`: 查询时的搜索宽度
- `ml`: 最大层数

## 召回率计算说明

召回率是评估近似最近邻搜索质量的重要指标，表示近似搜索能够找到的真实最近邻的百分比。

### 计算方法

1. 使用精确查询(暴力搜索)获取真实的k个最近邻
2. 使用HNSW近似搜索获取k个候选最近邻
3. 计算HNSW结果中有多少个与精确查询结果匹配
4. 召回率 = 匹配数量 / k

### 潜在问题及解决方案

- **ID格式不一致**: 不同实现返回的ID格式可能不同(数字、字符串、对象)，已通过增强的ID提取和匹配逻辑解决
- **结果数量不足**: 当返回结果少于k时，使用实际结果数量作为分母计算召回率
- **距离计算不一致**: 不同实现可能使用不同的距离度量方式，精确查询使用余弦距离作为标准
- **搜索参数不均衡**: 自定义实现使用了增强的搜索参数(如ef值提高、multipleSearches)，这可能导致不公平比较，但有助于测试最佳可能性能

## 测试结果解读

- 召回率大于90%通常被视为良好的近似搜索质量
- 速度提升应当随向量数量增加而增加
- Hora WASM实现可能在某些环境中不可用，此时将显示"N/A"

## 注意事项

1. Hora WASM结果可能与其他实现的格式有差异，已在代码中处理
2. 标准化数据对计算余弦距离很重要，测试数据已进行归一化
3. 性能测试结果受硬件影响，不同系统可能有不同表现
4. 当向量数量很小时，暴力搜索可能比HNSW更快，这是正常现象

## 运行测试

使用以下命令运行测试(从顶级目录):

```
node tests/feature/runHnswlayersTest.js
```

可以在runHnswlayersTest.js中调整测试参数，如向量维度、查询次数等。 