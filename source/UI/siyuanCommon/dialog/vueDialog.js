import { clientApi } from "../../../asyncModules.js";
import { openVueDialog } from "../../../../src/toolBox/feature/useVue/dialogTools.js";

/**
 * 打开包含Vue组件的对话框
 * @param {string} appURL - 组件路径
 * @param {string} name - 组件名称
 * @param {Object} mixinOptions - 混入选项
 * @param {string} directory - 目录
 * @param {Object} data - 组件数据
 * @param {string} title - 对话框标题
 * @param {string} width - 对话框宽度
 * @param {string} height - 对话框高度
 * @param {boolean} transparent - 是否透明背景
 * @returns {Promise<{app: Vue.App, dialog: Dialog}>} 返回Vue应用和对话框实例
 */
export async function openDialog(appURL, name, mixinOptions = {}, directory, data, title, width, height, transparent = true) {
    return openVueDialog(
        clientApi,
        appURL,
        name,
        mixinOptions,
        directory,
        data,
        title,
        width,
        height,
        transparent
    );
}