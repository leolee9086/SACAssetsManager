# 思源笔记特定功能工具重构笔记

## 重构状态

该目录包含思源笔记特定功能的工具函数和模块，目前正在进行第3阶段重构工作。

## 职责范围

- 提供思源笔记特定功能的封装
- 集中管理与思源的交互接口
- 提供统一的思源菜单、对话框等工具

## 当前重构计划（阶段3）

### 已完成的重构
- ✅ 将`source/fromThirdParty/siyuanUtils/`下的工具函数迁移到对应模块
- ✅ 将`source/fromThirdParty/siyuanKernel/`下的核心API迁移到对应模块
- ✅ 将`source/fromThirdParty/siyuanClient/`下的客户端工具迁移到对应模块

### 正在进行的重构
- ✅ useSiyuanMenu.js - 思源菜单工具（已完成）
- ✅ useSiyuanDialog.js - 思源对话框工具（已完成）
- ✅ useSiyuanSystem.js - 思源系统API（已完成）
- ✅ useSiyuanBlock.js - 思源块操作工具（已完成）
- ✅ useSiyuanNotebook.js - 思源笔记本管理工具（已完成）
- ✅ useSiyuanAsset.js - 思源资源文件管理工具（已完成）
- ✅ useSiyuanFile.js - 思源文件操作工具（已完成）
- ✅ useSiyuanFiletree.js - 思源文件树操作工具（已完成）
- ⏳ useSiyuanSlash.js - 思源斜杠菜单工具（进行中）
- ⏳ useSiyuanTab.js - 思源页签管理工具（进行中）
- ⏳ useSiyuanColor.js - 思源颜色工具（计划中）
- ⏳ useSiyuanMenuBuilder.js - 思源菜单构建工具（计划中）

## 重构原则

1. **功能集中**：
   - 将散落在各处的思源相关功能集中到该目录
   - 通过useSiyuan.js提供统一入口
   - 相关功能放在同一文件中

2. **接口统一**：
   - 提供一致的API设计
   - 统一错误处理方式
   - 提供中英文双命名接口

3. **思源兼容**：
   - 注意不同版本思源API的差异
   - 提供适当的兼容层
   - 添加版本检查和回退机制

## 重构进度

- ✅ useSiyuanMenu.js - 思源菜单工具（已完成）
- ✅ useSiyuanDialog.js - 思源对话框工具（已完成）
- ✅ useSiyuanSystem.js - 思源系统API（已完成）
- ✅ useSiyuanBlock.js - 思源块操作工具（已完成）
- ✅ useSiyuanNotebook.js - 思源笔记本管理工具（已完成）
- ✅ useSiyuanAsset.js - 思源资源文件管理工具（已完成）
- ✅ useSiyuanFile.js - 思源文件操作工具（已完成）
- ✅ useSiyuanFiletree.js - 思源文件树操作工具（已完成）
- ⏳ useSiyuanSlash.js - 思源斜杠菜单工具（进行中）
- ⏳ useSiyuanTab.js - 思源页签管理工具（进行中）
- ⏳ useSiyuanColor.js - 思源颜色工具（计划中）
- ⏳ useSiyuanMenuBuilder.js - 思源菜单构建工具（计划中）

## 实施顺序和优先级

1. 先从功能相对独立的useSiyuanSlash.js开始重构
2. 然后处理useSiyuanTab.js，提供页签管理功能
3. 接着实现useSiyuanColor.js，支持颜色相关功能
4. 最后完成useSiyuanMenuBuilder.js，提供组合式菜单构建

## 注意事项

- 重构过程中要保持与现有代码的兼容性
- 所有函数都应该有适当的错误处理
- 需要考虑思源笔记不同版本的兼容性问题
- 添加适当的文档和示例代码
- 确保与useSiyuan.js中的API保持一致

## 进度跟踪

当前重构计数：1（完成后减1）

完成所有计划的工具函数重构后，将重构计数减至0，表示完成本阶段重构工作，并在history.md中记录进度。 