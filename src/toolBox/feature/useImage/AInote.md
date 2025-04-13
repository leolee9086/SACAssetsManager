# 这个区段由开发者编写,未经允许禁止AI修改
<无缝贴图检测工具的开发笔记和要求>

# 无缝贴图检测工具

无缝贴图检测工具(`useSeamlessDetector.js`)提供了一套完整的功能，用于分析和识别图像是否为无缝贴图（seamless texture）。

## 功能概述

该工具使用以下三种主要分析方法检测无缝贴图：

1. **边缘分析**：比较图像的左右边缘和上下边缘的像素相似度
2. **平铺分析**：检测图像在平铺时接缝处的连续性
3. **自相关分析**：分析图像的周期性特征

## 主要导出函数

工具导出了三个主要函数：

- `分析无缝贴图(imageSource, options)` - 完整分析函数，返回详细结果
- `是否为无缝贴图(imageSource, options)` - 简化接口，仅返回布尔值结果
- `批量分析无缝贴图(imageSources, options, progressCallback)` - 批量处理多张图像

## 使用示例

```javascript
// 简单判断单个图像
const isSeamless = await 是否为无缝贴图('path/to/image.jpg');
console.log(isSeamless ? '这是无缝贴图' : '这不是无缝贴图');

// 获取详细分析结果
const analysisResult = await 分析无缝贴图('path/to/image.jpg', {
  borderWidth: 8,        // 分析边缘宽度
  qualityThreshold: 0.8  // 判定阈值
});
console.log('无缝得分:', analysisResult.score);
console.log('是否无缝:', analysisResult.isSeamless);
console.log('水平接缝得分:', analysisResult.rawData.horizontalSeamScore);
console.log('垂直接缝得分:', analysisResult.rawData.verticalSeamScore);

// 批量处理
const results = await 批量分析无缝贴图([
  'path/to/image1.jpg',
  'path/to/image2.png',
  document.getElementById('myImage')
], {}, (progress) => {
  console.log(`进度: ${Math.round(progress.progress * 100)}%`);
});
```

## 配置选项

分析函数接受以下选项：

- `borderWidth`: 边缘分析的边框宽度（默认5像素）
- `tileSize`: 平铺分析的平铺次数（默认2x2）
- `edgeWeight`: 边缘分析权重（默认0.4）
- `tileWeight`: 平铺分析权重（默认0.4）
- `correlationWeight`: 自相关分析权重（默认0.2）
- `qualityThreshold`: 判定为无缝贴图的阈值（默认0.85）

## 结果解释

分析结果对象包含以下主要字段：

- `isSeamless`: 是否为无缝贴图（布尔值）
- `score`: 综合得分（0-1，越高越无缝）
- `confidence`: 置信度评分
- `details`: 包含各分析方法的详细结果
- `imageInfo`: 图像基本信息
- `rawData`: 原始分析数据

## 实现原理

1. **边缘分析**通过比较图像左右边缘和上下边缘的像素相似度来识别无缝特性
2. **平铺分析**检查图像在平铺时接缝处的连续性
3. **自相关分析**检测图像中的周期性模式，有助于识别重复纹理

性能优化考虑：
- 对于大图像，分析前可以考虑缩小尺寸
- 批量处理时适当添加延时防止浏览器阻塞
- 可设置不同权重来适应不同类型的纹理

## 依赖关系

此工具不依赖外部库，仅使用浏览器标准API（Canvas、Image等）。 