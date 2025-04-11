# 这个区段由开发者编写,未经允许禁止AI修改
在这里记录关于面板对话框的设计和使用方法。

## 面板对话框功能设计

本插件现在支持两种方式打开面板：
1. 作为Tab页签打开
2. 作为Dialog对话框打开

这两种方式有不同的使用场景：
- Tab页签适合长时间使用的功能界面
- Dialog对话框适合临时交互或辅助功能

## 面板对话框的使用方法

### 1. 在其他面板中打开面板对话框

```js
// 导入对话框工具
import { openPanelAsDialog, openBatchPanoramaExporterDialog } from '../../siyuanCommon/dialog/panelDialog.js'

// 方法1：使用专用函数打开特定面板
const { app, dialog } = await openBatchPanoramaExporterDialog({
  // 传递数据
  sourceType: 'panorama',
  currentImage: {
    path: '/path/to/image.jpg',
    name: 'image'
  }
});

// 方法2：使用通用函数打开任意面板
const { app, dialog } = await openPanelAsDialog(
  'panelName',  // 面板名称（文件夹名）
  {/* 数据 */},  // 传递给面板的数据
  '面板标题',   // 对话框标题
  '80vw',      // 宽度
  '90vh'       // 高度
);
```

### 2. 在菜单项中添加打开面板对话框的选项

```js
menu.addItem({
  label: "在对话框中打开批量导出",
  click: async () => {
    const { openBatchPanoramaExporterDialog } = await import('/plugins/SACAssetsManager/source/UI/siyuanCommon/dialog/panelDialog.js');
    openBatchPanoramaExporterDialog({
      /* 传递数据 */
    });
  }
});
```

### 3. 接收数据的注意事项

当面板作为对话框打开时，数据通过Vue组件的data属性传递：

```js
// 在面板的Vue组件中
onMounted(() => {
  // 如果是对话框模式，可以直接从props或父组件拿到数据
  if (props.dialogData) {
    handleReceivedData(props.dialogData);
  }
});
```

## 已支持对话框方式打开的面板

1. batchPanoramaExporter - 批量全景导出
2. imagePreviewer - 图片预览器 
3. pannoViewer - 全景查看器

## 改进计划

1. 添加更多专用对话框打开函数
2. 支持对话框和Tab之间的数据同步
3. 支持在菜单中统一注册面板的两种打开方式 