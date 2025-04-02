# useDeps 文件夹说明

该文件夹包含对外部依赖的封装和工具函数，为项目提供与第三方库的集成能力。

## 文件与模块说明

### useArtTemplate

提供对art-template模板引擎的集成，使用隔离的iframe环境加载模板引擎，避免污染主应用环境。

主要文件：
- `fromArt.js` - 使用通用iframe加载器加载art-template库

### pinyinTools.js

提供拼音相关功能的工具函数，封装了拼音转换、匹配和搜索功能。

### licensesTools.js

提供许可证相关的工具函数，用于处理和验证软件许可证。

### useMuxer

提供媒体流合并和处理功能的工具。

## 设计原则

useDeps文件夹中的工具遵循以下原则：

1. **隔离性** - 外部依赖应在适当的环境中加载，避免污染全局空间
2. **统一接口** - 为外部依赖提供一致的接口，使调用方不需要了解具体实现
3. **懒加载** - 依赖应该在需要时才加载，避免不必要的资源消耗
4. **错误处理** - 提供合适的错误处理和回退机制，确保在依赖不可用时系统仍能正常运行

## 使用示例

```javascript
// 使用art-template示例
import { artTemplate } from './useArtTemplate/fromArt.js';

const html = artTemplate('templateId', { data: 'value' });
``` 