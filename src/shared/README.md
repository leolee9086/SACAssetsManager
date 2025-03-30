# 共享资源 (Shared)

本目录包含在整个项目中共享的资源和常量，为各模块提供统一的数据访问和管理。

## 目录结构

- `constants/` - 项目常量定义
  - `errorCodes.js` - 错误码常量
  - `apiEndpoints.js` - API端点常量
  - `uiConstants.js` - UI相关常量
  - `eventTypes.js` - 事件类型常量
  
- `models/` - 数据模型定义
  - `assetModel.js` - 资源数据模型
  - `userPreferencesModel.js` - 用户偏好数据模型
  
- `enums/` - 枚举类型定义
  - `fileTypes.js` - 文件类型枚举
  - `assetCategories.js` - 资源分类枚举
  
- `config/` - 配置管理
  - `defaultSettings.js` - 默认设置
  - `featureFlags.js` - 功能标志配置
  
- `i18n/` - 国际化资源
  - `translationKeys.js` - 翻译键值常量

## 使用指南

从这个目录导入共享资源时，应该使用命名导入以提高代码可读性：

```js
// 推荐: 导入特定常量
import { 错误码 } from '../shared/constants/errorCodes.js';
import { 资源类型 } from '../shared/enums/fileTypes.js';

// 使用示例
if (错误码.文件未找到) {
  // 处理错误
}
```

## 贡献指南

向shared目录添加新资源时，请遵循以下原则：

1. **不可变性**：常量和枚举应该是不可变的
2. **单一职责**：每个文件应该只定义一个相关的常量集合
3. **命名规范**：
   - 使用有意义的文件名和常量名
   - 避免使用index.js等无语义文件名
4. **文档**：
   - 为每个常量集合提供清晰的文档注释
   - 解释每个常量的用途和可能的值

## 跨模块依赖

shared目录中的内容可以被任何其他模块引用，但是shared目录中的文件不应该依赖项目中的其他模块，以避免循环依赖。 