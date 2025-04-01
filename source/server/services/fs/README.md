# 文件系统服务

## 服务说明

文件系统服务是应用的核心服务之一，提供对文件系统的安全访问，包括文件读写、目录操作、文件信息获取等功能。该服务是其他多个服务的基础，确保文件操作的安全性和一致性。

## 功能

- 文件读写操作
- 目录创建、列表和删除
- 文件和目录信息获取
- 路径操作和安全性检查
- 文件系统监控
- 磁盘驱动器信息获取

## 文件结构

- `index.js` - 服务主入口，导出所有文件系统功能
- `fsOperations.js` - 基本文件系统操作
- `fsUtils.js` - 文件系统工具函数
- `fsCache.js` - 文件系统缓存实现
- `fsMonitor.js` - 文件系统监控功能

## 配置项

文件系统服务的配置位于`config/default.js`中：

```javascript
fs: {
    // 缓存设置
    cache: {
        // 是否启用缓存
        enabled: true,
        // 缓存有效期（毫秒）
        ttl: 5 * 60 * 1000, // 5分钟
        // 最大缓存项目数
        maxItems: 1000
    },
    // 文件操作设置
    operations: {
        // 读取文件时的默认编码
        defaultEncoding: 'utf8',
        // 读取二进制文件的扩展名列表
        binaryExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.pdf', '.zip', '.rar'],
        // 最大读取文件大小（字节）
        maxReadSize: 100 * 1024 * 1024 // 100MB
    }
}
```

## API参考

### 文件读取

```javascript
/**
 * 读取文件内容
 * @param {string} filePath - 文件路径
 * @param {Object} [options] - 读取选项
 * @param {string} [options.encoding] - 文件编码，默认为utf8
 * @returns {Promise<Buffer|string>} 文件内容
 */
readFile(filePath, options)
```

### 文件写入

```javascript
/**
 * 写入文件内容
 * @param {string} filePath - 文件路径
 * @param {string|Buffer} data - 要写入的数据
 * @param {Object} [options] - 写入选项
 * @returns {Promise<void>}
 */
writeFile(filePath, data, options)
```

### 目录列表

```javascript
/**
 * 获取目录内容列表
 * @param {string} dirPath - 目录路径
 * @param {Object} [options] - 列表选项
 * @returns {Promise<Array<FileInfo>>} 文件和目录信息数组
 */
listDirectory(dirPath, options)
```

### 文件信息

```javascript
/**
 * 获取文件或目录信息
 * @param {string} path - 文件或目录路径
 * @returns {Promise<FileInfo>} 文件或目录信息
 */
getFileInfo(path)
```

### 路径操作

```javascript
/**
 * 规范化路径
 * @param {string} path - 输入路径
 * @returns {string} 规范化后的路径
 */
normalizePath(path)
```

## 使用示例

### 读取文件

```javascript
import { readFile } from '../services/fs/index.js';

try {
  const content = await readFile('/path/to/file.txt');
  console.log('文件内容:', content);
} catch (error) {
  console.error('读取文件失败:', error.message);
}
```

### 列出目录

```javascript
import { listDirectory } from '../services/fs/index.js';

try {
  const files = await listDirectory('/path/to/directory');
  console.log('目录内容:', files);
  
  // 过滤文件类型
  const imageFiles = files.filter(file => !file.isDirectory && file.extension === '.jpg');
  console.log('图片文件:', imageFiles);
} catch (error) {
  console.error('列出目录失败:', error.message);
}
```

## 安全注意事项

文件系统服务实施了以下安全措施：

1. 路径规范化，防止目录遍历攻击
2. 文件大小限制，防止资源耗尽
3. 权限检查，确保只访问允许的目录
4. 对特殊文件的保护（如系统文件）

## 错误处理

文件系统操作可能会抛出以下错误：

- `FileNotFoundError` - 文件不存在
- `AccessDeniedError` - 权限不足
- `InvalidPathError` - 路径无效
- `FileSizeLimitError` - 文件大小超出限制
- `FileOperationError` - 一般文件操作错误

所有错误都包含详细的错误消息和错误代码。

## 性能优化

文件系统服务使用以下技术提高性能：

1. 文件内容和目录列表缓存
2. 异步操作
3. 流式处理大文件
4. 批量操作优化

## 监控和日志

文件系统服务会记录以下操作的日志：

1. 文件读写操作
2. 目录创建和删除
3. 错误和异常情况
4. 性能指标（如操作耗时） 