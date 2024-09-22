import { clientApi } from "../../../asyncModules.js";
const {Dialog}=clientApi
const openFilePickDialog = (title, images, tootip,confirm=()=>{}, cancel=()=>{}) => {
    const dialog = new Dialog({
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

    <div>${tootip}</div>

</div>
<div class="b3-dialog__action">
    <button class="b3-button b3-button--cancel">${window.siyuan.languages.cancel}</button>
</div>`,
        width:  "520px",
        destroyCallback: () => { 
            dialog.$result?confirm(dialog.$result):cancel(dialog)
            document.removeEventListener('keydown', handleKeyPress);
        }
    });
    document.addEventListener('keydown', handleKeyPress);

    function handleKeyPress(event) {
        const key = parseInt(event.key);
        if (!isNaN(key) && key > 0 && key <= images.length) {
            const selectedImage = dialog.element.querySelector(`.selectable-image[data-index="${key - 1}"]`);
            if (selectedImage) {
                dialog.$result = { src: selectedImage.getAttribute('src'), index: key - 1 };
                dialog.destroy();
            }
        } else if (!isNaN(key)) {
            dialog.destroy();
        }
    }

    const imageElements = dialog.element.querySelectorAll(".selectable-image");
    imageElements.forEach(img => {
        img.addEventListener("click", () => {
            dialog.$result={src:img.getAttribute('src'), index:parseInt(img.dataset.index)}
            dialog.destroy();
        });
    });

    const cancelButton = dialog.element.querySelector(".b3-button--cancel");
    cancelButton.addEventListener("click", () => {
        dialog.destroy();
    });
};
export const filePickPromise=(title,images,tootip)=>{
    return new Promise((resolve, reject) => {
        openFilePickDialog(title,images,tootip,(result)=>{resolve(result)},()=>{resolve(undefined)})
    })
}