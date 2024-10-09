// ... 现有代码 ...
import { clientApi } from "../../../asyncModules.js";
const {Dialog}=clientApi

const showInputDialog = (title, placeholder, confirm = () => {}, cancel = () => {}) => {
    const dialog = new Dialog({
        title,
        content: `<div class="b3-dialog__content">
            <input class="b3-text-field fn__block" placeholder="${placeholder}">
            <div class="fn__space"></div>
        </div>
        <div class="b3-dialog__action">
            <button class="b3-button b3-button--cancel">${window.siyuan.languages.cancel}</button>
            <div class="fn__space"></div>
            <button class="b3-button b3-button--text">${window.siyuan.languages.confirm}</button>
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
};
const showInputDialogPromise = (title, placeholder) => {
    return new Promise((resolve, reject) => {
        showInputDialog(
            title,
            placeholder,
            (value) => resolve(value),
            () => reject(new Error('用户取消了输入'))
        );
    });
};

// 导出函数
export { showInputDialog ,showInputDialogPromise};