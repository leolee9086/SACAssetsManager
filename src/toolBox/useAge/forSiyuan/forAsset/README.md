# 思源笔记资源处理工具

此模块提供了对思源笔记资源库的操作功能，包括文件上传等。

## 文件结构

- `useSiyuanUpload.js` - 思源笔记资源上传工具函数

## 导出内容

### 函数

- `上传到思源资源库(file, options)` - 上传文件到思源笔记资源库
- `创建上传处理器()` - 创建文件上传处理器对象

### 兼容函数

- `uploadToSiyuanAssets(file)` - 兼容原有API的上传函数
- `showUploadConfirmDialog(file)` - 显示上传确认对话框
- `convertToFile(file)` - 转换为文件对象
- `performUpload(file)` - 执行上传操作

## 使用示例

### 基本上传

```javascript
import { 上传到思源资源库 } from '../../../toolBox/useAge/forSiyuan/forAsset/useSiyuanUpload.js';

// 上传文件（会显示确认对话框）
try {
  const 文件路径 = await 上传到思源资源库(文件对象);
  console.log('上传成功:', 文件路径);
} catch (error) {
  console.error('上传失败:', error.message);
}

// 跳过确认对话框直接上传
const 文件路径 = await 上传到思源资源库(文件对象, { skipConfirm: true });
```

### 上传处理器

```javascript
import { 创建上传处理器 } from '../../../toolBox/useAge/forSiyuan/forAsset/useSiyuanUpload.js';

// 创建上传处理器
const 上传处理器 = 创建上传处理器();

// 上传单个文件
const 文件路径 = await 上传处理器.上传文件(文件对象);

// 批量上传多个文件
const 文件列表 = [文件1, 文件2, '图片URL', 图片Blob对象];
const 路径列表 = await 上传处理器.批量上传(文件列表, { skipConfirm: true });
```

## 功能说明

### 文件上传

- 支持上传 File 对象到思源资源库
- 支持从 URL 或 Blob 自动转换并上传
- 提供上传确认对话框
- 处理上传错误和结果

### 批量操作

- 支持批量上传多个文件
- 提供批量操作的错误处理和结果收集

## 重构信息

本模块从 `source/fromThirdParty/siyuanUtils/upload.js` 重构而来，采用函数式风格重新设计。

### 主要变更

1. 添加了完整的JSDoc文档注释
2. 提供了中文命名的函数API
3. 增加了批量上传功能
4. 增强了错误处理和选项控制
5. 保留了原有的API以兼容现有代码

## 后续计划

1. 增加更多文件类型的处理支持
2. 增加文件预处理功能（如压缩、格式转换）
3. 增加上传进度监控
4. 增加资源库管理功能（查询、删除、重命名等） 