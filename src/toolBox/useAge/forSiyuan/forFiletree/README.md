# 思源笔记文件树操作工具

此模块提供了对思源笔记文件树和文档的操作功能，包括创建、移动、重命名和删除文档等。

## 文件结构

- `useSiyuanFiletree.js` - 文件树和文档操作工具函数

## 导出内容

### 函数

#### 文档树查询

- `列出文档树(选项)` / `listDocTree(options)` - 获取文档树列表
- `根据路径列出文档(选项)` / `listDocsByPath(options)` - 根据路径获取文档列表
- `搜索文档(选项)` / `searchDocs(options)` - 搜索文档
- `获取文档(选项)` / `getDoc(options)` - 获取文档内容

#### 文档创建

- `创建文档(选项)` / `createDoc(options)` - 创建文档
- `创建每日笔记(选项)` / `createDailyNote(options)` - 创建每日笔记
- `使用Markdown创建文档(选项)` / `createDocWithMd(options)` - 使用Markdown内容创建文档
- `获取文档创建保存路径(选项)` / `getDocCreateSavePath(options)` - 获取文档创建保存路径
- `获取引用创建保存路径(选项)` / `getRefCreateSavePath(options)` - 获取引用创建保存路径

#### 文档操作

- `重命名文档(选项)` / `renameDoc(options)` - 重命名文档
- `通过ID重命名文档(选项)` / `renameDocByID(options)` - 通过ID重命名文档
- `移动文档(选项)` / `moveDocs(options)` - 移动文档
- `删除文档(选项)` / `removeDoc(options)` - 删除文档
- `修改文档排序(选项)` / `changeSort(options)` - 修改文档排序

#### 文档转换

- `文档转换为标题(选项)` / `doc2Heading(options)` - 将文档转换为标题
- `标题转换为文档(选项)` / `heading2Doc(options)` - 将标题转换为文档
- `列表项转换为文档(选项)` / `li2Doc(options)` - 将列表项转换为文档

#### 其他操作

- `刷新文件树(options)` / `refreshFiletree(options)` - 刷新文件树

## 使用示例

```javascript
import { 列出文档树, 创建文档, 创建每日笔记 } from '../../../toolBox/useAge/forSiyuan/useSiyuanFiletree.js';

// 列出文档树
async function 示例_列出文档树() {
  const 结果 = await 列出文档树({
    notebook: '20210808180117-6v0mkxr',
    path: '/'
  });
  console.log('文档树', 结果.data);
}

// 创建文档
async function 示例_创建文档() {
  const 结果 = await 创建文档({
    notebook: '20210808180117-6v0mkxr',
    path: '/test',
    title: '测试文档',
    md: '# 测试内容'
  });
  console.log('创建文档', 结果.data);
}

// 创建每日笔记
async function 示例_创建每日笔记() {
  const 结果 = await 创建每日笔记({
    notebook: '20210808180117-6v0mkxr'
  });
  console.log('每日笔记', 结果.data);
}
```

## 功能说明

### 文档树查询

提供对文档树和文档内容的查询功能，包括列出文档树、根据路径列出文档、搜索文档和获取文档内容。

### 文档创建

提供多种文档创建方式，包括普通创建、创建每日笔记和使用Markdown内容创建文档，以及获取创建保存路径。

### 文档操作

提供对文档的基本操作，包括重命名、移动、删除和排序等。

### 文档转换

提供文档和标题之间的转换功能，以及列表项转文档的功能。

## 重构信息

本模块从 `source/fromThirdParty/siyuanKernel/filetree.js` 重构而来，采用函数式风格重新设计。

### 主要变更

1. 添加了完整的JSDoc文档注释
2. 提供了中文命名的函数API
3. 优化了参数验证和错误处理
4. 保留了原有API以兼容现有代码

## 后续计划

1. 增加批量操作多个文档的功能
2. 增加文档操作的事件通知机制
3. 增加文档树缓存机制，提高操作效率
4. 增加更多文档管理工具函数 