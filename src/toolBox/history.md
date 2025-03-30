# 工具箱重构历史

## 阶段3 (当前)

### 重构计划

1. **siyuanCommon工具函数重构实施**
   - 开始实现之前规划的思源公共工具函数重构
   - 创建斜杠菜单工具 (useSiyuanSlash.js)
   - 创建页签管理工具 (useSiyuanTab.js)
   - 增强对话框工具 (useSiyuanDialog.js)
   - 创建颜色工具 (useSiyuanColor.js)
   - 创建菜单构建工具 (useSiyuanMenuBuilder.js)

2. **工具箱导出接口优化**
   - 优化toolBoxExports.js的结构
   - 按功能域对导出工具进行分组
   - 添加版本信息和更新记录
   - 提供按需导入支持

3. **跨环境兼容性增强**
   - 扩展usePolyfills模块
   - 添加更多浏览器兼容性工具
   - 完善Electron环境支持

### 目标成果

- 完成siyuanCommon工具函数的全面重构
- 提高工具箱的可用性和可维护性
- 增强跨环境兼容性支持

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
│   ├── forNetwork/ - 网络相关工具
│   ├── forEvent/  - 事件处理工具
│   ├── forMime/   - MIME类型处理
│   ├── forCore/   - 核心串链器工具
│   ├── forUI/     - 通用UI组件工具
│   ├── usePolyfills/ - 平台兼容性工具
│   ├── useDeps/   - 依赖管理工具
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

2. **目录名称修正**:
   - `forNetWork` → `forNetwork` (拼写修正)
   - `useAge` 定义明确为"使用场景相关工具"而非"使用时间相关工具"

### 重构原则

遵循"三层分类"原则，保持结构清晰:
- `base`: 所有基础工具和底层实现
- `feature`: 特定功能实现和扩展
- `useAge`: 面向使用场景的应用功能 