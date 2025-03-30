import { confirm } from "../runtime.js";

/**
 * 创建确认对话框并返回Promise
 * @param {string} 标题 对话框标题
 * @param {string} 主体内容 对话框内容
 * @returns {Promise<boolean>} 用户确认返回true，取消返回false
 */
export const confirmAsPromise = (标题, 主体内容) => {
    return new Promise((resolve) => {
        confirm(
            标题,
            主体内容,
            () => {
                resolve(true);
            },
            () => {
                resolve(false);
            }
        );
    });
};