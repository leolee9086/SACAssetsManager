# 基础工具函数 (Base Tools)

本目录包含基础工具函数，提供整个项目的核心能力支持。这些工具是最底层、最通用的函数集合，被其他模块广泛使用。

## 目录结构

- `useEcma/` - ECMA标准功能封装
  - `forString/` - 字符串处理工具
  - `forFile/` - 文件操作相关工具
  - `forMath/` - 数学计算工具
  - `forObjectManagement/` - 对象管理工具
  - `forFunctions/` - 函数式编程工具
  - `forCrypto/` - 加密工具
  - `forTime/` - 时间处理工具
- `usePolyfills/` - 平台兼容性和检测工具
- `forUI/` - 通用UI组件工具
- `forMime/` - MIME类型处理
- `forEvent/` - 事件处理工具
- `forCore/` - 核心串链器工具
- `forNetWork/` - 网络相关工具
- `useDeps/` - 依赖管理工具
- `useEnv/` - 环境变量工具
- `useMime/` - MIME类型工具
- `useBrowser/` - 浏览器相关工具
- `useElectron/` - Electron相关工具

## 使用指南

基础工具函数应通过 `toolBoxExports.js` 导入使用：

```js
// 推荐：通过统一导出接口导入
import { 深拷贝, 防抖, 节流 } from '../toolBox/toolBoxExports.js';

// 或者直接从具体模块导入
import { 字符串过滤 } from '../toolBox/base/useEcma/forString/stringFilters.js';
```

## 基础工具的设计原则

1. **通用性优先**：
   - 只包含通用的、可复用的函数
   - 不包含特定业务逻辑
   - 广泛适用于不同场景

2. **纯函数风格**：
   - 优先使用纯函数设计
   - 避免副作用和状态依赖
   - 确保函数输出仅取决于输入

3. **最小依赖**：
   - 减少对外部模块的依赖
   - 尽量使用原生功能实现
   - 必要的外部依赖集中在useDeps管理

4. **稳定接口**：
   - 保持API接口稳定
   - 向后兼容性优先
   - 接口变更需要明确的版本管理

## 贡献指南

向基础工具添加新函数时，请遵循以下原则：

1. **职责单一**：
   - 每个函数只做一件事，并做好
   - 避免功能过于复杂或混合
   - 适当拆分复杂功能

2. **命名清晰**：
   - 使用描述性名称
   - 优先使用中文命名
   - 同时提供英文别名以保持兼容性

3. **测试覆盖**：
   - 为每个函数添加单元测试
   - 覆盖常见用例和边界情况
   - 验证异常处理逻辑

4. **文档完善**：
   - 添加完整的JSDoc注释
   - 提供使用示例
   - 说明函数的限制和注意事项

## 文件命名规范

基础工具目录使用以下命名规范：
- `useXXX/` - 提供特定技术栈或平台的基础工具
- `forXXX/` - 提供针对特定领域的基础工具

文件命名应该反映其功能，避免使用无语义的名称如index.js或main.js。

## 工具列表

### iframeLoader.js
提供通用的iframe加载器，用于在隔离环境中加载外部JavaScript库，避免污染主应用环境。

功能：
- 在隔离iframe环境中加载外部JavaScript库
- 安全获取库导出的对象
- 支持将库对象存储到全局Symbol中
- 防止库污染主应用环境

```javascript
import { createIframeLoader } from './iframeLoader.js';

// 创建加载器
const iframeLoader = createIframeLoader();

// 加载外部库
const library = await iframeLoader(
  '/path/to/library.js',  // 脚本路径 
  'libraryName',          // 库在window对象上的名称
  'globalSymbolName'      // 可选：用于全局存储的Symbol名
);
``` 