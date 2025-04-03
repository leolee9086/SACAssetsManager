# 本区块由开发者编写,未经允许禁止AI助手改动

这个区块之后的笔记除了命名原则可以删除了,现在请查看项目中分散的AI配置逻辑,尝试统一以这个模块进行配置

# 思源笔记AI配置工具文件命名优化

## 当前文件状态

该目录包含与思源笔记AI配置相关的工具函数,目前文件命名存在一定问题:

- 文件名过长且不符合函数命名规范
- 缺乏明确的前缀标识功能类型
- 存在命名不一致的情况

## 命名优化计划

根据函数命名规范,我们将对以下文件进行重命名:

| 当前文件名 | 建议文件名 | 说明 |
|------------|------------|------|
| getLocalSiyuanAIConfig.js | fromLocalSiyuanAI.js | 使用from前缀表示数据来源 |
| getRemoteSiyuanAIConfig.js | fromRemoteSiyuanAI.js | 使用from前缀表示数据来源 |
| siyuanAIConfig.js | useSiyuanAI.js | 使用use前缀表示API集合 |
| siyuanAIConfigBase.js | computeSiyuanAI.js | 使用compute前缀表示计算工具 |

## 重命名原则

1. **前缀规范化**:
   - 使用`from*`前缀表示数据来源函数
   - 使用`compute*`前缀表示计算和转换函数
   - 使用`use*`前缀表示API集合

2. **名称简化**:
   - 移除冗余的`Config`词语
   - 保持名称简短但有意义

3. **保持一致性**:
   - 所有文件采用相同的命名风格
   - 保持与上层目录的命名风格一致

## 实施计划

- 重命名文件
- 更新文件间的相互引用
- 更新导入这些文件的外部代码
- 更新相关文档

## 实施状态

✅ 已完成所有文件重命名:
- ✅ siyuanAIConfigBase.js → computeSiyuanAI.js
- ✅ getLocalSiyuanAIConfig.js → fromLocalSiyuanAI.js
- ✅ getRemoteSiyuanAIConfig.js → fromRemoteSiyuanAI.js
- ✅ siyuanAIConfig.js → useSiyuanAI.js

✅ 已更新所有文件间的相互引用
✅ 已创建README.md文件说明文件夹功能
✅ 已删除旧文件

## 兼容性考虑

重命名后需要确保:
- 更新所有import语句
- 保持函数命名和接口不变
- 对外暴露的API保持一致性

## 后续任务

需要在上层模块中更新对这些文件的引用路径。

# AI配置统一工作

## 问题描述

项目中存在多处直接使用`window.siyuan.config.ai.openAI`的代码，这些代码分散在不同文件中，缺乏统一管理，可能导致:

1. 配置更改时需要修改多处代码
2. 无法统一处理API请求、错误处理和缓存逻辑
3. 代码重复，维护困难

## 解决方案

1. ✅ 创建统一的AI配置获取模块
2. ✅ 提供兼容旧代码的适配器函数
3. ✅ 将项目中分散的AI配置调用替换为适配器函数调用

## 实施状态

✅ 已完成核心模块实现:
- ✅ 创建了`useSiyuanAI.js`提供统一配置获取接口
- ✅ 创建了`forLegacyCode.js`提供旧代码兼容适配器

✅ 已完成主要文件的迁移工作:
- ✅ source/utils/i18n/aiI18n.js - 翻译相关配置
- ✅ source/noteChat/index.js - 对话相关配置

## 未来工作

- 进一步扫描其他使用`window.siyuan.config.ai.openAI`的文件
- 将配置管理与AI功能更紧密结合
- 考虑添加配置验证和错误处理机制
- 提供更多自定义选项和预设配置 

# max_tokens字段修复

## 问题描述

在思源笔记AI配置中，`apiMaxTokens`字段默认值为0，这导致使用OpenAI API时出现错误：
```
HTTP 400: {"code":20015,"message":"max_tokens: Must be greater than or equal to 1","data":null}
```

## 已修复文件

1. `src/toolBox/useAge/forSiyuan/forAI/useSiyuanAI.js`:
   - 修改默认的`max_tokens`值为1024
   - 添加条件检查，确保`max_tokens`值始终大于0

2. `src/toolBox/useAge/forSiyuan/forAI/forLegacyCode.js`:
   - 修改`forLegacySiyuanConfig`函数中的`max_tokens`字段，确保值大于0

3. `src/toolBox/useAge/forSiyuan/forAI/fromLocalSiyuanAI.js`:
   - 修改`createDefaultConfig`和`createSafeApiConfig`函数中的`maxTokens`默认值为1024

## 修复策略

- 保持向后兼容性
- 为所有可能为0的`maxTokens`/`max_tokens`字段设置默认值1024
- 添加条件检查，确保值始终大于0

## 注意事项

- 新创建的配置默认使用1024作为`max_tokens`值
- 用户配置的值如果大于0，仍然会被保留
- 这些修改不会影响用户保存的配置，只会在运行时确保值有效 