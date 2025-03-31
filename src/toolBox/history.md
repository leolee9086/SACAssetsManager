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