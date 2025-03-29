import { clientApi } from "../../../asyncModules.js";
import { initVueApp } from "../../../../src/toolBox/useVue/vueComponentLoader.js";

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
    const dialog = new clientApi.Dialog(
        {
            title: !title ? "TEColors" : title,
            content: `
            <div id="styleEditorPanel" 
                class='fn__flex-column styleEditor'  
                style="pointer-events:auto;z-index:5;max-height:80vh">
            </div>
`,
            width: width || '200px',
            height: height || 'auto',
            transparent: transparent,
            disableClose: transparent,
            disableAnimation: false,
        }
    );
    
    if (data) {
        data.$dialog = dialog;
    }
    
    dialog.element.querySelector(".b3-dialog__close").style.display = 'none';
    transparent ? dialog.element.style.pointerEvents = 'none' : dialog.element.style.pointerEvents = 'auto';
    transparent ? dialog.element.querySelector(".b3-dialog__container").style.pointerEvents = 'auto' : null;
    dialog.element.querySelector(".b3-dialog__header").style.padding = '0px 24px';
    dialog.element.querySelector(".b3-dialog__header").insertAdjacentHTML('afterBegin', 
        `<svg class="cc-dialog__close" style="position:absolute;top:2px;left:2px">
           <use xlink:href="#iconCloseRound"></use>
         </svg>`);
    
    dialog.element.querySelector(".cc-dialog__close").addEventListener('click', () => {
        dialog.destroy();
    });
    
    try {
        const app = await initVueApp(appURL, name, mixinOptions, directory, data);
        
        if (!app || typeof app.mount !== 'function') {
            throw new Error('Vue应用创建失败，无法挂载到对话框');
        }
        
        app.mount(dialog.element.querySelector(".styleEditor"));
        return { app, dialog };
    } catch (error) {
        console.error('初始化Vue对话框失败:', error);
        dialog.destroy();
        throw error;
    }
}