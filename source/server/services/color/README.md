# 颜色分析服务

## 服务说明

颜色分析服务负责从图像中提取主要颜色，并支持基于颜色的图像搜索和管理。该服务是资源管理系统的重要组成部分，使用户能够基于颜色特征组织和查找图像资源。

## 功能

- 图像颜色提取
- 基于颜色的图像搜索
- 颜色分析结果缓存
- 颜色记录管理
- 颜色相似度计算
- 调色板生成
- 暗色/亮色检测

## 文件结构

- `colorService.js` - 主服务实现，提供颜色分析核心功能
- `colorExtractor.js` - 颜色提取实现，处理图像颜色的提取和分析
- `colorMatcher.js` - 颜色匹配实现，处理基于颜色的搜索和比较
- `colorUtils.js` - 颜色工具函数，提供颜色处理的辅助功能

## 配置项

颜色分析服务的配置位于`config/default.js`中：

```javascript
color: {
    // 颜色分析默认设置
    defaults: {
        // 提取的最大颜色数量
        maxColors: 5,
        // 颜色质量 (1-100)
        quality: 80,
        // 是否排除透明色
        excludeTransparent: true
    },
    // 颜色搜索设置
    search: {
        // 默认颜色容差
        tolerance: 15,
        // 默认搜索结果数量限制
        limit: 100
    }
}
```

## API参考

### 提取图像颜色

```javascript
/**
 * 从图像中提取主要颜色
 * @param {string} imagePath - 图像文件路径
 * @param {Object} [options] - 提取选项
 * @param {number} [options.maxColors=5] - 最大提取颜色数量
 * @param {number} [options.quality=80] - 颜色质量(1-100)
 * @param {boolean} [options.excludeTransparent=true] - 是否排除透明色
 * @returns {Promise<Array<ColorInfo>>} 颜色信息数组
 */
extractColors(imagePath, options)
```

### 搜索匹配颜色的图像

```javascript
/**
 * 搜索匹配指定颜色的图像
 * @param {string|Object} color - 颜色值(十六进制或RGB对象)
 * @param {Object} [options] - 搜索选项
 * @param {number} [options.tolerance=15] - 颜色容差(0-255)
 * @param {number} [options.limit=100] - 结果数量限制
 * @param {string} [options.directory] - 限定搜索目录
 * @returns {Promise<Array<ImageMatch>>} 匹配的图像数组
 */
searchByColor(color, options)
```

### 保存颜色记录

```javascript
/**
 * 保存图像的颜色记录
 * @param {string} imagePath - 图像文件路径
 * @param {Array<ColorInfo>} colors - 颜色信息数组
 * @returns {Promise<boolean>} 保存成功返回true
 */
saveColorRecord(imagePath, colors)
```

### 删除颜色记录

```javascript
/**
 * 删除图像的颜色记录
 * @param {string} imagePath - 图像文件路径
 * @returns {Promise<boolean>} 删除成功返回true
 */
deleteColorRecord(imagePath)
```

### 计算颜色相似度

```javascript
/**
 * 计算两个颜色之间的相似度
 * @param {Object} color1 - 第一个颜色(RGB对象)
 * @param {Object} color2 - 第二个颜色(RGB对象)
 * @returns {number} 相似度百分比(0-100)
 */
calculateColorSimilarity(color1, color2)
```

### 生成调色板

```javascript
/**
 * 从一组图像生成调色板
 * @param {Array<string>} imagePaths - 图像文件路径数组
 * @param {number} [paletteSize=10] - 调色板大小
 * @returns {Promise<Array<ColorInfo>>} 调色板颜色数组
 */
generatePalette(imagePaths, paletteSize)
```

## 使用示例

### 提取图像颜色

```javascript
import { extractColors } from '../services/color/colorService.js';

try {
  const colors = await extractColors('/path/to/image.jpg', {
    maxColors: 8,
    quality: 90
  });
  
  console.log('主要颜色:');
  colors.forEach((color, index) => {
    console.log(`${index + 1}. ${color.hex} (${color.percentage}%)`);
  });
} catch (error) {
  console.error(`颜色提取失败: ${error.message}`);
}
```

### 搜索颜色

```javascript
import { searchByColor } from '../services/color/colorService.js';

// 搜索红色系图像
try {
  const matches = await searchByColor('#FF0000', {
    tolerance: 25,
    limit: 50
  });
  
  console.log(`找到 ${matches.length} 个匹配的图像`);
  matches.forEach(match => {
    console.log(`${match.path} - 匹配度: ${match.similarity}%`);
  });
} catch (error) {
  console.error(`颜色搜索失败: ${error.message}`);
}
```

### 生成调色板

```javascript
import { generatePalette } from '../services/color/colorService.js';

// 从一组图像生成调色板
try {
  const imagePaths = [
    '/path/to/image1.jpg',
    '/path/to/image2.png',
    '/path/to/image3.jpg'
  ];
  
  const palette = await generatePalette(imagePaths, 12);
  console.log('生成的调色板:');
  palette.forEach((color, index) => {
    console.log(`${index + 1}. ${color.hex}`);
  });
} catch (error) {
  console.error(`调色板生成失败: ${error.message}`);
}
```

## 数据结构

### ColorInfo

颜色信息对象包含以下属性：

```javascript
{
  // 十六进制表示
  hex: '#FF5733',
  // RGB表示
  rgb: { r: 255, g: 87, b: 51 },
  // 百分比(该颜色在图像中的占比)
  percentage: 35.2,
  // 是否为暗色
  isDark: false
}
```

### ImageMatch

图像匹配结果对象包含以下属性：

```javascript
{
  // 图像路径
  path: '/path/to/image.jpg',
  // 匹配的颜色
  color: { hex: '#FF5733', rgb: { r: 255, g: 87, b: 51 } },
  // 相似度百分比
  similarity: 92.5,
  // 图像缩略图路径(可选)
  thumbnail: '/path/to/thumbnail.jpg'
}
```

## 依赖说明

颜色分析服务依赖以下组件：

1. 文件系统服务 - 用于读取图像文件
2. 缩略图服务 - 用于生成搜索结果缩略图
3. 数据库服务 - 用于存储和检索颜色记录
4. 配置管理器 - 获取颜色服务配置
5. 图像处理库 - 处理图像数据（如node-vibrant、color-thief等）

## 颜色提取算法

服务使用以下算法进行颜色提取：

1. **量化**：降低图像颜色数量，减少噪声
2. **聚类**：使用k-means算法将像素按颜色分组
3. **合并**：合并相似颜色组
4. **排序**：按像素数量排序，获取主要颜色
5. **后处理**：对颜色进行调整，增强视觉效果

## 颜色匹配算法

服务支持多种颜色匹配算法：

1. **欧几里得距离**：计算RGB空间中的直线距离
2. **加权欧几里得距离**：考虑人眼对不同颜色的敏感度
3. **CIEDE2000**：高级颜色差异算法，更符合人眼感知
4. **HSL/HSV距离**：在色相、饱和度和亮度空间计算距离

## 性能优化

为提高性能，服务采用以下优化策略：

1. 颜色提取结果缓存，避免重复分析
2. 异步并行处理批量图像
3. 图像缩放预处理，减少计算量
4. 颜色索引建立，加速搜索
5. 懒加载图像数据，按需处理

## 未来改进

1. 实现基于深度学习的色彩提取，提高准确性
2. 添加颜色语义分析，理解颜色情感和上下文
3. 支持基于颜色组合和布局的搜索
4. 集成色彩理论，提供更智能的调色板生成
5. 添加颜色趋势分析功能，识别集合中的主导颜色 