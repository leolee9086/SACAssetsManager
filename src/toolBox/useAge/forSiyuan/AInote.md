# 思源笔记特定功能工具重构笔记

## 重构状态

该目录包含思源笔记特定功能的工具函数和模块，目前正在进行第3阶段重构工作。

## 职责范围

- 提供思源笔记特定功能的封装
- 集中管理与思源的交互接口
- 提供统一的思源菜单、对话框等工具

## 当前重构计划（阶段3）

### 1. 斜杠菜单工具函数（useSiyuanSlash.js）
- 提取`slash.js`中以下函数：
  - `handleDialogDestroy` - 处理对话框销毁后的操作
  - `openDialogWithApiConfig` - 使用API配置打开对话框
  - `openDialogWithLocalPath` - 使用本地路径打开对话框
  - `openDiskSelectionDialog` - 打开磁盘选择对话框
  - `openEverythingDialog`和`openAnytxtDialog` - 搜索工具对话框
- 提供统一的斜杠菜单项注册接口
- 添加思源环境检查和错误处理

### 2. 对话框工具函数（useSiyuanDialog.js）
- 整合`dialog/vueDialog.js`中的`openDialog`函数
- 整合`dialog/inputDialog.js`中的输入对话框功能
- 整合`dialog/tasks.js`中的任务对话框功能
- 整合`dialog/fileDiffAndPick.js`中的文件对比和选择功能
- 提供统一的对话框创建和管理接口

### 3. 页签管理工具函数（useSiyuanTab.js）
- 从`tabs/assetsTab.js`提取页签相关函数
- 提供通用的页签创建和管理接口
- 添加页签状态监控和生命周期管理

### 4. 颜色工具函数（useSiyuanColor.js）
- 从`menus/galleryItem.js`中提取颜色相关函数
- 提供颜色提取、分析和操作的统一接口
- 添加颜色转换和调色板功能

### 5. 菜单构建工具函数（useSiyuanMenuBuilder.js）
- 从`menus/galleryItem.js`中提取菜单构建相关函数
- 提供组合式菜单构建接口
- 添加菜单项模板和预设

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

当前重构计数：2（完成后减1）

完成所有计划的工具函数重构后，将重构计数减至0，表示完成本阶段重构工作，并在history.md中记录进度。 