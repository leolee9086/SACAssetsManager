/**
 * useAge目录集中导出文件
 * 
 * 提供具体应用场景的统一导出接口,便于其他模块引入使用
 * 推荐直接导入所需的特定工具函数,而不是整个模块
 */

// 思源笔记环境工具
export * from './useSiyuan.js';
export * from './useSiyuanFrontEndApi.js';
export * from './useSiyuanConfig.js';

// WebView右键菜单工具
export * from './forWebviewContextMenu.js';

// forAnytext Anytext处理工具
export * from './forAnytext/index.js';

// forCluster 集群处理工具
export * from './forCluster/index.js';

// forEagle Eagle软件相关工具
export * from './forEagle/index.js';

// forFileManage 文件管理工具
export * from './forFileManage/index.js';

// forImageAndCanvas 图像和Canvas处理工具
export * from './forImageAndCanvas/index.js';

// forKramdown Kramdown处理工具
export * from './forKramdown/index.js';

// forNpm NPM相关工具
export * from './forNpm/index.js';

// forSync 响应式数据同步工具
export * from './forSync/index.js';

// forSiyuan 思源笔记特定工具

// -- 思源笔记功能组件导出
import * as useSiyuanMenu from './forSiyuan/useSiyuanMenu.js';
import * as useSiyuanDialog from './forSiyuan/useSiyuanDialog.js';
import * as useSiyuanSystem from './forSiyuan/useSiyuanSystem.js';
import * as useSiyuanBlock from './forSiyuan/useSiyuanBlock.js';
import * as useSiyuanWorkspace from './forSiyuan/useSiyuanWorkspace.js';
import * as useSiyuanNotebook from './forSiyuan/useSiyuanNotebook.js';
import * as useSiyuanAsset from './forSiyuan/useSiyuanAsset.js';
import * as useSiyuanSlash from './forSiyuan/useSiyuanSlash.js';
import * as useSiyuanTab from './forSiyuan/useSiyuanTab.js';

// -- 具体功能模块导出
export * from './forSiyuan/forBlock/useBlockHandler.js';
export * from './forSiyuan/forBlock/useSiyuanBlockIcon.js';
export * from './forSiyuan/forMarkdown/useSiyuanMarkdown.js';
export * from './forSiyuan/forAsset/useSiyuanUpload.js';

// 导出思源特定功能工具
export {
    useSiyuanMenu,
    useSiyuanDialog,
    useSiyuanSystem,
    useSiyuanBlock,
    useSiyuanWorkspace,
    useSiyuanNotebook,
    useSiyuanAsset,
    useSiyuanSlash,
    useSiyuanTab
};

// forText 文本处理工具
export * from './forText/index.js';

// forThumbNail 缩略图处理工具
export * from './forThumbNail/index.js'; 