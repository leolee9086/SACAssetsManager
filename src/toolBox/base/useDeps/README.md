# 依赖管理工具 (useDeps)

此目录包含与依赖管理相关的工具函数。

## 文件说明

- `licensesTools.js` - 收集项目依赖许可证信息并按许可证类型分组
- `useMuxer/` - 依赖复用和管理工具

## 使用方式

```javascript
// 收集许可证信息
import { 收集许可证信息 } from '../toolBox/base/useDeps/licensesTools.js';

// 在Node.js环境中使用
async function 生成许可证信息() {
  try {
    await 收集许可证信息();
    console.log('许可证信息已生成');
  } catch (错误) {
    console.error('生成许可证信息失败:', 错误);
  }
}
```

## 注意事项

1. 依赖管理工具主要用于Node.js环境，某些功能可能不适用于浏览器
2. `licensesTools.js` 需要安装 `license-checker-rseidelsohn` 依赖
3. 根据实际需求，可能需要调整输出文件路径和格式 