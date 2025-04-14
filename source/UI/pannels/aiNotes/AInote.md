# 这个区段由开发者编写,未经允许禁止AI修改
<开发者将会在这里提出要求,AI需要判断并满足这些要求>

# SACAssetsManager - AI提示词管理

## 1. AI提示词查看功能

SACAssetsManager提供了AI提示词查看功能，用于展示和管理思源笔记中保存的各类AI提示词。这些功能主要基于以下组件实现：

### 1.1 提示词查看面板 (aiNotes)

位置: `source/UI/pannels/aiNotes/index.vue`

主要功能：
- 查看思源笔记中所有保存的AI提示词
- 搜索和过滤提示词
- 查看提示词详细内容
- 从local.json中读取提示词数据

核心实现细节：
- 使用Vue 3组合式API实现界面交互
- 通过思源API `/api/storage/getLocalStorage` 读取提示词数据
- 支持不同格式提示词的解析和展示

### 1.2 提示词数据来源

提示词数据主要来自思源笔记的local.json文件，包含：
- 用户保存的对话提示词
- 聊天历史记录中的提示词
- 其他AI相关配置和提示

## 2. AI密钥管理功能

SACAssetsManager提供了AI密钥管理功能，已整合到keyManager面板中。

### 2.1 密钥管理面板 (keyManager)

位置: `source/UI/pannels/keyManager/index.vue`

主要功能：
- 查看和编辑当前思源笔记的AI配置
- 保存多个不同的AI配置方案
- 快速切换不同的AI配置
- 导入/导出配置
- 从旧的SACKeyManager插件导入数据

核心实现细节：
- 使用config-editor.js模块管理配置数据
- 通过思源API读写配置
- 支持与SACKeyManager的数据兼容

数据存储：
- `ai-configs.json` - 保存所有配置
- `ai-describes.json` - 保存配置的描述信息

## 3. AI翻译功能

SACAssetsManager集成了AI翻译功能，用于支持国际化和多语言文本处理。

### 3.1 AI翻译实现

文件位置：
- `src/utils/i18n/aiI18n.js` - 核心翻译函数
- `src/toolBox/useAge/forSiyuan/forAI/forLegacyCode.js` - 配置适配器
- `src/toolBox/useAge/forSiyuan/forAI/useSiyuanAI.js` - 统一AI配置工具

主要功能：
- `同步调用openAI翻译` - 使用OpenAI API同步翻译文本
- `同步调用思源配置翻译` - 使用思源配置调用AI翻译
- `创建AI翻译标签函数` - 创建用于模板字符串的翻译函数

## 4. 总结与优化建议

### 4.1 架构优化

- 将AI配置管理功能完全整合到keyManager面板
- 将aiNotes面板转变为AI提示词查看器，提供更专注的功能
- 保持模块化设计，各功能模块相对独立

### 4.2 未来扩展方向

- 支持提示词编辑和保存
- 提供提示词分类和标签
- 添加提示词导入/导出功能
- 支持从提示词直接创建新对话

# SACAssetsManager - AI相关功能梳理

## 1. AI密钥管理功能

SACAssetsManager提供了AI密钥管理功能，用于管理和存储各种AI服务的API密钥和配置。这些功能主要基于以下组件实现：

### 1.1 密钥管理面板 (keyManager)

位置: `source/UI/pannels/keyManager/index.vue`

主要功能：
- 查看和编辑当前思源笔记的AI配置
- 保存多个不同的AI配置方案
- 快速切换不同的AI配置
- 导入/导出配置
- 从旧的SACKeyManager插件导入数据

核心实现细节：
- 使用Vue 3组合式API实现界面交互
- 通过思源API读写配置
- 支持与SACKeyManager的数据兼容

数据存储：
- `ai-configs.json` - 保存所有配置
- `ai-describes.json` - 保存配置的描述信息

### 1.2 从SACKeyManager导入数据

在`index.js`中实现了`检查并导入AI密钥管理数据()`方法，在插件加载时会自动检查是否需要从旧的SACKeyManager插件导入数据。导入步骤：

1. 检查是否已经导入过数据
2. 尝试从旧插件工作空间读取配置文件
3. 读取描述文件和配置文件
4. 保存到当前插件的数据存储中

### 1.3 新增AI配置编辑功能

位置：
- `source/UI/pannels/aiNotes/config-editor.js` - 配置编辑功能模块
- `source/UI/pannels/aiNotes/config-panel.vue` - 配置编辑面板组件

主要功能：
- 配置编辑器模块提供完整的配置修改、保存和导入/导出功能
- 基于Vue 3的组合式API实现响应式数据管理
- 集成思源API进行配置读写
- 支持多配置方案的切换和管理

核心优势：
- 独立的功能模块设计，可在多个组件中共享使用
- 完全响应式的状态管理
- 完整的错误处理和用户反馈

## 2. AI翻译功能

SACAssetsManager集成了AI翻译功能，用于支持国际化和多语言文本处理。

### 2.1 AI翻译实现

文件位置：
- `src/utils/i18n/aiI18n.js` - 核心翻译函数
- `src/toolBox/useAge/forSiyuan/forAI/forLegacyCode.js` - 配置适配器
- `src/toolBox/useAge/forSiyuan/forAI/useSiyuanAI.js` - 统一AI配置工具

主要功能：
- `同步调用openAI翻译` - 使用OpenAI API同步翻译文本
- `同步调用思源配置翻译` - 使用思源配置调用AI翻译
- `创建AI翻译标签函数` - 创建用于模板字符串的翻译函数
- `创建思源配置AI翻译标签函数` - 使用思源配置创建翻译函数
- `创建可选AI翻译标签函数` - 创建可以控制是否启用AI翻译的函数

翻译原理：
- 使用模板字符串标签函数语法(`翻译`字串模板,...插值`)
- 保留变量占位符(`__VAR_X__`)在翻译过程中
- 翻译后将占位符替换回原始值

### 2.2 AI配置适配器

SACAssetsManager提供了多层次的配置适配器，用于获取和处理AI相关配置：

- `forLegacySiyuanConfig` - 同步获取思源AI配置的API兼容层
- `forForceSiyuanConfig` - 强制刷新缓存并获取最新配置
- `forTranslation` - 为翻译功能提供配置
- `forTranslationConfig` - 使用思源配置创建翻译配置对象

配置结构设计考虑了：
- 缓存机制 - 避免频繁异步调用
- 默认值处理 - 提供安全的默认配置
- 兼容性处理 - 支持多种API格式和配置方式

## 3. OpenAI集成工具

SACAssetsManager提供了OpenAI API的集成工具，便于在其他功能中使用：

### 3.1 OpenAI配置标准化

文件位置：`src/toolBox/feature/useOpenAI/forOpenAIConfig.js`

主要功能：
- `标准化openAI兼容配置` - 提供OpenAI API和兼容API的配置标准化
- 处理API密钥、端点、代理和请求头等配置
- 提供参数校验和默认值处理

### 3.2 通用AI配置工具

文件位置：`src/toolBox/useAge/forSiyuan/forAI/useSiyuanAI.js`

主要功能：
- `getSiyuanAIConfig` - 统一获取思源AI配置
- `computeConfigWithCustomOptions` - 计算自定义配置
- `computeConfigWithModel` - 基于模型名称计算配置
- `computeConfigWithAPICredentials` - 基于API凭证计算配置
- `computeConfigWithTargetLang` - 基于目标语言计算配置
- `getOpenAICompatConfig` - 获取OpenAI兼容配置
- `getTranslationConfig` - 获取翻译功能配置

## 4. 总结与优化建议

### 4.1 架构特点

SACAssetsManager的AI功能架构具有以下特点：
- 模块化设计 - 各功能模块相对独立
- 多层抽象 - 提供从底层到高层的API
- 兼容性考虑 - 支持多种配置格式和使用场景
- 安全性处理 - 提供默认值和错误处理

### 4.2 优化建议

以下是对AI功能的优化建议：
- 统一错误处理机制 - 建立专用的错误日志和用户提示系统
- 配置验证增强 - 增加API密钥验证和服务可用性检测
- 支持更多AI服务提供商 - 扩展到更多非OpenAI的模型和API
- 性能优化 - 进一步优化配置缓存机制，减少同步调用
- 用户界面优化 - 增强密钥管理面板的用户体验

### 4.3 最新功能成果

新增的配置编辑器功能模块（`config-editor.js`和`config-panel.vue`）极大地增强了插件的AI配置管理能力：
- 提供了统一的配置编辑接口，可在多个组件中复用
- 实现了完整的配置读写、导入导出功能
- 添加了友好的用户界面和即时反馈
- 简化了与思源笔记的配置集成流程

这些功能的实现让SACAssetsManager在AI配置管理方面的能力与专门的SACKeyManager插件相当，并实现了无缝集成。 