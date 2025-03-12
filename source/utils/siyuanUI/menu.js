import { 创建并打开思源原生菜单 } from "../../../src/toolBox/useAge/forSiyuan/useSiyuanMenu.js";
import { clientApi } from "../../asyncModules.js";

export function 创建点击事件菜单触发函数(前端API){
    const {Menu}= 前端API
    return (菜单名)=>{
        return  (e)=>{
            const menu = new Menu(菜单名)
            document.addEventListener('mousedown', () => { menu.close }, { once: true })
            return {
                open: ()=>{
                    menu.open({ y: event.y || e.detail.y, x: event.x || e.detail.x })
                },
                menu,
            }
        }
    }   
}



export  {向菜单批量添加项目} from "../../../src/toolBox/useAge/forSiyuan/useSiyuanMenu.js"

/**
 * 创建并打开菜单
 * @param {string} menuId - 菜单ID
 * @param {Object} position - 菜单位置
 * @param {Function} menuBuilder - 菜单构建函数
 * @returns {Menu} 菜单实例
 */
export const 创建并打开菜单 = (menuId,position,菜单构建函数)=>{
    return 创建并打开思源原生菜单(clientApi,menuId,position,菜单构建函数)
}

