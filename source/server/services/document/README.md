# 文档处理服务

## 服务说明

文档处理服务提供PDF和Office文档的处理功能，包括文本提取、元数据获取、文档预览等。该服务为应用提供文档内容分析和处理能力，是文件管理系统的重要组成部分。

## 未来计划

迁移到动态注册端点,因为这个可能不是核心功能

## 功能

- PDF文档文本提取
- PDF文档元数据获取
- PDF页面预览生成
- Office文档（Word、Excel、PowerPoint）文本提取
- Office文档元数据获取
- 文档处理临时文件管理

## 文件结构

- `documentService.js` - 主服务实现，提供文档处理核心功能

## 配置项

文档处理服务的配置位于`config/default.js`中：

```javascript
document: {
    // 临时文件目录
    tempDir: path.join(os.tmpdir(), 'sac-document-temp'),
    
    // 缓存大小（项目数量）
    cacheSize: 100,
    
    // 预览质量 (low|medium|high)
    previewQuality: 'medium',
    
    // 支持的PDF操作
    pdf: {
        enableTextExtraction: true,
        enablePreview: true,
        maxPreviewWidth: 1200,
        previewFormat: 'png'
    },
    
    // 支持的Office文档操作
    office: {
        enableTextExtraction: true,
        supportedFormats: ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']
    }
}
```

## API参考

### PDF文本提取

```javascript
/**
 * 从PDF文档中提取文本
 * @param {string} filePath - PDF文件路径
 * @returns {Promise<string>} 提取的文本内容
 */
extractTextFromPdf(filePath)
```

### Office文档文本提取

```javascript
/**
 * 从Office文档中提取文本和元数据
 * @param {string} filePath - Office文档文件路径
 * @returns {Promise<Object>} 包含文本和元数据的对象
 */
extractTextFromOffice(filePath)
```

### PDF页面预览

```javascript
/**
 * 生成PDF页面预览
 * @param {string} filePath - PDF文件路径
 * @param {number} page - 页码
 * @param {number} width - 预览宽度
 * @returns {Promise<string>} 预览图片路径
 */
generatePdfPagePreview(filePath, page, width)
```

### PDF文档信息

```javascript
/**
 * 获取PDF文档信息
 * @param {string} filePath - PDF文件路径
 * @returns {Promise<Object>} PDF信息对象
 */
getPdfInfo(filePath)
```

### 临时文件清理

```javascript
/**
 * 清理临时文件
 * @returns {Promise<number>} 清理的文件数量
 */
cleanupTempFiles()
```

## 使用示例

### 提取PDF文本

```javascript
import { extractTextFromPdf } from '../services/document/documentService.js';

try {
  const text = await extractTextFromPdf('/path/to/document.pdf');
  console.log(`提取的文本: ${text.substring(0, 100)}...`);
} catch (error) {
  console.error(`文本提取失败: ${error.message}`);
}
```

### 生成PDF预览

```javascript
import { generatePdfPagePreview } from '../services/document/documentService.js';

try {
  const previewPath = await generatePdfPagePreview('/path/to/document.pdf', 1, 800);
  console.log(`预览图片路径: ${previewPath}`);
} catch (error) {
  console.error(`预览生成失败: ${error.message}`);
}
```

## 依赖说明

文档处理服务需要以下依赖：

1. 文件系统访问（原生fs模块）
2. 配置管理（configManager.js）
3. 日志服务（loggerService.js）

## 实现注意事项

目前服务使用模拟实现，需要注意：

1. PDF文本提取需要集成第三方库（如pdf.js）
2. Office文档处理需要集成第三方库（如mammoth.js、xlsx等）
3. PDF预览生成需要实现实际的渲染和图片保存

## 未来改进

1. 实现实际的PDF文本提取功能
2. 实现实际的Office文档解析功能
3. 实现PDF预览生成功能
4. 添加文档文本内容索引功能
5. 实现文档全文搜索功能
6. 添加缓存机制，提高处理效率 