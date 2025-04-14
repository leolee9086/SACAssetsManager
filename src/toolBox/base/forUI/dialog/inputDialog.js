/**
 * 输入对话框工具模块
 * 
 * 提供用于创建简单输入对话框的功能，支持Promise接口和回调函数方式。
 */

/**
 * 显示输入对话框
 * @param {Object} clientApi 思源API客户端实例
 * @param {string} title 对话框标题
 * @param {string} placeholder 输入框占位文本
 * @param {Function} [confirm] 确认回调函数，参数为输入的文本
 * @param {Function} [cancel] 取消回调函数
 * @returns {Object} 对话框实例
 */
export function showInputDialog(clientApi, title, placeholder, confirm = () => {}, cancel = () => {}) {
    if (!clientApi || !clientApi.Dialog) {
        console.error('思源API未正确加载，无法创建对话框');
        return null;
    }

    const dialog = new clientApi.Dialog({
        title,
        content: `<div class="b3-dialog__content">
            <input class="b3-text-field fn__block" placeholder="${placeholder}">
            <div class="fn__space"></div>
        </div>
        <div class="b3-dialog__action">
            <button class="b3-button b3-button--cancel">${window.siyuan?.languages?.cancel || '取消'}</button>
            <div class="fn__space"></div>
            <button class="b3-button b3-button--text">${window.siyuan?.languages?.confirm || '确认'}</button>
        </div>`,
        width: "520px",
        destroyCallback: () => {
            cancel();
        }
    });

    const input = dialog.element.querySelector('input');
    const confirmButton = dialog.element.querySelector('.b3-button--text');
    const cancelButton = dialog.element.querySelector('.b3-button--cancel');

    confirmButton.addEventListener('click', () => {
        const value = input.value.trim();
        if (value) {
            confirm(value);
            dialog.destroy();
        }
    });

    cancelButton.addEventListener('click', () => {
        dialog.destroy();
    });

    input.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            const value = input.value.trim();
            if (value) {
                confirm(value);
                dialog.destroy();
            }
        }
    });

    // 聚焦输入框
    setTimeout(() => input.focus(), 100);
    
    return dialog;
}

/**
 * 显示输入对话框（Promise方式）
 * @param {Object} clientApi 思源API客户端实例
 * @param {string} title 对话框标题
 * @param {string} placeholder 输入框占位文本
 * @returns {Promise<string>} 返回Promise，解析为输入的文本，或在取消时拒绝
 */
export function showInputDialogPromise(clientApi, title, placeholder) {
    return new Promise((resolve, reject) => {
        showInputDialog(
            clientApi,
            title,
            placeholder,
            (value) => resolve(value),
            () => reject(new Error('用户取消了输入'))
        );
    });
}

/**
 * 显示确认对话框
 * @param {Object} clientApi 思源API客户端实例
 * @param {string} title 对话框标题
 * @param {string} message 确认消息
 * @param {Function} [confirm] 确认回调函数
 * @param {Function} [cancel] 取消回调函数
 * @returns {Object} 对话框实例
 */
export function showConfirmDialog(clientApi, title, message, confirm = () => {}, cancel = () => {}) {
    if (!clientApi || !clientApi.Dialog) {
        console.error('思源API未正确加载，无法创建对话框');
        return null;
    }

    const dialog = new clientApi.Dialog({
        title,
        content: `<div class="b3-dialog__content">
            <div>${message}</div>
            <div class="fn__space"></div>
        </div>
        <div class="b3-dialog__action">
            <button class="b3-button b3-button--cancel">${window.siyuan?.languages?.cancel || '取消'}</button>
            <div class="fn__space"></div>
            <button class="b3-button b3-button--text">${window.siyuan?.languages?.confirm || '确认'}</button>
        </div>`,
        width: "520px",
        destroyCallback: () => {
            cancel();
        }
    });

    const confirmButton = dialog.element.querySelector('.b3-button--text');
    const cancelButton = dialog.element.querySelector('.b3-button--cancel');

    confirmButton.addEventListener('click', () => {
        confirm();
        dialog.destroy();
    });

    cancelButton.addEventListener('click', () => {
        dialog.destroy();
    });
    
    return dialog;
}

/**
 * 显示确认对话框（Promise方式）
 * @param {Object} clientApi 思源API客户端实例
 * @param {string} title 对话框标题
 * @param {string} message 确认消息
 * @returns {Promise<void>} 返回Promise，在确认时解析，在取消时拒绝
 */
export function showConfirmDialogPromise(clientApi, title, message) {
    return new Promise((resolve, reject) => {
        showConfirmDialog(
            clientApi,
            title,
            message,
            () => resolve(),
            () => reject(new Error('用户取消了操作'))
        );
    });
}

// 中文别名
export const 打开输入对话框 = showInputDialog;
export const 打开输入对话框Promise = showInputDialogPromise;
export const 打开确认对话框 = showConfirmDialog;
export const 打开确认对话框Promise = showConfirmDialogPromise; 