# 常量定义 (Constants)

本目录包含项目中使用的所有常量定义，提供集中、统一的常量管理，避免硬编码和重复定义。

## 文件结构

- `errorCodes.js` - 错误码常量
- `apiEndpoints.js` - API端点路径常量
- `eventTypes.js` - 事件类型常量
- `uiConstants.js` - UI相关常量

## 使用指南

从constants目录导入常量时，应该使用命名导入以提高代码可读性：

```js
// 推荐: 导入特定常量
import { 错误码 } from '../shared/constants/errorCodes.js';
import { API端点 } from '../shared/constants/apiEndpoints.js';
import { 事件类型 } from '../shared/constants/eventTypes.js';
import { UI常量 } from '../shared/constants/uiConstants.js';

// 使用示例
if (错误码.文件未找到) {
  // 处理错误
}

fetch(API端点.思源.获取块)
  .then(response => response.json())
  .then(data => {
    // 处理响应数据
  });
```

## 设计原则

1. **不可变性**：
   - 所有常量应定义为不可变对象
   - 使用`Object.freeze()`确保常量不被修改

2. **分类组织**：
   - 按功能域将常量分组到不同文件
   - 相关常量应放在同一个对象中

3. **命名规范**：
   - 常量对象使用中文命名，保持语义明确
   - 常量值尽量使用有意义的字符串而非魔法数字

4. **文档完善**：
   - 为每个常量提供JSDoc注释
   - 说明常量的用途和可能的值

## 添加新常量

向constants目录添加新常量时，请遵循以下步骤：

1. 确定常量的功能域，选择合适的文件或创建新文件
2. 使用`Object.freeze()`定义常量对象
3. 为常量添加JSDoc注释
4. 导出常量对象
5. 在README.md中更新文件列表

## 使用建议

- 避免直接使用字符串字面量，应始终使用常量
- 常量对象应按逻辑分组，便于理解和使用
- 常量值一旦定义，不应轻易更改，尤其是可能影响现有代码的更改 