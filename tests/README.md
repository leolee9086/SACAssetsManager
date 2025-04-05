# SACAssetsManager 测试套件

本目录包含针对 SACAssetsManager 插件及其工具箱 (toolBox) 的测试用例。

## 目录结构

- `base/` - 基础工具 (@base) 测试用例
- `feature/` - 功能特性 (@feature) 测试用例
- `useAge/` - 应用场景 (@useAge) 测试用例
- `index.js` - 测试入口文件

## 主要测试分类

### 基础工具测试 (base/)

测试核心工具函数和基础功能，包括流化器、串链器、事件系统、网络请求等。

### 功能特性测试 (feature/)

测试中间层功能实现，包括向量嵌入、图像处理、数据结构、状态机等。

### 应用场景测试 (useAge/)

测试与具体应用场景相关的功能，包括思源笔记API、文件管理、Markdown处理等。

## 运行测试

### 运行所有测试

```bash
node tests/index.js
```

### 运行特定模块测试

```bash
node tests/base/run.js
node tests/feature/run.js
node tests/useAge/run.js
```

### 运行单个测试文件

```bash
node tests/base/流化器测试.js
```

## 测试规范

- 每个测试文件应具有清晰的测试目标和测试用例
- 测试应覆盖正常情况和边缘情况
- 测试应提供明确的成功/失败判断结果
- 测试输出应易于理解，便于定位问题

# 向量索引测试文档

## 概述

本目录包含用于测试向量索引实现的各种测试脚本，主要针对HNSW (Hierarchical Navigable Small World) 算法的实现进行性能和准确性评估。

## 测试文件说明

### 1. 向量HNSW索引测试.js

这个文件包含对自定义HNSW实现的基础功能测试，主要测试：

- 基本索引创建和查询功能
- 不同距离度量方式的支持
- 索引结构的验证
- 召回率和性能评估

### 2. hnswlayers对比测试.js

这个文件用于比较两种HNSW实现的性能和准确性：

- 自定义实现（`src/toolBox/feature/forVectorEmbedding/useDeltaPQHNSW/useCustomedHNSW.js`）
- 经典实现（`source/data/database/localDataBase/hnswlayers/`目录下的实现）

对比测试内容包括：
- 索引构建时间
- 查询性能（相对于精确查询的加速比）
- 查询召回率
- 序列化/反序列化性能
- 内存占用

## 如何运行测试

### 运行基础测试

```javascript
import { 运行测试 } from './feature/向量HNSW索引测试.js';
await 运行测试();
```

### 运行对比测试

```javascript
import { 运行对比测试 } from './feature/向量HNSW索引测试.js';
await 运行对比测试();
```

## 测试参数调整

在各测试文件中，可以调整以下参数以适应不同的测试需求：

- `numVectors`: 测试向量数量
- `dimensions`: 向量维度
- `numQueries`: 查询向量数量
- `efConstruction`: 构建参数，影响索引构建的质量和时间
- `efSearch`: 搜索参数，影响查询的准确性和时间
- `M`: 每个节点的最大连接数，影响索引结构

## 测试结果解读

测试结果将显示以下指标：

1. **构建性能**：构建索引所需时间
2. **查询性能**：查询平均时间、最小/最大时间
3. **召回率**：与精确搜索结果的匹配程度
4. **加速比**：相对于精确搜索的速度提升

理想的索引实现应该在保持高召回率（>90%）的同时，提供显著的查询加速（10x以上）。 