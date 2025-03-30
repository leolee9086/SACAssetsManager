# 配置管理 (Config)

本目录包含项目的配置管理相关文件，提供统一的配置访问和管理机制。

## 文件结构

- `defaultSettings.js` - 默认设置配置
- `featureFlags.js` - 功能标志配置
- `panelConfig.js` - 面板配置
- `tabConfig.js` - 标签页配置

## 使用指南

从config目录导入配置项时，应该使用命名导入以提高代码可读性：

```js
// 推荐: 导入特定配置
import { 默认设置 } from '../shared/config/defaultSettings.js';
import { 功能标志 } from '../shared/config/featureFlags.js';
import { 面板配置 } from '../shared/config/panelConfig.js';
import { 标签页配置 } from '../shared/config/tabConfig.js';

// 使用示例
if (功能标志.启用高级编辑器) {
  // 启用高级编辑器功能
}
```

## 设计原则

1. **配置分离**：
   - 将配置与代码分离
   - 按功能域将配置分类到不同文件

2. **默认值**：
   - 为所有配置项提供合理的默认值
   - 使用`Object.freeze()`确保配置不被意外修改

3. **命名规范**：
   - 配置对象使用中文命名，保持语义明确
   - 配置项名称应清晰描述其用途

4. **文档完善**：
   - 为每个配置项提供清晰的注释说明
   - 记录配置项的用途、可选值和默认值

## 添加新配置

向config目录添加新配置时，请遵循以下步骤：

1. 确定配置的功能域，选择合适的文件或创建新文件
2. 为配置项添加JSDoc注释
3. 使用`Object.freeze()`定义配置对象以防止意外修改
4. 导出配置对象
5. 在README.md中更新文件列表

## 使用建议

- 不要在代码中硬编码配置值，始终使用配置常量
- 配置应该是静态的，运行时的动态状态应该存储在state中
- 不同环境的配置应该分离，可以使用环境变量区分 