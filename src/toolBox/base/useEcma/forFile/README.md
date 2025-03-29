# 文件操作工具 (forFile)

此目录包含与文件操作相关的工具函数。

## 文件说明

- `globTools.js` - 文件路径匹配功能，支持glob模式和搜索模式构建
- `forFilePath.js` - 文件路径处理工具
- `forFileRead.js` - 文件读取相关工具
- `forFileSize.js` - 文件大小计算和格式化工具

## 使用方式

```javascript
// 导入文件路径匹配工具
import { 构建搜索模式, 默认排除模式 } from '../toolBox/base/useEcma/forFile/globTools.js';

// 构建文件搜索模式
const 搜索配置 = 构建搜索模式(
  [{name: 'node_modules', show: false}], 
  '/项目根目录/', 
  ['js', 'ts'], // 包含的扩展名
  ['min.js']    // 排除的扩展名
);
```

## 注意事项

1. 这些工具函数在不同环境(Node.js/浏览器)中的行为可能不同
2. 路径处理时需注意不同操作系统的路径分隔符差异
3. 大文件操作时应考虑使用流式处理或分块处理 