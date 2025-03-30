import { clientApi } from "../../../asyncModules.js";
import { showInputDialog, showInputDialogPromise } from "../../../../src/toolBox/base/forUI/dialog/inputDialog.js";

/**
 * 显示输入对话框
 * @param {string} title 对话框标题
 * @param {string} placeholder 输入框占位文本
 * @param {Function} confirm 确认回调函数，参数为输入的文本
 * @param {Function} cancel 取消回调函数
 * @returns {Object} 对话框实例
 */
const showInput = (title, placeholder, confirm = () => {}, cancel = () => {}) => {
    return showInputDialog(clientApi, title, placeholder, confirm, cancel);
};

/**
 * 显示输入对话框（Promise方式）
 * @param {string} title 对话框标题
 * @param {string} placeholder 输入框占位文本
 * @returns {Promise<string>} 返回Promise，解析为输入的文本，或在取消时拒绝
 */
const showInputPromise = (title, placeholder) => {
    return showInputDialogPromise(clientApi, title, placeholder);
};

// 导出函数
export { showInput as showInputDialog, showInputPromise as showInputDialogPromise };