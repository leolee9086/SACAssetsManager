# 工具函数库重构笔记

## 重构状态

工具函数库正在重构中，计划将所有工具函数逐步迁移到src/toolBox目录下。
重构时注意渐进重构,遵循最小修改原则

## 职责范围

- 提供各种通用工具函数
- 支持核心业务功能
- 封装常用操作
- 处理跨平台兼容性

## 重构原则

1. **分类组织**：
   - 按功能域划分工具函数
   - 相关功能集中管理
   - 使用合理的目录结构

2. **功能提纯**：
   - 移除与业务逻辑耦合的部分
   - 提取纯粹的工具函数
   - 剥离思源特定依赖

3. **命名规范化**：
   - 统一函数命名风格
   - 使用中文函数名
   - 提供英文别名保持兼容性

4. **兼容保障**：
   - 保持API向后兼容
   - 提供兼容层和适配器
   - 支持平滑过渡

## 迁移进度跟踪

| 目录/文件 | 目标位置 | 状态 | 负责人 | 备注 |
|----------|---------|------|-------|------|
| base/ | src/toolBox/base | ✅ 完成 | AI助手 | 目录已移除 |
| events/ | src/toolBox/base/forEvent | 待处理 | - | 事件处理工具 |
| fs/ | src/toolBox/feature/forFileSystem | 待处理 | - | 文件系统工具 |
| functions/ | src/toolBox/base/useEcma/forFunctions | 待处理 | - | 函数式工具 |
| math/ | src/toolBox/base/useEcma/forMath | 待处理 | - | 数学计算工具 |
| netWork/ | src/toolBox/base/forNetWork | ✅ 完成 | AI助手 | 目录已移除 |
| object/ | src/toolBox/base/useEcma/forObjectManagement | 待处理 | - | 对象操作工具 |
| strings/ | src/toolBox/base/useEcma/forString | 进行中 | AI助手 | 字符串处理工具 (regexs/ 已完成迁移) |
| time/ | src/toolBox/base/useEcma/forTime | 待处理 | - | 时间处理工具 |
| objectTools.js | src/toolBox/base/useEcma/forObjectManagement | ✅ 完成 | AI助手 | 兼容层已移除 |
| functionTools.js | src/toolBox/base/useEcma/forFunctions | 待处理 | - | 函数工具集 |
| Math.js | src/toolBox/base/useEcma/forMath | ✅ 完成 | AI助手 | 兼容层已移除 |
| globBuilder.js | src/toolBox/base/useEcma/forFile | ✅ 完成 | AI助手 | 兼容层已移除 |
| port.js | src/toolBox/base/forNetWork/forPort | 完成 | AI助手 | 端口管理工具 |

### `strings/regexs/index.js` 处理说明

- **分析**: 该文件包含 `measureRegexComplexity` 和 `isValidFilePath` 函数。
  - `measureRegexComplexity` 被 `source/server/processors/thumbnail/` 下的代码引用。
  - `isValidFilePath` 未被引用。
  - `src/toolBox` 中无直接替代函数。
- **计划**:
  1. 将 `measureRegexComplexity` 迁移至 `src/toolBox/base/useEcma/forString/forRegexComplexity.js`。
  2. 将 `isValidFilePath` 迁移至 `src/toolBox/base/useEcma/forFile/forFilePath.js`。
  3. 更新 `source/server/processors/thumbnail/utils/regexs.js` 的导入路径。
  4. 删除 `src/utils/strings/regexs/index.js` 及空目录。

## 优先级设定

1. **高优先级**：
   - 核心通用工具（纯函数）
   - 频繁使用的功能
   - 底层基础功能
   - 示例：base/, forNetWork/, forEvent/

2. **中优先级**：
   - 特定功能域工具
   - 中等使用频率的功能
   - 示例：DOM/, canvas/, image/

3. **低优先级**：
   - 特殊用途工具
   - 使用频率低的功能
   - 依赖特定环境的功能
   - 示例：webworker/, cluster/

## 重构难点

1. **循环依赖**：
   - 工具函数间可能存在循环依赖
   - 需要重新设计依赖关系
   - 使用依赖注入或函数组合解决

2. **冗余实现**：
   - 多个地方可能实现了类似功能
   - 需要识别和合并重复功能
   - 提供统一的实现

3. **思源依赖**：
   - 部分工具函数依赖思源环境
   - 需要分离通用功能和思源特定功能
   - 使用适配器模式处理依赖

4. **命名冲突**：
   - 不同文件中可能有同名函数
   - 需要统一命名规范
   - 解决名称空间冲突

## 迁移步骤

1. **分析和映射**：
   - 分析当前工具函数的功能和依赖
   - 确定迁移的目标位置
   - 创建功能映射表

2. **功能提取**：
   - 从现有代码中提取核心功能
   - 移除业务逻辑和环境依赖
   - 重新设计API和实现

3. **迁移实现**：
   - 在新位置实现功能
   - 确保功能正确性和兼容性
   - 添加测试和文档

4. **兼容层建立**：
   - 在原位置创建兼容导出
   - 确保现有代码不受影响
   - 逐步替换导入路径

5. **清理和优化**：
   - 移除不再使用的代码
   - 优化新实现的性能
   - 完善错误处理和边界情况

## 测试策略

1. **单元测试**：
   - 为每个迁移的工具函数编写单元测试
   - 覆盖主要功能和边界情况
   - 确保功能等价性

2. **集成测试**：
   - 测试工具函数在真实环境中的使用
   - 验证与其他组件的交互
   - 确保系统级别的兼容性

3. **兼容性测试**：
   - 测试在不同环境中的行为
   - 确保跨平台兼容性
   - 验证向后兼容性

## 注意事项

- 每次迁移都要记录详细的变更日志
- 优先迁移基础功能，再处理依赖这些基础功能的高级功能
- 注意处理错误情况和边界条件
- 为所有函数添加清晰的JSDoc文档
- 定期同步和更新迁移进度 