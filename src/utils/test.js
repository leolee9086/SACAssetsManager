/**
 * 用于临时测试模块
 */



//这个模块被用创建webcomponents
import { createWebComponent } from "./module/vue/webcomponents.js";
import { SFCMenuLoader } from "./module/vue/SFCdsl.js";
import { clientApi } from "../../source/asyncModules.js";


// 创建 loader 实例
const menuLoader = new SFCMenuLoader(clientApi);
// 使用示例
/**
 * 创建并显示上下文菜单
 * @param {string} sfcUrl - Vue单文件组件的URL
 * @param {Object} ctx - 上下文对象，包含菜单需要的数据
 * @param {Event} event - 触发菜单的事件对象
 * @returns {Promise<void>}
 */
async function createContextMenu(sfcUrl, ctx = {}, event) {
    // 阻止默认的上下文菜单
    event?.preventDefault?.();
    
    try {
        // 验证URL
        if (!sfcUrl) {
            throw new Error('菜单模板URL不能为空');
        }

        // 加载并解析 SFC
        const response = await fetch(sfcUrl);
        if (!response.ok) {
            throw new Error(`加载菜单模板失败: ${response.status} ${response.statusText}`);
        }
        
        const sfcContent = await response.text();
        
        // 创建菜单配置，传入上下文
        const menuConfig = await menuLoader.loadSFC(sfcContent, {
            context: ctx,
            // 添加一些通用的上下文数据
            utils: {
                formatDate: (date) => new Date(date).toLocaleDateString(),
                // ... 其他工具函数
            }
        });

        // 创建菜单
        const menu = menuLoader.createMenu(menuConfig);

        // 设置菜单位置
        if (event) {
            const x = event.clientX || event.pageX;
            const y = event.clientY || event.pageY;
            
            // 确保菜单不会超出视窗
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            menu.open({
                x: Math.min(x, viewportWidth - 200), // 假设菜单宽度为200
                y: Math.min(y, viewportHeight - 300)  // 假设菜单最大高度为300
            });
        }

        // 显示菜单

        // 添加自动关闭处理
        const closeHandler = (e) => {
            if (!menu.element?.contains(e.target)) {
                menu.close();
                document.removeEventListener('click', closeHandler);
                document.removeEventListener('contextmenu', closeHandler);
            }
        };

        document.addEventListener('click', closeHandler);
        document.addEventListener('contextmenu', closeHandler);

        // 返回菜单实例，方便外部控制
        return menu;

    } catch (error) {
        console.error('创建菜单失败:', error);
        // 可以选择显示一个提示
        clientApi.showMessage?.({
            type: 'error',
            content: '创建菜单失败: ' + error.message
        });
        throw error;
    }
}

