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
 * @param {Function} [onDialogCreated] 对话框创建后的回调函数
 * @param {Object} [dialogOptions] 对话框选项
 * @returns {Promise<{app: Vue.App, dialog: Dialog}>} 返回Vue应用和对话框实例
 */
export async function openVueDialog(
    clientApi,
    appURL, 
    name, 
    mixinOptions = {}, 
    onDialogCreated = null,
    dialogOptions = {},
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
        title: dialogOptions.title || title || '对话框',
        content: `
        <div id="vueDialogPanel" 
            class='fn__flex-column vueDialog'  
            style="pointer-events:auto;z-index:5;max-height:80vh">
        </div>
        `,
        width: dialogOptions.width || width,
        height: dialogOptions.height || height,
        transparent: dialogOptions.transparent !== undefined ? dialogOptions.transparent : transparent,
        disableClose: dialogOptions.disableClose !== undefined ? dialogOptions.disableClose : transparent,
        disableAnimation: dialogOptions.disableAnimation || false,
    });
    
    if (!dialog) {
        throw new Error('创建对话框失败，无法继续执行。');
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
        
        // 添加close方法作为destroy的别名，确保API兼容性
        dialog.close = dialog.destroy;
    } catch (error) {
        console.error('对话框DOM操作失败:', error);
        if (dialog.destroy) dialog.destroy();
        throw error;
    }
    
    try {
        // 创建Vue应用
        console.log('调用initVueApp前的mixinOptions:', JSON.stringify(mixinOptions));
        
        // 从mixinOptions中提取需要传递给组件的属性
        const dialogData = {
            ...mixinOptions,
            $dialog: dialog
        };
        
        // 使用正确的方式调用initVueApp
        const app = await initVueApp(
            appURL,    // 组件URL
            name,      // 组件名称
            {},        // 尽量保持mixinOptions简单
            null,      // 目录参数
            dialogData // 通过data参数传递属性，这些会通过provide/inject提供给组件
        );
        
        if (!app || typeof app.mount !== 'function') {
            throw new Error('Vue应用创建失败，无法挂载到对话框');
        }
        
        // 创建简单的事件总线
        app.config.globalProperties.eventBus = {
            emit(event, ...args) {
                console.log('事件总线触发事件:', event, args);
                // 这里可以添加通用的事件处理逻辑
            }
        };
        
        // 挂载应用
        const vueInstance = app.mount(dialog.element.querySelector(".vueDialog"));
        
        // 保存Vue实例到dialog对象
        dialog.vueInstance = vueInstance;
        dialog.app = app;
        
        // 如果提供了回调函数，调用它
        if (typeof onDialogCreated === 'function') {
            onDialogCreated(dialog);
        }
        
        return { app, dialog, vueInstance };
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