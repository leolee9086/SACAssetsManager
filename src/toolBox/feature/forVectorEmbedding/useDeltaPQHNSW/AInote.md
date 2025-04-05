# HNSW向量检索模块

本模块实现了高性能的HNSW (Hierarchical Navigable Small World) 向量索引及搜索算法，采用函数式编程风格。

## 模块结构

该模块按照关注点分离原则，将不同功能拆分为多个文件：

- `useCustomedHNSW.js` - 主模块实现，包括核心索引操作
- `forHNSWHelpers.js` - 辅助函数，包括距离缓存、随机层级生成等
- `forHNSWIdMapping.js` - ID映射管理相关函数
- `forHNSWSearch.js` - 搜索相关函数，包括层级搜索和最近邻搜索
- `forHNSWOptimize.js` - 索引优化和统计相关函数
- `forHNSWBatch.js` - 批量操作函数，支持高效批量插入和搜索

## 功能特点

1. 高性能近似最近邻搜索
2. 可扩展的多距离度量支持（欧几里得、余弦、内积等）
3. 距离计算缓存优化
4. 分层图结构，查询复杂度为O(log n)
5. 节点的逻辑删除而非物理删除，减少内存碎片
6. 高效批量操作支持
7. 连接结构优化功能，提高召回率

## 使用方式

基本使用示例：

```javascript
import { createHNSWIndex } from './useCustomedHNSW.js';

// 创建索引
const index = createHNSWIndex({
  distanceFunction: 'cosine', // 'euclidean'、'cosine'或'inner_product'
  M: 64,                      // 每层最大连接数
  efConstruction: 200,        // 构建参数
  efSearch: 200,              // 搜索参数
  ml: 16                      // 最大层数
});

// 插入向量
const id1 = index.insertNode([0.1, 0.2, 0.3], { label: 'vector1' });
const id2 = index.insertNode([0.2, 0.3, 0.4], { label: 'vector2' });

// 搜索最近邻
const results = index.searchKNN([0.1, 0.2, 0.3], 10);
```

## 性能优化建议

1. 较大数据集建议使用批量插入函数 `batchInsertNodes`
2. 搜索参数 `efSearch` 影响召回率和速度，值越大召回率越高但速度越慢
3. 构建参数 `efConstruction` 影响索引质量，值越大索引质量越高但构建越慢
4. 对于高维向量，推荐使用余弦距离
5. 如果需要提高召回率，可以使用 `optimizeConnectivity` 优化连接结构

## 性能优化与问题排查

### ID匹配问题排查

召回率始终为0的核心问题通常与ID映射有关。HNSW索引内部使用自增ID，而测试数据使用原始ID，这两者需要正确映射：

1. 确保向量插入索引时，原始ID被保存在节点的metadata中
2. 在搜索结果返回时，应该返回原始ID而不是内部节点ID
3. 测试验证时，需要确保精确搜索和HNSW搜索返回的ID格式一致

### 常见问题解决

1. **召回率低问题**
   - 增大efSearch参数 (200以上)
   - 确保M参数足够大 (32-64)
   - 底层实现双向连接以提高图连通性
   
2. **ID映射问题**
   - 在节点metadata中明确保存原始ID
   - 搜索结果处理时返回原始ID
   - 保持精确搜索和HNSW搜索使用相同的ID格式

3. **向量规范化**
   - 使用余弦距离时，确保向量已规范化
   - 对于欧氏距离，确保向量维度和数值范围一致

## 优化方向

1. 增加距离计算缓存，减少重复计算
2. 底层节点加入更多双向连接，提高召回率
3. 在查询时使用更大的ef值
4. 针对底层实现更密集的连接结构 