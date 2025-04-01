# 工具箱重构历史

## 阶段4 (当前)

### 重构计划

1. **siyuanCommon工具函数实现**
   - 实现斜杠菜单工具 (useSiyuanSlash.js)
   - 实现页签管理工具 (useSiyuanTab.js)
   - 完善对话框工具 (useSiyuanDialog.js)
   - 实现颜色工具 (useSiyuanColor.js)
   - 实现菜单构建工具 (useSiyuanMenuBuilder.js)

2. **工具箱性能优化**
   - 提供按需导入机制
   - 实现延迟加载策略
   - 优化大型依赖的处理
   - 添加性能测试基准

3. **工具箱测试与文档完善**
   - 为核心工具函数添加单元测试
   - 更新和完善使用文档
   - 创建API参考指南
   - 提供更多使用示例

### 目标成果

- 完成siyuanCommon工具函数的实现
- 提高工具箱的性能和可靠性
- 完善工具箱的文档和测试

## 阶段3 (已完成)

### 重构工作

1. **后端服务工具重构**
   - 将后端日志工具重构到工具箱 (useLogger.js)
   - 将心跳工具重构到工具箱 (useHeartBeat.js)
   - 将C#加载工具重构到工具箱 (useCSharpLoader.js)
   - 移除兼容层，使用直接导入
   - 完善相关文档

2. **工具箱目录结构优化**
   - 在base/useEcma下添加forLogs目录
   - 在base/useElectron下添加forCSharp目录
   - 完善Electron环境相关工具

3. **功能集成与文档改进**
   - 优化toolBoxExports.js中的导出
   - 更新README.md文件
   - 完善AInote.md中的重构指南

### 成果

- 成功迁移后端服务工具到工具箱
- 消除了冗余的兼容层代码
- 保持了与现有代码的兼容性
- 优化了工具箱的目录结构

## 阶段2 (已完成)

### 重构工作

1. **完成了多个思源相关API模块重构**
   - 创建思源工作区操作API (useSiyuanWorkspace.js)
   - 创建思源笔记本操作API (useSiyuanNotebook.js)
   - 创建思源资源文件操作API (useSiyuanAsset.js)
   - 完善思源环境依赖模块 (useSiyuan.js)，添加fs命名空间

2. **网络请求工具优化**
   - 创建统一的思源API请求基础模块 (apiBase.js)
   - 实现请求缓存、重试和超时机制
   - 添加SQL查询、搜索和同步等API支持
   - 用统一请求模块重构现有API模块

3. **规划siyuanCommon工具函数重构**
   - 制定了斜杠菜单工具 (useSiyuanSlash.js) 开发计划
   - 制定了页签管理工具 (useSiyuanTab.js) 开发计划
   - 制定了对话框工具 (useSiyuanDialog.js) 增强计划
   - 制定了颜色工具 (useSiyuanColor.js) 开发计划
   - 制定了菜单构建工具 (useSiyuanMenuBuilder.js) 开发计划

### 成果

- 建立了统一的思源API请求基础设施
- 完善了思源核心功能的API封装
- 制定了详细的工具函数重构计划
- 更新了项目文档和开发指南

## 阶段1 (已完成)

### 重构工作

1. **工具函数迁移**
   - 从根目录、source/utils和toolBox目录迁移关键工具函数
   - 按功能域组织工具函数到不同子目录
   - 保持向后兼容，添加弃用警告

2. **依赖管理改进**
   - 创建拼音处理依赖封装
   - 创建思源环境依赖集中管理
   - 创建思源对话框和系统API工具

3. **文档完善**
   - 为所有重构文件添加JSDoc注释
   - 创建多个目录的README.md说明文档
   - 优化API参数和返回值类型

### 成果

- 建立了模块化的工具箱结构
- 提高了代码复用性和可维护性
- 为后续重构奠定了基础

## 工具箱结构重构

为提高代码组织的清晰度，我们将工具箱结构调整为三个基础分类:

### 新结构

```
src/toolBox/
├── base/          - 基础工具函数
│   ├── useEcma/   - ECMA标准功能封装
│   │   ├── forLogs/   - 日志处理工具
│   │   └── ...
│   ├── forNetwork/ - 网络相关工具
│   ├── forEvent/  - 事件处理工具
│   ├── forMime/   - MIME类型处理
│   ├── forCore/   - 核心串链器工具
│   ├── forUI/     - 通用UI组件工具
│   ├── usePolyfills/ - 平台兼容性工具
│   ├── useDeps/   - 依赖管理工具
│   ├── useElectron/ - Electron环境工具
│   │   ├── forCSharp/ - C#交互工具
│   │   └── ...
│   └── ...
├── feature/       - 特定功能工具
│   ├── useImage/  - 图像处理工具
│   ├── useVue/    - Vue框架工具
│   ├── forFileSystem/ - 文件系统工具
│   └── ...
├── useAge/        - 使用场景相关工具
│   ├── forFileManage/ - 文件管理工具
│   ├── forSiyuan/     - 思源特定功能工具
│   ├── useSiyuan.js   - 思源环境依赖
│   └── ...
├── toolBoxExports.js - 统一导出接口
└── README.md      - 工具箱说明
```

### 变更内容

1. **移动的文件夹**:
   - `forCore` → `base/forCore`
   - `forEvent` → `base/forEvent`
   - `forMime` → `base/forMime`
   - `forFileSystem` → `feature/forFileSystem`
   - `forUI` → `base/forUI`
   - `useDeps` → `base/useDeps`
   - `usePolyfills` → `base/usePolyfills`
   - `useVue` → `feature/useVue`

2. **新增的文件夹**:
   - `base/useEcma/forLogs` - 日志工具
   - `base/useElectron` - Electron环境工具
   - `base/useElectron/forCSharp` - C#交互工具

3. **目录名称修正**:
   - `forNetWork` → `forNetwork` (拼写修正)
   - `useAge` 定义明确为"使用场景相关工具"而非"使用时间相关工具"

### 重构原则

遵循"三层分类"原则，保持结构清晰:
- `base`: 所有基础工具和底层实现
- `feature`: 特定功能实现和扩展
- `useAge`: 面向使用场景的应用功能 

## 2024-03-31：完成服务器工具函数重构

### 重构内容

从`source/server`目录中提取并重构了以下工具函数：

1. **WebSocket事件处理工具**
   - 路径：`src/toolBox/base/forNetwork/forWebSocket/useWebSocketEvents.js`
   - 源文件：`source/server/backendEvents.js`
   - 改进：使用函数式风格重写，增强错误处理，规范化接口

2. **端点URL生成工具**
   - 路径：`src/toolBox/base/forNetwork/forEndPoints/useEndPointsBuilder.js`
   - 源文件：`source/server/endPoints.js`
   - 改进：模块化设计，增强参数校验，提升灵活性

3. **Electron窗口管理工具**
   - 路径：`src/toolBox/base/useElectron/forWindow/useBrowserWindow.js`
   - 源文件：`source/server/utils/containers/browserWindow.js`
   - 改进：使用Promise和async/await，规范化配置参数，增强错误处理

### 迁移策略

采用直接迁移策略，没有创建兼容层，而是直接在原代码中替换为新工具函数的导入和调用。这种方式减少了冗余代码，但要求更仔细的测试以确保功能不受影响。

### 下一步计划

1. 继续优化提取的工具函数，完善文档和测试
2. 考虑重构`source/server/utils/logs`目录下的日志处理工具
3. 评估`source/server/utils/glob`目录下的Glob匹配工具 

## 2024-04-01：修复端点URL生成工具的向后兼容性

### 修复内容

1. **端点URL生成工具向后兼容升级**
   - 路径：`src/toolBox/base/forNetwork/forEndPoints/useEndPointsBuilder.js`
   - 问题：重构后的工具使用中文命名方法，而旧代码使用英文命名，导致`Cannot read properties of undefined (reading 'getPathExtensions')`错误
   - 解决方案：添加英文别名以保持向后兼容
   - 增强：
     - 为`fs.path`、`fs.disk`添加英文方法名
     - 为`thumbnail`添加英文方法名
     - 为`metaRecords`添加英文方法名
   - 文档：在AInote.md中添加兼容性说明

### 向后兼容策略调整

在重构工具函数时，需要遵循以下原则以确保向后兼容性：

1. **双命名导出**：提供中文命名的主函数，同时导出英文命名的别名函数
2. **接口保持一致**：保持函数签名和返回值格式不变
3. **属性名兼容**：为对象属性提供中英文双命名
4. **测试用例覆盖**：编写测试用例验证兼容性

这次修复强调了在进行重构时需要仔细检查现有代码对函数的调用方式，特别是对象属性的访问模式。

### 未来改进方向

1. 完善单元测试，确保重构后的工具函数能够与现有代码兼容
2. 考虑使用TypeScript提供更好的类型检查，减少运行时错误
3. 添加废弃警告，鼓励使用中文命名的版本 

## 2024-04-01：修复Electron窗口管理工具兼容性问题

### 修复内容

1. **Electron Remote模块兼容性问题修复**
   - 路径：`src/toolBox/base/useElectron/forWindow/useBrowserWindow.js`
   - 问题：遇到错误 `Uncaught (in promise) Error: @electron/remote is disabled for this WebContents`
   - 原因：不同版本的Electron和@electron/remote的启用方式不同
   - 解决方案：
     - 增加enableRemote配置选项，可传入自定义函数
     - 实现多种启用方式尝试，按顺序兼容不同版本：
       1. 传入的自定义enableRemote函数
       2. Electron内置remote模块方式
       3. 通过ipcRenderer请求主进程启用
       4. 直接require启用方式
       5. 解构enable函数方式
       6. initialize+enable组合方式
     - 增强错误处理和日志记录
     - 添加主进程侦听器处理远程模块启用请求
   - 文档：在AInote.md中添加兼容性问题说明和使用建议

### 通用兼容性策略

为应对库和框架的版本差异问题，建议采用以下策略：

1. **多方案尝试**：按优先级尝试多种实现方式
2. **配置注入**：提供配置选项允许外部注入正确实现
3. **全面错误日志**：记录所有错误以便于调试
4. **优雅降级**：当关键功能不可用时提供替代方案
5. **进程间通信**：利用可靠的IPC机制解决特定环境问题

这次修复强调了在处理与外部库交互时需要考虑版本差异和API变化带来的兼容性问题，特别是在Electron这样快速迭代的框架中。
通过实现多种方案尝试、错误日志记录和进程间通信等机制，我们可以有效解决在不同Electron版本中的兼容性问题。

### 未来改进计划

1. 实现更全面的Electron环境检测
2. 考虑添加环境模拟能力，以便在非Electron环境下进行测试
3. 为常见的Electron版本提供预设配置
4. 添加Electron版本检测，自动选择合适的远程模块启用方式

## 2024-04-02：更新Electron窗口工具中的远程模块启用方式

### 修复内容

1. **参照webview.js实现远程模块启用**
   - 路径：`src/toolBox/base/useElectron/forWindow/useBrowserWindow.js`
   - 参考文件：`source/server/utils/containers/webview.js`
   - 问题：之前实现的多种尝试方式过于复杂，且在某些环境中不稳定
   - 解决方案：
     - 参照webview.js中的实现，使用`remote.require("@electron/remote/main").enable`方式
     - 提供导出的enableRemote函数供直接使用
     - 简化实现，减少冗余代码和多层嵌套尝试
     - 保留ipcRenderer通信作为备选方案
   - 文档：更新AInote.md中的使用说明

### 实现要点

1. **简化启用方式**：
   ```javascript
   export const enableRemote = () => {
     try {
       const remote = window.require('@electron/remote');
       return remote.require("@electron/remote/main").enable;
     } catch (错误) {
       console.error('创建enableRemote函数失败:', 错误);
       return null;
     }
   };
   ```

2. **提供统一使用接口**：
   - 直接导出enableRemote函数
   - 在创建窗口函数中保留enableRemote参数以支持自定义实现
   - 在main.js中更新启用远程模块的方式

### 优化效果

1. 代码更加简洁，减少了嵌套尝试和错误处理的复杂度
2. 遵循项目中已有的最佳实践，提高了一致性
3. 更容易理解和维护，减少了潜在的问题
4. 在多个Electron版本中测试更加稳定

### 建议的最佳实践

在使用@electron/remote时，应该遵循以下最佳实践：

1. 使用`remote.require("@electron/remote/main").enable`方式启用远程模块
2. 为不同环境提供备选方案，但避免过于复杂的多层尝试
3. 提供清晰的错误日志以方便调试

## 2024-04-03：迁移Electron Webview管理工具

### 迁移内容

1. **整合Webview相关工具**
   - 新文件：`src/toolBox/base/useElectron/forWindow/useWebview.js`
   - 源文件：
     - `source/server/utils/containers/webview.js`
     - `source/server/utils/containers/createProxyHTML.js`
     - `source/server/utils/containers/webviewProcessors.js`
   - 改进内容：
     - 将分散在三个文件中的功能整合到单一模块
     - 使用函数式风格重构，使用Promise和async/await
     - 规范化命名，添加中文函数名
     - 增强错误处理和环境检查
     - 改进IPC通信和超时处理
   - 文档：创建`useWebview.AInote.md`详细说明迁移过程

### 主要功能

1. **代理HTML创建**：
   - `创建代理HTML` - 生成用于加载JavaScript的HTML代码
   - `创建代理HTMLURL` - 将HTML代码转换为可加载的URL

2. **Webview管理**：
   - `创建不可见Webview` - 创建隐藏的Webview元素
   - `通过JS地址创建Webview` - 从JavaScript URL创建Webview
   - `通过JS字符串创建Webview` - 从JavaScript代码创建Webview

3. **函数暴露**：
   - `向Webview暴露函数` - 将函数暴露到Webview中执行
   - 通过IPC通信实现跨Webview的函数调用

### 兼容性策略

为确保与现有代码兼容，同时进行规范化重构，采用了以下策略：

1. **双命名导出**：
   ```javascript
   export const createProxyHTMLURL = 创建代理HTMLURL;
   export const enableRemote = 启用远程模块;
   export const createInvisibleWebview = 创建不可见Webview;
   export const createWebviewByJsURL = 通过JS地址创建Webview;
   export const createWebviewByJsString = 通过JS字符串创建Webview;
   export const exposeFunctionToWebview = 向Webview暴露函数;
   ```

2. **功能增强**：
   - 增加了超时处理
   - 增强了错误捕获机制
   - 添加了事件监听器的自动清理
   - 提供了更详细的日志记录

### 后续工作

1. 考虑添加单元测试，确保重构后的功能与原功能一致
2. 创建使用示例，方便其他开发者理解如何使用
3. 检查和处理现有代码中对这些工具的引用，确保兼容性
4. 完善文档，添加更多的使用场景和最佳实践 