# 资产管理工具 (forAssets)

此目录包含处理各类资产文件（图片、视频、文档等）的工具函数。这些工具函数抽象自项目的各个面板和组件，提供统一的资产处理能力。

## 文件结构

- `forTags.js` - 资产标签处理工具
- `forAssetInfo.js` - 资产信息处理工具

## 功能概述

### 资产标签处理 (forTags.js)

提供标签统计和管理功能：

```js
import { 计算标签文件数量 } from '../../../toolBox/feature/forAssets/forTags.js';

// 使用示例
const tagCounts = 计算标签文件数量(fileList);
// 返回 { "标签1": 5, "标签2": 3, ... }
```

### 资产信息处理 (forAssetInfo.js)

提供资产信息提取、格式化和比较功能：

```js
import { 
  获取资产文件格式,
  获取资产本地文件夹,
  生成资产描述标签,
  处理资产路径数组,
  比较资产路径数组
} from '../../../toolBox/feature/forAssets/forAssetInfo.js';

// 使用示例
const format = 获取资产文件格式(assets);
const { folderArray, displayText } = 获取资产本地文件夹(assets);
const label = 生成资产描述标签(assets);
const uniquePaths = 处理资产路径数组(assetPaths);
const isEqual = 比较资产路径数组(oldPaths, newPaths);
```

## 设计原则

1. **函数式风格**：优先使用纯函数，避免副作用
2. **单一职责**：每个函数只处理一种特定的资产信息需求
3. **健壮性**：所有函数都应处理边缘情况，如空数组或无效输入
4. **通用性**：函数应能处理多种资产类型，不仅限于特定格式

## 开发指南

向此目录添加新工具时，请遵循以下原则：

1. 根据处理对象进行分类，如标签、元数据、路径等
2. 提供完整的JSDoc文档注释
3. 为所有函数添加输入验证
4. 保持函数纯度，避免修改传入参数 