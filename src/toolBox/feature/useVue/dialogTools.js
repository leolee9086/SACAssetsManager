/**
 * Vue对话框工具模块
 * 
 * 提供用于创建和管理基于Vue组件的对话框功能。
 * 这些工具简化了在插件中使用Vue组件作为对话框内容的过程。
 */

import { initVueApp } from './vueComponentLoader.js';

/**
 * 打开包含Vue组件的对话框
 * @param {Object} clientApi 思源API客户端实例
 * @param {string} appURL 组件路径
 * @param {string} name 组件名称
 * @param {Object} [mixinOptions={}] 混入选项
 * @param {string} [directory=null] 目录
 * @param {Object} [data={}] 组件数据
 * @param {string} [title=''] 对话框标题
 * @param {string} [width='200px'] 对话框宽度
 * @param {string} [height='auto'] 对话框高度
 * @param {boolean} [transparent=true] 是否透明背景
 * @returns {Promise<{app: Vue.App, dialog: Dialog}>} 返回Vue应用和对话框实例
 */
export async function openVueDialog(
    clientApi,
    appURL, 
    name, 
    mixinOptions = {}, 
    directory = null, 
    data = {}, 
    title = '', 
    width = '200px', 
    height = 'auto', 
    transparent = true
) {
    // 检查clientApi是否存在及是否有Dialog方法
    if (!clientApi || !clientApi.Dialog) {
        throw new Error('思源API未正确加载，无法创建对话框。可能是异步模块尚未加载完成。');
    }
    
    const dialog = new clientApi.Dialog({
        title: title || '对话框',
        content: `
        <div id="vueDialogPanel" 
            class='fn__flex-column vueDialog'  
            style="pointer-events:auto;z-index:5;max-height:80vh">
        </div>
        `,
        width: width,
        height: height,
        transparent: transparent,
        disableClose: transparent,
        disableAnimation: false,
    });
    
    if (!dialog) {
        throw new Error('创建对话框失败，无法继续执行。');
    }
    
    if (data) {
        data.$dialog = dialog;
    }
    
    try {
        dialog.element.querySelector(".b3-dialog__close").style.display = 'none';
        
        if (transparent) {
            dialog.element.style.pointerEvents = 'none';
            dialog.element.querySelector(".b3-dialog__container").style.pointerEvents = 'auto';
        }
        
        dialog.element.querySelector(".b3-dialog__header").style.padding = '0px 24px';
        dialog.element.querySelector(".b3-dialog__header").insertAdjacentHTML('afterBegin', 
            `<svg class="cc-dialog__close" style="position:absolute;top:2px;left:2px">
                <use xlink:href="#iconCloseRound"></use>
            </svg>`
        );
        
        dialog.element.querySelector(".cc-dialog__close").addEventListener('click', () => {
            dialog.destroy();
        });
    } catch (error) {
        console.error('对话框DOM操作失败:', error);
        if (dialog.destroy) dialog.destroy();
        throw error;
    }
    
    try {
        const app = await initVueApp(appURL, name, mixinOptions, directory, data);
        
        if (!app || typeof app.mount !== 'function') {
            throw new Error('Vue应用创建失败，无法挂载到对话框');
        }
        
        app.mount(dialog.element.querySelector(".vueDialog"));
        return { app, dialog };
    } catch (error) {
        console.error('初始化Vue对话框失败:', error);
        if (dialog.destroy) dialog.destroy();
        throw error;
    }
}

/**
 * 创建任务对话框
 * @param {Object} clientApi 思源API客户端实例
 * @param {string} taskVueComponentPath 任务组件路径
 * @param {Object} taskController 任务控制器实例
 * @param {string} [taskTitle='批处理'] 任务标题
 * @param {string} [taskDescription='任务执行中'] 任务描述
 * @param {string} [width='70vw'] 对话框宽度
 * @param {string} [height='auto'] 对话框高度
 * @returns {Promise<{app: Vue.App, dialog: Dialog}>} 返回Vue应用和对话框实例
 */
export async function openTaskDialog(
    clientApi,
    taskVueComponentPath,
    taskController,
    taskTitle = '批处理',
    taskDescription = '任务执行中',
    width = '70vw',
    height = 'auto'
) {
    try {
        const { app, dialog } = await openVueDialog(
            clientApi,
            taskVueComponentPath,
            'TaskDialog',
            {},
            null,
            {
                taskTitle,
                taskDescription,
                taskController
            },
            taskTitle,
            width,
            height
        );
        
        // 设置destroyCallback
        if (dialog) {
            dialog.destroyCallback = () => {
                taskController.destroy();
            };
        }
        
        return { app, dialog, taskController };
    } catch (error) {
        console.error('打开任务对话框失败:', error);
        throw error;
    }
}

// 英文别名
export const openVueDialogWithComponent = openVueDialog;
export const openTaskProgressDialog = openTaskDialog; 