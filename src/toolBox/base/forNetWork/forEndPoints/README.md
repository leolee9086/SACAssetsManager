# 端点URL生成工具

本目录包含用于构建服务器API端点URL的工具函数，可快速生成和管理各类API接口地址。

## 文件概览

- `useEndPointsBuilder.js` - 端点URL构建工具，用于生成各种API端点地址

## 主要功能

### 端点URL生成

提供一系列生成器函数，用于创建各类服务器API端点的URL:

- 服务器主机地址生成
- 缩略图URL构建
- 文件系统路径API
- 元数据查询接口
- 上传路径生成

## 使用示例

### 创建完整端点系统

```javascript
import { 创建端点系统 } from '../toolBox/base/forNetwork/forEndPoints/useEndPointsBuilder.js';

// 创建端点系统
const 端点系统 = 创建端点系统({
  http端口号: 6806,
  图片端口号: 6807,
  图片扩展名列表: ['jpg', 'jpeg', 'png', 'gif', 'webp']
});

// 使用服务器主机地址
const 服务器地址 = 端点系统.服务器主机();
console.log('服务器地址:', 服务器地址); // 例如: http://localhost:6806

// 获取文件系统目录路径
const 目录列表路径 = 端点系统.fs.路径.获取路径扩展名('D:/文档');
console.log('目录列表路径:', 目录列表路径);

// 获取缩略图颜色
const 颜色接口 = 端点系统.thumbnail.获取颜色('local', 'D:/图片/示例.jpg');
console.log('颜色接口:', 颜色接口);

// 上传缩略图
端点系统.上传缩略图({ type: 'local', path: 'D:/图片/示例.jpg' }, 文件对象)
  .then(结果 => console.log('上传成功:', 结果))
  .catch(错误 => console.error('上传失败:', 错误));
```

### 单独使用特定生成器

```javascript
import { 
  创建服务器主机地址生成器, 
  创建文件系统端点生成器 
} from '../toolBox/base/forNetwork/forEndPoints/useEndPointsBuilder.js';

// 创建服务器主机地址生成器
const 主机地址生成器 = 创建服务器主机地址生成器({ 
  端口号: 6806,
  协议: 'http:',
  主机名: 'localhost'
});

// 创建文件系统端点生成器
const 文件系统端点 = 创建文件系统端点生成器(主机地址生成器);

// 使用生成的API路径
const 磁盘列表URL = 文件系统端点.磁盘.列出本地磁盘();
console.log('磁盘列表URL:', 磁盘列表URL);
```

## 注意事项

1. 所有生成器函数都支持中英文双命名
2. URL参数会自动进行编码，处理特殊字符
3. 可根据实际需求组合使用不同的生成器
4. 适用于服务器端和客户端环境 