/**
 * @fileoverview 已弃用 - 思源菜单工具
 * @deprecated 请直接从toolBox导入函数：
 * - 创建并打开思源原生菜单: src/toolBox/useAge/forSiyuan/useSiyuanMenu.js
 * - 向菜单批量添加项目: src/toolBox/useAge/forSiyuan/useSiyuanMenu.js
 * - 或使用集中API: src/toolBox/useAge/useSiyuan.js 中的 ui.创建菜单
 */

// 从新路径导入函数
import { 创建并打开思源原生菜单, 向菜单批量添加项目 } from "../../../src/toolBox/useAge/forSiyuan/useSiyuanMenu.js";
import { 检查思源环境 } from "../../../src/toolBox/base/useEnv/siyuanEnv.js";
import { clientApi } from "../../../source/asyncModules.js";

/**
 * 创建点击事件菜单触发函数
 * @deprecated 请使用集中API中的ui.创建菜单
 * @param {Object} 前端API - 思源前端API
 * @returns {Function} 菜单触发函数
 */
export function 创建点击事件菜单触发函数(前端API) {
    const {Menu} = 前端API;
    return (菜单名) => {
        return (e) => {
            const menu = new Menu(菜单名);
            document.addEventListener('mousedown', () => { menu.close }, { once: true });
            return {
                open: () => {
                    menu.open({ y: event.y || e.detail.y, x: event.x || e.detail.x });
                },
                menu,
            };
        };
    };   
}

// 重新导出
export { 向菜单批量添加项目 };

/**
 * 创建并打开菜单
 * @deprecated 请使用ui.创建菜单
 * @param {string} menuId - 菜单ID
 * @param {Object} position - 菜单位置
 * @param {Function} menuBuilder - 菜单构建函数
 * @returns {Menu} 菜单实例
 */
export const 创建并打开菜单 = (menuId, position, 菜单构建函数) => {
    return 创建并打开思源原生菜单(clientApi, menuId, position, 菜单构建函数);
};

// 此文件已弃用，请直接从toolBox导入相应函数
console.warn('siyuanUI/menu.js 已弃用，请直接从 src/toolBox/useAge 导入相应函数');

