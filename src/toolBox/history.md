## 2024-04-05 代码分析工具重构

### 完成事项

1. 创建了`feature/forCodeAnalysis`目录，专门用于存放代码分析相关工具
2. 将`source/utils/codeLoaders/js/jsDoc.js`迁移到`src/toolBox/feature/forCodeAnalysis/jsParser.js`
3. 增强了JSDoc解析功能，提供了中文命名API
4. 在`toolBoxExports.js`中添加导出

### 迁移摘要

| 旧路径 | 新路径 | 状态 |
|--------|--------|------|
| `source/utils/codeLoaders/js/jsDoc.js` | `src/toolBox/feature/forCodeAnalysis/jsParser.js` | 完成 |

### API变更

- 新增中文API:
  - `解析JSDoc配置` - 解析代码文本中的JSDoc注释
  - `从URL解析JSDoc配置` - 从URL加载代码并解析JSDoc注释
- 保留原有API以兼容现有代码:
  - `parseJSDocConfig`
  - `parseJSDocConfigFromURL`

### 下一步计划

1. 将`source/utils/codeLoaders/js/lexicalAnalyzer.js`迁移到`jsParser.js`中
2. 开发代码质量分析和代码修改工具

## 2024-04-07 思源块处理工具重构

### 完成事项

1. 创建了`useAge/forSiyuan/forBlock`目录，用于存放思源笔记块处理相关工具
2. 将`source/fromThirdParty/siyuanUtils/BlockHandler.js`迁移到`src/toolBox/useAge/forSiyuan/forBlock/useBlockHandler.js`
3. 添加了完整的JSDoc文档注释和中文命名函数
4. 修复了原有代码中的一些问题
5. 更新了相关导入路径，直接删除了原始文件

### 迁移摘要

| 旧路径 | 新路径 | 状态 |
|--------|--------|------|
| `source/fromThirdParty/siyuanUtils/BlockHandler.js` | `src/toolBox/useAge/forSiyuan/forBlock/useBlockHandler.js` | 完成 |

### API变更

- 新增中文API:
  - `创建块处理器(blockID, initdata, kernelApiInstance)` - 创建块处理器实例
  - `匹配块类型(type)` - 匹配块类型获取缩写
- 保留原有API以兼容现有代码:
  - `BlockHandler` 类

### 下一步计划

1. 继续迁移`source/fromThirdParty/siyuanUtils`中的其他工具
2. 优化块处理器的性能和错误处理
3. 将`kernelApi`也纳入工具箱体系

## 2024-04-08 思源工具函数继续重构

### 完成事项

1. 创建了`useAge/forSiyuan/forBlock`、`useAge/forSiyuan/forMarkdown`和`useAge/forSiyuan/forAsset`目录
2. 将以下文件进行了迁移：
   - `source/fromThirdParty/siyuanUtils/blockIcons.js` → `src/toolBox/useAge/forSiyuan/forBlock/useSiyuanBlockIcon.js`
   - `source/fromThirdParty/siyuanUtils/delegators/markdown.js` → `src/toolBox/useAge/forSiyuan/forMarkdown/useSiyuanMarkdown.js`
   - `source/fromThirdParty/siyuanUtils/upload.js` → `src/toolBox/useAge/forSiyuan/forAsset/useSiyuanUpload.js`
3. 为每个迁移的模块添加了完整的JSDoc文档注释和中文命名函数
4. 为每个目录创建了详细的README.md文件
5. 增强了原有功能，如添加批量上传和更灵活的配置选项
6. 删除了原始文件并修改了依赖该文件的代码

### 迁移摘要

| 旧路径 | 新路径 | 状态 |
|--------|--------|------|
| `source/fromThirdParty/siyuanUtils/blockIcons.js` | `src/toolBox/useAge/forSiyuan/forBlock/useSiyuanBlockIcon.js` | 完成 |
| `source/fromThirdParty/siyuanUtils/delegators/markdown.js` | `src/toolBox/useAge/forSiyuan/forMarkdown/useSiyuanMarkdown.js` | 完成 |
| `source/fromThirdParty/siyuanUtils/upload.js` | `src/toolBox/useAge/forSiyuan/forAsset/useSiyuanUpload.js` | 完成 |

### API变更

1. 块图标工具 (useSiyuanBlockIcon.js):
   - 新增: `根据类型获取图标`、`获取块类型图标映射`、`获取列表图标映射`
   - 兼容: `getIconByType`、`TYPE_ICON_MAP`、`LIST_ICON_MAP`

2. Markdown工具 (useSiyuanMarkdown.js):
   - 新增: `Markdown工具`、`创建Markdown工具`
   - 兼容: `markdown委托器`

3. 资源上传工具 (useSiyuanUpload.js):
   - 新增: `上传到思源资源库`、`创建上传处理器`
   - 兼容: `uploadToSiyuanAssets`
   - 增强: 添加批量上传、跳过确认等选项

### 下一步计划

1. 继续迁移`source/fromThirdParty`中的其他工具
2. 将`source/fromThirdParty/siyuanKernel`中的API封装到工具箱
3. 将`source/fromThirdParty/siyuanClient`中的功能迁移到工具箱
4. 减少对原始路径的依赖，完全切换到工具箱API

## 2024-04-09 思源内核API迁移

### 完成事项

1. 迁移思源内核API兼容层，创建重定向文件：
   - `source/fromThirdParty/siyuanKernel/asset.js` → 重定向到 `src/toolBox/useAge/forSiyuan/useSiyuanAsset.js`
   - `source/fromThirdParty/siyuanKernel/attr.js` → 重定向到 `src/toolBox/useAge/forSiyuan/useSiyuanBlock.js`
   - `source/fromThirdParty/siyuanKernel/block.js` → 重定向到 `src/toolBox/useAge/forSiyuan/useSiyuanBlock.js`
   - `source/fromThirdParty/siyuanKernel/blockOp.js` → 重定向到 `src/toolBox/useAge/forSiyuan/useSiyuanBlock.js`
   - `source/fromThirdParty/siyuanKernel/system.js` → 重定向到 `src/toolBox/useAge/forSiyuan/useSiyuanSystem.js`
   - `source/fromThirdParty/siyuanKernel/notebook.js` → 重定向到 `src/toolBox/useAge/forSiyuan/useSiyuanNotebook.js`
2. 扩展了 `useSiyuanAsset.js` 模块，添加原 `asset.js` 中的所有功能
3. 为 `useSiyuanBlock.js` 添加了兼容导出，确保 `getBlockAttrs` 和 `setBlockAttrs` 函数正常工作
4. 修复了导入路径错误导致的问题

### 迁移摘要

| 旧路径 | 新路径 | 状态 |
|--------|--------|------|
| `source/fromThirdParty/siyuanKernel/asset.js` | `src/toolBox/useAge/forSiyuan/useSiyuanAsset.js` | 完成（兼容层） |
| `source/fromThirdParty/siyuanKernel/attr.js` | `src/toolBox/useAge/forSiyuan/useSiyuanBlock.js` | 完成（兼容层） |
| `source/fromThirdParty/siyuanKernel/block.js` | `src/toolBox/useAge/forSiyuan/useSiyuanBlock.js` | 完成（兼容层） |
| `source/fromThirdParty/siyuanKernel/blockOp.js` | `src/toolBox/useAge/forSiyuan/useSiyuanBlock.js` | 完成（兼容层） |
| `source/fromThirdParty/siyuanKernel/system.js` | `src/toolBox/useAge/forSiyuan/useSiyuanSystem.js` | 完成（兼容层） |
| `source/fromThirdParty/siyuanKernel/notebook.js` | `src/toolBox/useAge/forSiyuan/useSiyuanNotebook.js` | 完成（兼容层） |
| `source/fromThirdParty/siyuanClient/dialogs/confirmPromises.js` | `src/toolBox/useAge/forSiyuan/useSiyuanDialog.js` | 完成（兼容层） |

### API变更

1. 资源文件API (useSiyuanAsset.js):
   - 新增函数：`上传资源到云端`、`插入本地资源`、`解析资源路径`、`设置文件注释`、`获取文件注释`、`获取未使用资源`、`获取缺失资源`、`删除未使用资源`、`删除所有未使用资源`、`获取文档图片资源`、`获取图片OCR文本`、`设置图片OCR文本`、`执行OCR`、`重建资源内容索引`、`获取资源统计`、`获取资源文件信息`
   - 英文兼容API：`uploadCloud`、`insertLocalAssets`、`resolveAssetPath`、`setFileAnnotation`、`getFileAnnotation`、`getUnusedAssets`、`getMissingAssets`、`removeUnusedAsset`、`removeUnusedAssets`、`getDocImageAssets`、`getImageOCRText`、`setImageOCRText`、`ocr`、`fullReindexAssetContent`、`statAsset`、`getAssetInfo`

2. 块操作API (useSiyuanBlock.js):
   - 新增兼容导出：`getBlockAttrs`、`setBlockAttrs`
   - 确保与原 `attr.js` 兼容

### 下一步计划

1. 继续迁移 `source/fromThirdParty/siyuanKernel` 中的其他API文件
   - [x] 已完成 `asset.js`、`attr.js`、`block.js`、`blockOp.js`、`system.js`、`notebook.js` 的兼容层迁移
   - [ ] 下一步重点处理 `file.js`、`filetree.js`、`workspace.js` 等文件
2. 完成 `source/fromThirdParty/siyuanClient` 目录的迁移
   - [x] 已完成 `dialogs/confirmPromises.js` 的兼容层迁移
   - [ ] 下一步处理 `runtime.js` 和其他客户端工具
3. 添加或更新 `README.md` 和 `AInote.md` 到新创建的目录中
4. 持续扩展和优化工具集功能
