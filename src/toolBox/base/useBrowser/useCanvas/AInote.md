# Canvas工具集重构与迁移

## 重构概述

我们将`source/utils/canvas/index.js`中的Canvas处理功能重构并迁移到`src/toolBox/base/useBrowser/useCanvas/`目录下，遵循toolBox的设计原则和命名规范。

## 重构内容

原来的单一文件`source/utils/canvas/index.js`被拆分为以下几个功能明确的模块：

1. `canvasProcessor.js` - 包含`CanvasProcessor`类，提供链式调用的Canvas处理功能
2. `canvasLoaders.js` - 包含从不同源加载图像的工具函数
3. `canvasFactory.js` - 包含创建Canvas处理器的工厂函数
4. `index.js` - 提供统一的导出接口

## 功能增强

除了保留原有功能外，还进行了以下增强：

1. 增加了完整的JSDoc注释，提高代码可读性
2. 增加了从SVG和二进制数据创建图像的专用函数
3. 按照项目规范，提供了中文函数名，同时保留英文别名以兼容现有代码
4. 优化了错误处理和边界情况检查

## 使用示例

### 从工具箱统一导入

```js
// 从工具箱导入
import { CanvasProcessor, 创建Canvas处理器 } from '../../../toolBox/toolBoxExports.js';

// 使用
const processor = new CanvasProcessor(canvas);
processor.resize(800, 600).rotate(90);
```

### 按需导入特定功能

```js
// 中文命名函数导入
import { 从Blob创建图像 } from '../../../toolBox/base/useBrowser/useCanvas/canvasLoaders.js';

// 或使用英文别名
import { createImageFromBlob } from '../../../toolBox/base/useBrowser/useCanvas/canvasLoaders.js';
```

## 兼容性说明

为了保持向后兼容性，我们：

1. 保留了原有的API接口设计
2. 为所有中文命名的函数提供了英文别名
3. 通过`index.js`文件提供了统一的导出，类似原来的做法

## 迁移路径

对于现有的代码，建议按以下步骤迁移：

1. 将导入源从`source/utils/canvas/index.js`改为`src/toolBox/toolBoxExports.js`
2. 后续新代码应直接使用工具箱中的函数 