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



/**
 * 通用菜单构建函数
 * @param {Menu} menu - 菜单对象
 * @param {Array<{
 *   action: Function,
 *   separator?: boolean,
 *   args?: Array<any>
 * }>} menuItems - 菜单项配置数组
 * @param {Object} args - 传递给菜单项action的参数
 */
export function 构建菜单(menu, menuItems, args = {}) {
    menuItems.forEach(item => {
        if (item.separator) {
            menu.addSeparator();
        }
        menu.addItem(item.action(args, ...(item.args || [])));
    });
}


/**
 * 创建并打开菜单
 * @param {string} menuId - 菜单ID
 * @param {Object} position - 菜单位置
 * @param {Function} menuBuilder - 菜单构建函数
 * @returns {Menu} 菜单实例
 */
export function 创建并打开菜单(menuId, position, menuBuilder) {
    const menu = new clientApi.Menu(menuId);
    menuBuilder(menu);
    menu.open(position);
    document.addEventListener('mousedown', () => { menu.close }, { once: true });
    return menu;
}