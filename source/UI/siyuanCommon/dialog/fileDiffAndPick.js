import { clientApi } from "../../../asyncModules.js";
import { openImagePickerDialog, openImagePickerPromise } from "../../../../src/toolBox/base/forUI/dialog/imagePickerDialog.js";

/**
 * 打开文件选择对话框
 * @param {string} title 对话框标题
 * @param {Array} images 图像列表
 * @param {string} tootip 提示文本
 * @param {Function} confirm 确认回调
 * @param {Function} cancel 取消回调
 * @returns {Object} 对话框实例
 */
const openFilePickDialog = (title, images, tootip, confirm = () => {}, cancel = () => {}) => {
    return openImagePickerDialog(clientApi, title, images, tootip, confirm, cancel);
};

/**
 * 以Promise方式打开文件选择对话框
 * @param {string} title 对话框标题
 * @param {Array} images 图像列表
 * @param {string} tootip 提示文本
 * @returns {Promise<Object|undefined>} 返回Promise，解析为选中的文件对象或undefined（取消时）
 */
export const filePickPromise = (title, images, tootip) => {
    return openImagePickerPromise(clientApi, title, images, tootip);
};