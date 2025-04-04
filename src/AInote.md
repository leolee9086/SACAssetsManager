# 本区块由开发者编写,未经授权禁止助手改动

src中toolbox层的代码除了特定的useSiyuan之外,不应该有对思源环境的依赖
包括项目中其它所有地方对思源宿主环境的特殊依赖都应该封装到这里处理



# 源代码重构笔记

## 重构状态

项目源代码目录正在进行全面重构，以提高代码质量、可维护性和可扩展性。

## 职责范围

- 包含项目的所有核心源代码
- 按功能层次和模块组织代码
- 提供清晰的代码结构和依赖关系

## 重构原则

1. **分层清晰**：
   - 工具层、服务层、中间件层、模块层职责明确
   - 层与层之间通过明确的接口通信
   - 避免跨层越级调用

2. **依赖合理**：
   - 依赖方向自上而下（模块依赖服务，服务依赖工具）
   - 避免循环依赖
   - 通过依赖注入解耦组件

3. **功能内聚**：
   - 相关功能集中在同一模块
   - 每个文件职责单一
   - 避免过大的文件和过深的嵌套

4. **接口统一**：
   - 相似功能提供统一接口
   - 保持API风格一致
   - 提供良好的类型定义和文档

## 重构进度

- ✅ 工具箱 (toolBox) - 重构进行中，已完成框架设计
- ⏳ 服务 (services) - 计划中，等待工具箱基础能力就绪
- ⏳ 中间件 (middlewares) - 计划中，需要在服务层完成后推进
- ⏳ 功能模块 (modules) - 计划中，最后阶段实施

## 待处理事项

1. 工具箱重构：
   - 完成思源相关工具的重构
   - 完成文件系统相关工具的重构
   - 统一工具箱的导出接口

2. 服务层规划：
   - 梳理现有业务功能，设计服务抽象
   - 实现核心服务组件
   - 建立服务注册和发现机制

3. 中间件层规划：
   - 设计通用中间件框架
   - 实现核心中间件组件
   - 提供中间件组合机制

4. 模块层重构：
   - 按业务功能重新组织模块
   - 梳理模块间依赖关系
   - 实现基于服务的模块化设计

## 注意事项

- 重构过程中保持兼容性，避免破坏现有功能
- 采用渐进式重构，而非一次性大规模改造
- 添加适当的测试确保重构不引入新问题
- 及时更新文档反映最新的代码结构

## 历史记录

### 2023-12-10
- 建立src目录的整体重构框架
- 确定分层设计和依赖管理原则

### 2023-10-15
- 开始工具箱重构
- 建立工具箱的三层分类设计

### 2023-08-01
- 启动代码重构计划
- 进行代码结构分析和重构规划 