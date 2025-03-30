/**
 * 图像选择对话框工具模块
 * 
 * 提供用于创建图像选择对话框的功能，支持键盘和鼠标选择图像。
 */

/**
 * 打开图像选择对话框
 * @param {Object} clientApi 思源API客户端实例
 * @param {string} title 对话框标题
 * @param {Array<{src: string, label: string}>} images 图像列表，每项包含图像路径和标签
 * @param {string} tooltip 提示文本
 * @param {Function} [confirm] 确认回调函数，参数为选中的图像对象
 * @param {Function} [cancel] 取消回调函数，参数为对话框实例
 * @returns {Object} 对话框实例
 */
export function openImagePickerDialog(clientApi, title, images, tooltip, confirm = () => {}, cancel = () => {}) {
    if (!clientApi || !clientApi.Dialog) {
        console.error('思源API未正确加载，无法创建对话框');
        return null;
    }

    const dialog = new clientApi.Dialog({
        title,
        content: `<div class="b3-dialog__content">
            <div class="image-selection fn__flex">
                ${images.map((image, index) => `
                    <div class="image-option fn__flex fn__flex-column">
                        <div class="image-number">${index + 1}</div>
                        <img src="${image.src}" alt="选项${index + 1}" class="selectable-image" data-index="${index}">
                        <p>${image.label}</p>
                    </div>
                    <div class="fn__space"></div>
                `).join('')}
            </div>
            <div class="fn__space"></div>
            <div>${tooltip}</div>
        </div>
        <div class="b3-dialog__action">
            <button class="b3-button b3-button--cancel">${window.siyuan?.languages?.cancel || '取消'}</button>
        </div>`,
        width: "520px",
        destroyCallback: () => { 
            dialog.$result ? confirm(dialog.$result) : cancel(dialog);
            document.removeEventListener('keydown', handleKeyPress);
        }
    });

    // 处理键盘事件
    function handleKeyPress(event) {
        const key = parseInt(event.key);
        if (!isNaN(key) && key > 0 && key <= images.length) {
            const selectedImage = dialog.element.querySelector(`.selectable-image[data-index="${key - 1}"]`);
            if (selectedImage) {
                dialog.$result = {
                    src: selectedImage.getAttribute('src'),
                    index: key - 1,
                    image: images[key - 1]
                };
                dialog.destroy();
            }
        } else if (event.key === 'Escape') {
            dialog.destroy();
        }
    }

    document.addEventListener('keydown', handleKeyPress);

    // 处理图像点击事件
    const imageElements = dialog.element.querySelectorAll(".selectable-image");
    imageElements.forEach(img => {
        img.addEventListener("click", () => {
            const index = parseInt(img.dataset.index);
            dialog.$result = {
                src: img.getAttribute('src'),
                index: index,
                image: images[index]
            };
            dialog.destroy();
        });
    });

    // 处理取消按钮点击事件
    const cancelButton = dialog.element.querySelector(".b3-button--cancel");
    cancelButton.addEventListener("click", () => {
        dialog.destroy();
    });

    return dialog;
}

/**
 * 以Promise方式打开图像选择对话框
 * @param {Object} clientApi 思源API客户端实例
 * @param {string} title 对话框标题
 * @param {Array<{src: string, label: string}>} images 图像列表，每项包含图像路径和标签
 * @param {string} tooltip 提示文本
 * @returns {Promise<{src: string, index: number, image: Object}|undefined>} 返回Promise，解析为选中的图像对象或undefined（取消时）
 */
export function openImagePickerPromise(clientApi, title, images, tooltip) {
    return new Promise((resolve) => {
        openImagePickerDialog(
            clientApi,
            title,
            images,
            tooltip,
            (result) => resolve(result),
            () => resolve(undefined)
        );
    });
}

// 英文别名
export const createImageSelectionDialog = openImagePickerDialog;
export const createImageSelectionPromise = openImagePickerPromise; 