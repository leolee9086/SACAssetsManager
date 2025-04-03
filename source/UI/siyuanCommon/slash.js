/**
 * 兼容层 - 旧版本引用路径保持不变
 * 
 * @deprecated 请直接使用 src/toolBox/useAge/forSiyuan/useSiyuanSlash.js
 */

import { 
    处理对话框销毁 as handleDialogDestroy,
    使用API配置打开对话框 as openDialogWithApiConfig,
    使用本地路径打开对话框 as openDialogWithLocalPath,
    打开磁盘选择对话框 as openDiskSelectionDialog,
    打开Everything搜索对话框 as openEverythingDialog,
    打开Anytxt搜索对话框 as openAnytxtDialog,
    注册斜杠菜单项, 
    设置插件斜杠菜单
} from "../../../src/toolBox/useAge/forSiyuan/useSiyuanSlash.js";

import { plugin } from "../../pluginSymbolRegistry.js";

// 导出函数，保持与原有代码兼容
export { 
    handleDialogDestroy,
    openDialogWithApiConfig,
    openDialogWithLocalPath,
    openDiskSelectionDialog,
    openEverythingDialog,
    openAnytxtDialog
};

// 为保持兼容性，保留原有的 protyleSlash 定义方式
Object.defineProperty(plugin, 'protyleSlash', {
    get: function() {
        console.warn('弃用警告: 直接访问 plugin.protyleSlash 已弃用，请使用 useSiyuanSlash.js 中的 setPluginSlashMenu 函数');
        return 注册斜杠菜单项(plugin);
    }
});
