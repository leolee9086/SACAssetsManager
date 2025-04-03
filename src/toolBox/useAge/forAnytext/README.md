# AnyTXT 工具集

此目录包含与 AnyTXT 相关的工具函数,用于文件搜索和 URT 资源转换。

## 文件结构

- `useAnytextApi.js` - AnyTXT API 基础模块,提供文件搜索功能
- `useAnytextURT.js` - AnyTXT 到 URT 的转换模块,提供资源转换功能

## 主要功能

### 文件搜索

- 支持在指定目录或所有驱动器中进行文件搜索
- 提供 API 可用性检查
- 支持自定义搜索参数和限制

### URT 资源转换

- 将 AnyTXT 搜索结果转换为 URT 资源格式
- 支持批量转换
- 自动处理文件类型和图标

## 使用示例

```javascript
// 搜索文件
import { 搜索文件, 检查API可用性 } from './useAnytextApi.js';

// 检查 API 是否可用
const isAvailable = await 检查API可用性(8080);
if (isAvailable) {
    // 搜索文件
    const results = await 搜索文件('关键词', 8080, {
        filterDir: 'C:/Documents',
        limit: 100
    });
}

// 转换为 URT 资源
import { 转换为URT资源, 批量转换为URT资源 } from './useAnytextURT.js';

const urtResource = 转换为URT资源(searchResult);
const urtResources = 批量转换为URT资源(searchResults);
```

## 注意事项

1. 使用前请确保 AnyTXT 服务已启动并可访问
2. 默认使用 localhost 作为主机地址
3. 搜索限制默认为 300 条结果
4. 支持的文件类型包括常见的文档、图片和压缩文件 