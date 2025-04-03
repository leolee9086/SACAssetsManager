# 思源笔记AI配置工具

## 目录简介

此目录包含与思源笔记AI配置相关的工具函数。主要提供了获取、计算和管理思源笔记OpenAI配置的功能。

## 文件结构

| 文件名 | 作用 |
|-------|------|
| useSiyuanAI.js | 统一入口，提供统一的接口来获取思源的AI配置（本地或远程） |
| fromLocalSiyuanAI.js | 提供从思源笔记的本地环境获取AI配置的函数 |
| fromRemoteSiyuanAI.js | 提供从思源笔记的远程API获取AI配置的函数 |
| computeSiyuanAI.js | 提供用于计算和处理思源AI配置的共享函数 |
| forLegacyCode.js | 提供兼容旧代码的适配器函数，用于平滑过渡到新的配置模块 |

## 主要功能

### 配置获取

- 从本地获取思源AI配置
- 从远程API获取思源AI配置
- 支持强制刷新和缓存机制

### 配置计算

- 混合配置（继承基础配置但添加自定义选项）
- 自定义模型配置
- 自定义API凭证配置
- 自定义目标语言配置

### 缓存管理

- 缓存配置结果
- 智能缓存失效机制
- 手动清除缓存的方法

### 旧代码兼容适配器

- 提供直接替代`window.siyuan.config.ai.openAI`的适配器函数
- 智能缓存机制避免频繁异步请求
- 特殊场景的配置获取（翻译、强制刷新等）

## 使用示例

### 获取AI配置

```javascript
import { getSiyuanAIConfig } from './useSiyuanAI.js';

// 获取本地配置
const localConfig = await getSiyuanAIConfig();

// 获取远程配置
const remoteConfig = await getSiyuanAIConfig({ source: 'remote' });

// 强制刷新配置
const freshConfig = await getSiyuanAIConfig({ force: true });
```

### 自定义配置

```javascript
import { 
  computeConfigWithModel,
  computeConfigWithAPICredentials,
  computeConfigWithTargetLang
} from './useSiyuanAI.js';

// 使用自定义模型
const customModelConfig = await computeConfigWithModel('gpt-4');

// 使用自定义API凭证
const customAPIConfig = await computeConfigWithAPICredentials(
  'your-api-key', 
  'https://api.openai.com'
);

// 使用自定义目标语言
const customLangConfig = await computeConfigWithTargetLang('zh_CN');
```

### 缓存管理

```javascript
import { clearConfigCache } from './useSiyuanAI.js';

// 清除所有缓存
clearConfigCache();

// 仅清除本地缓存
clearConfigCache({ source: 'local' });

// 仅清除远程缓存
clearConfigCache({ source: 'remote' });
```

### 旧代码兼容

```javascript
import { forLegacySiyuanConfig, forTranslationConfig } from './forLegacyCode.js';

// 直接替代window.siyuan.config.ai.openAI
const aiConfig = forLegacySiyuanConfig();

// 获取翻译相关配置
const translationConfig = forTranslationConfig('zh_CN');
```

## 迁移指南

为了将项目中的AI配置进行统一，我们推荐按照以下步骤迁移旧代码：

1. 导入适配器函数：
```javascript
import { forLegacySiyuanConfig } from './path/to/forLegacyCode.js';
```

2. 替换直接使用`window.siyuan.config.ai.openAI`的代码：
```javascript
// 旧代码
const aiConfig = window.siyuan.config.ai.openAI;

// 新代码
const aiConfig = forLegacySiyuanConfig();
```

3. 对于翻译功能，使用专门的适配器：
```javascript
import { forTranslationConfig } from './path/to/forLegacyCode.js';

const translationConfig = forTranslationConfig(targetLang);
```

## 注意事项

1. 配置结果会被缓存以提高性能
2. 本地配置直接从window.siyuan.config获取
3. 远程配置使用kernelApi.getConf()获取
4. 所有自定义配置函数都有缓存机制
5. 适配器函数会自动处理新旧字段名的兼容性（如apiModel/model）
6. 适配器函数是同步的，内部异步更新缓存，不会阻塞UI

## 关于模型字段的重要说明

思源笔记的AI配置使用`apiModel`字段存储模型名称，而一些现代API（如OpenAI API）期望使用`model`字段。为了确保兼容性，本模块采取以下策略：

1. **读取配置时**：优先使用`apiModel`字段，如果不存在则回退到`model`字段
2. **返回配置时**：同时包含`apiModel`和`model`字段，值设置为一致
3. **适配器函数**：自动处理字段映射，用户代码无需关心具体字段名

### 字段兼容性示例

```javascript
// 获取模型名称的正确方式
const modelName = config.apiModel || config.model;

// 设置模型名称时同时设置两个字段
config.apiModel = modelName;
config.model = modelName;
```

请注意，所有配置函数都已经实现了这种兼容性处理，用户代码通常不需要手动处理。 