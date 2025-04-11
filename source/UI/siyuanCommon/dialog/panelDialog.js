import { clientApi, plugin } from "../../../asyncModules.js";
import { openVueDialog } from "../../../../src/toolBox/feature/useVue/dialogTools.js";

/**
 * 将面板作为对话框打开
 * @param {string} panelName - 面板名称(不含Tab后缀)
 * @param {Object} data - 传递给面板的数据
 * @param {string} title - 对话框标题
 * @param {string} width - 对话框宽度
 * @param {string} height - 对话框高度
 * @param {boolean} transparent - 是否透明背景
 * @returns {Promise<{app: Vue.App, dialog: Dialog}>} 返回Vue应用和对话框实例
 */
export async function openPanelAsDialog(panelName, data = {}, title = '', width = '70vw', height = 'auto', transparent = false) {
    // 获取面板组件路径
    const panelPath = `/plugins/SACAssetsManager/source/UI/pannels/${panelName}/index.vue`;
    
    console.log(`尝试打开面板 ${panelName} 作为对话框`);
    
    return openVueDialog(
        clientApi,
        panelPath,
        panelName + 'Dialog',
        {},
        null,
        data,
        title || `${panelName}面板`,
        width,
        height,
        transparent
    );
}

/**
 * 批量全景导出面板作为对话框打开
 * @param {Object} exportData - 传递给导出器的数据
 * @param {string} title - 对话框标题
 * @returns {Promise<{app: Vue.App, dialog: Dialog}>} 返回Vue应用和对话框实例
 */
export async function openBatchPanoramaExporterDialog(exportData = {}, title = '批量全景导出') {
    return openPanelAsDialog('batchPanoramaExporter', exportData, title, '80vw', '90vh');
}

/**
 * 图片预览器面板作为对话框打开
 * @param {Object} data - 传递给预览器的数据
 * @param {string} title - 对话框标题
 * @returns {Promise<{app: Vue.App, dialog: Dialog}>} 返回Vue应用和对话框实例
 */
export async function openImagePreviewerDialog(data = {}, title = '图片预览器') {
    return openPanelAsDialog('imagePreviewer', data, title, '90vw', '90vh');
}

/**
 * 全景查看器面板作为对话框打开
 * @param {Object} data - 传递给查看器的数据
 * @param {string} title - 对话框标题
 * @returns {Promise<{app: Vue.App, dialog: Dialog}>} 返回Vue应用和对话框实例
 */
export async function openPannoViewerDialog(data = {}, title = '全景查看器') {
    return openPanelAsDialog('pannoViewer', data, title, '90vw', '90vh');
} 