# HNSW向量索引测试工具

本目录包含用于测试和比较不同HNSW向量索引实现的工具和测试套件。

## 可用测试

- **hnswlayers对比测试**: 比较不同HNSW实现的性能和准确性
- **runHnswlayersTest.js**: 测试入口，包括hnswClassic.js的测试

## 使用方法

1. 运行基本测试:
```bash
node tests/feature/runHnswlayersTest.js
```

2. 修改参数:
在`runHnswlayersTest.js`中修改测试参数如向量维度、查询次数等。

## hnswClassic.js测试说明

从最新版本开始，测试套件支持使用hnswClassic.js作为经典HNSW实现进行测试，这是基于Rust horaHnsw.rs的JavaScript实现。

### 主要特性

- 使用相同的算法结构和数据组织方式
- 支持余弦、欧氏、曼哈顿和点积距离度量
- 支持数据序列化和反序列化
- 提供与原生实现相似的API

### 使用注意事项

1. **Node类构造**: 使用`Node`类包装向量和ID
2. **距离选择**: 使用`Metric`枚举选择距离度量方式(Cosine = 2)
3. **内存效率**: JavaScript实现在大规模数据上可能内存效率不如原生实现
4. **构建与搜索**: 调用`build(metricType)`构建索引，使用`nodeSearchK(node, k)`查询

### 典型用法

```javascript
import { HNSWIndex, Node, Metric } from '../src/toolBox/feature/forVectorEmbedding/useDeltaPQHNSW/hnswClassic.js';

// 创建索引
const index = new HNSWIndex(128, {
  n_neighbor: 16,
  n_neighbor0: 32,
  max_level: 6,
  ef_build: 200,
  ef_search: 100
});

// 添加数据
const node = new Node([...向量数据], '唯一ID');
index.addNode(node);

// 构建索引(使用余弦距离)
index.build(Metric.Cosine);

// 查询
const queryNode = new Node([...查询向量]);
const results = index.nodeSearchK(queryNode, 10);
```

## 测试性能优化建议

1. 降低测试向量维度(如512)以加快测试速度
2. 减少查询次数加快测试完成
3. 测试小数据集时降低最小可接受召回率(如70%)
4. 可以通过设置`skipClassicImplementation: true`跳过经典算法测试
5. 调整HNSW参数如M、efConstruction和efSearch会影响性能和准确性 