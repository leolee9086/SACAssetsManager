# 缩略图服务

## 服务说明

缩略图服务负责生成、管理和缓存图像的缩略图。该服务是资源管理系统的核心功能之一，为用户提供快速浏览和预览图像资源的能力，同时通过缓存机制降低系统资源消耗。

## 功能

- 图像缩略图生成
- 缩略图缓存管理
- 支持多种图像格式
- 自定义缩放和裁剪选项
- 自动清理过期缓存
- 支持批量缩略图生成
- 支持水印添加（可选）

## 文件结构

- `thumbnailService.js` - 主服务实现，提供缩略图生成核心功能
- `thumbnailCache.js` - 缓存管理实现，处理缩略图的存储和检索
- `thumbnailUtils.js` - 工具函数，提供图像处理辅助功能

## 配置项

缩略图服务的配置位于`config/default.js`中：

```javascript
thumbnail: {
    // 缩略图缓存目录
    cacheDir: path.join(os.homedir(), 'sacassetsmanager', 'thumbnail-cache'),
    // 默认缩略图宽度
    defaultWidth: 200,
    // 默认缩略图高度
    defaultHeight: 200,
    // 缩略图质量 (0-100)
    quality: 80,
    // 支持的图片格式
    supportedFormats: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
    // 缓存设置
    cache: {
        // 最大缓存大小（字节）
        maxSize: 500 * 1024 * 1024, // 500MB
        // 缓存清理阈值（字节），达到此大小时触发清理
        cleanupThreshold: 450 * 1024 * 1024, // 450MB
        // 缓存项目过期时间（毫秒）
        ttl: 30 * 24 * 60 * 60 * 1000 // 30天
    }
}
```

## API参考

### 生成缩略图

```javascript
/**
 * 生成图像的缩略图
 * @param {string} imagePath - 原始图像路径
 * @param {Object} [options] - 生成选项
 * @param {number} [options.width=200] - 缩略图宽度
 * @param {number} [options.height=200] - 缩略图高度
 * @param {number} [options.quality=80] - 图像质量(1-100)
 * @param {boolean} [options.crop=false] - 是否裁剪以适应尺寸
 * @returns {Promise<string>} 缩略图文件路径
 */
generateThumbnail(imagePath, options)
```

### 清除缓存

```javascript
/**
 * 清除缩略图缓存
 * @param {Object} [options] - 清除选项
 * @param {string} [options.olderThan] - 清除早于指定日期的缓存
 * @param {string} [options.pattern] - 清除匹配指定模式的缓存
 * @returns {Promise<number>} 清除的缓存项目数量
 */
clearCache(options)
```

### 获取缩略图路径

```javascript
/**
 * 获取图像的缩略图路径，如果缩略图不存在则生成
 * @param {string} imagePath - 原始图像路径
 * @param {Object} [options] - 选项
 * @returns {Promise<string>} 缩略图路径
 */
getThumbnailPath(imagePath, options)
```

### 获取支持的格式

```javascript
/**
 * 获取支持的图像格式列表
 * @returns {string[]} 支持的文件扩展名数组
 */
getSupportedFormats()
```

### 批量生成缩略图

```javascript
/**
 * 批量生成多个图像的缩略图
 * @param {string[]} imagePaths - 原始图像路径数组
 * @param {Object} [options] - 生成选项
 * @returns {Promise<Object>} 结果对象，包含成功和失败的项目
 */
batchGenerateThumbnails(imagePaths, options)
```

## 使用示例

### 生成单个缩略图

```javascript
import { generateThumbnail } from '../services/thumbnail/thumbnailService.js';

try {
  const thumbnailPath = await generateThumbnail('/path/to/image.jpg', {
    width: 300,
    height: 200,
    quality: 90
  });
  console.log(`缩略图已生成: ${thumbnailPath}`);
} catch (error) {
  console.error(`生成缩略图失败: ${error.message}`);
}
```

### 批量生成缩略图

```javascript
import { batchGenerateThumbnails } from '../services/thumbnail/thumbnailService.js';

const imagePaths = [
  '/path/to/image1.jpg',
  '/path/to/image2.png',
  '/path/to/image3.webp'
];

try {
  const result = await batchGenerateThumbnails(imagePaths);
  console.log(`成功生成: ${result.success.length} 个缩略图`);
  if (result.failed.length > 0) {
    console.warn(`失败: ${result.failed.length} 个`);
  }
} catch (error) {
  console.error(`批量生成失败: ${error.message}`);
}
```

### 清理缩略图缓存

```javascript
import { clearCache } from '../services/thumbnail/thumbnailService.js';

try {
  // 清理30天前的缩略图
  const cleaned = await clearCache({
    olderThan: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  });
  console.log(`已清理 ${cleaned} 个缩略图缓存项目`);
} catch (error) {
  console.error(`清理缓存失败: ${error.message}`);
}
```

## 依赖说明

缩略图服务依赖以下组件：

1. 文件系统服务 - 用于读写图像文件
2. 日志服务 - 记录操作和错误
3. 配置管理器 - 获取缩略图服务配置
4. Sharp库 - 高性能图像处理（推荐使用）

## 缓存机制

1. 缩略图按原始图像路径和尺寸参数的哈希值命名
2. 缓存使用LRU（最近最少使用）算法管理
3. 缓存项目带有过期时间，超过TTL会被清理
4. 当缓存达到指定大小阈值时，自动触发清理
5. 清理优先移除最旧和最少使用的缩略图

## 性能优化

1. 使用Sharp库进行高性能图像处理
2. 实现缓存预热机制，对常用图像提前生成缩略图
3. 并行处理批量缩略图请求，提高吞吐量
4. 使用流式处理大图像，减少内存占用
5. 实现渐进式加载，先显示低质量缩略图后显示高质量图像

## 未来改进

1. 实现自适应图像大小，根据客户端设备选择合适的分辨率
2. 添加图像格式转换功能，支持WebP等现代高效格式
3. 实现智能裁剪，保留图像中的主要内容
4. 添加图像处理滤镜和效果
5. 实现分布式缓存，提高系统扩展性 