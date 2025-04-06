# 本地数据库模块

## 功能概述
本模块提供了一个轻量级的本地数据库实现，支持：
1. 基于键值对的数据存储
2. 向量索引和相似度搜索
3. HNSW（Hierarchical Navigable Small World）多层级图索引

## 文件结构
- `keys.js` - 主键生成、校验和数据获取功能
- `collection.js` - 数据集合管理
- `vector.js` - 向量处理工具
- `config.js` - 配置项设置
- `hnswlayers/` - HNSW索引实现
- `neighbors/` - 近邻关系管理
- `utils/` - 工具函数
- `workspaceAdapters/` - 工作区适配器

## 主要API

### 键管理 (keys.js)
```javascript
生成主键() // 生成符合规范的唯一主键
校验主键(主键值) // 验证主键是否有效
从数据集获取数据项(数据集, 主键值) // 获取特定数据项
```

### 数据集合操作 (collection.js)
请参考collection.js中的函数文档

### 向量操作 (vector.js)
请参考vector.js中的函数文档

## 性能注意事项
1. HNSW索引构建是一个计算密集型操作，应避免频繁重建
2. 向量查询性能随数据集增大而降低，请合理设置集合大小
3. 主键生成使用时间戳+随机字符组合，确保高效生成和唯一性

## 使用示例
```javascript
import { 生成主键 } from './keys.js';
import { 添加数据项到数据集 } from './collection.js';

// 创建新数据项
const 新数据项 = {
  id: 生成主键(),
  meta: { title: "示例数据" },
  vector: { "模型名称": new Float32Array([0.1, 0.2, 0.3]) }
};

// 添加到数据集
添加数据项到数据集(数据集, 新数据项);
``` 