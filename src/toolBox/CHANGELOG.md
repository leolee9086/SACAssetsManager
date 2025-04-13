# 工具箱变更日志

## 阶段5 更新计划 (当前进行中)

### 思源笔记工具函数整合与优化
- [ ] 解决`useSiyuanSlash.js`和`useSiyuanDialog.js`之间的功能重叠
- [ ] 统一`useSiyuanMenu.js`和相关菜单构建工具的接口
- [ ] 优化`useSiyuanBlock.js`的块操作功能，增强批量处理能力
- [ ] 完善`useSiyuanAsset.js`的资源管理功能

### 性能优化
- [ ] 实现更高效的延迟加载和按需导入策略
- [ ] 为频繁调用的API添加缓存机制
- [ ] 优化批量操作的并发处理
- [ ] 减少启动时的资源占用

### 代码重构与解耦
- [ ] 调整`forSiyuan`目录结构，按功能更清晰划分
- [ ] 合并功能相似的模块，减少文件数量
- [ ] 移除过时或冗余的代码
- [ ] 规范化文件命名和路径组织

### 文档与示例完善
- [ ] 为所有模块添加完整的JSDoc注释
- [ ] 编写详细的API文档和使用示例
- [ ] 提高代码的可维护性和可读性

## 阶段4 完成内容 (已完成)

### 思源笔记特有功能工具函数实现
- [x] 实现`useSiyuanSlash.js`斜杠菜单工具
- [x] 实现`useSiyuanDialog.js`对话框工具
- [x] 实现`useSiyuanTab.js`页签管理工具
- [x] 实现`useSiyuanColor.js`颜色工具
- [x] 实现`useSiyuanMenu.js`菜单构建工具

### 文件迁移与整合
- [x] 将`BlockHandler.js`迁移到`forBlock/useBlockHandler.js`
- [x] 将`blockIcons.js`迁移到`forBlock/useSiyuanBlockIcon.js`
- [x] 将`markdown.js`迁移到`forMarkdown/useSiyuanMarkdown.js`
- [x] 将`upload.js`迁移到`forAsset/useSiyuanUpload.js`

### 思源内核API集成
- [x] 实现`useSiyuanAsset.js`资源操作API
- [x] 实现`useSiyuanBlock.js`块操作API
- [x] 实现`useSiyuanFile.js`文件操作API
- [x] 实现`useSiyuanNotebook.js`笔记本操作API
- [x] 实现`useSiyuanSystem.js`系统操作API
- [x] 实现`useSiyuanFiletree.js`文件树操作API

## 阶段3 完成内容

### 后端服务工具重构
- [x] 日志工具：`base/useEcma/forLogs/useLogger.js`
- [x] 心跳工具：`base/useElectron/useHeartBeat.js`
- [x] C#加载工具：`base/useElectron/forCSharp/useCSharpLoader.js`
- [x] WebSocket事件工具：`base/forNetwork/forWebSocket/useWebSocketEvents.js`
- [x] 端点URL生成工具：`base/forNetwork/forEndPoints/useEndPointsBuilder.js`
- [x] Electron窗口管理工具：`base/useElectron/forWindow/useBrowserWindow.js`
- [x] Electron Webview工具：`base/useElectron/forWindow/useWebview.js`

### 目录结构优化
- [x] 移除兼容层，使服务代码直接使用工具箱函数
- [x] 优化工具箱目录结构，按功能域分类

## 阶段2 完成内容

### 基础工具函数实现
- [x] 事件总线工具：`base/forEvent/eventBusTools.js`
- [x] 文本处理工具：`base/useEcma/textTools.js`
- [x] 拼音工具：`base/useDeps/pinyinTools.js`
- [x] 网络请求工具：`base/forNetwork/forFetch/index.js`
- [x] 端口管理工具：`base/forNetwork/forPort/forPortAvailability.js`

### 特性工具函数实现
- [x] 图像处理工具：`feature/useImage/imageToolBox.js`
- [x] Vue组件工具：`feature/useVue/vueComponentLoader.js`
- [x] Canvas处理工具：`base/useBrowser/useCanvas/index.js`

## 阶段1 完成内容

### 初始结构搭建
- [x] 创建工具箱基本目录结构
- [x] 实现工具箱统一导出接口
- [x] 制定命名规范和代码风格指南

### 平台兼容性工具实现
- [x] UA分析工具：`base/usePolyfills/uaAnalysis.js`
- [x] 平台检测工具：`base/usePolyfills/platformDetection.js`
- [x] 浏览器检测工具：`base/usePolyfills/browserDetection.js`
- [x] 操作系统检测工具：`base/usePolyfills/osDetection.js` 