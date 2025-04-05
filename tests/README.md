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