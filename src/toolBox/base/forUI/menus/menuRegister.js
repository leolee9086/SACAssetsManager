/**
 * 菜单注册工具模块
 * 
 * 提供用于注册和管理思源笔记菜单项的功能，支持过滤条件和动态菜单项。
 */

/**
 * 注册菜单项到事件总线
 * @param {Object} eventBus 事件总线实例
 * @param {Object} menus 菜单配置对象，键为事件名，值为菜单项数组
 */
export function registerMenus(eventBus, menus) {
    if (!eventBus || typeof eventBus.on !== 'function') {
        console.error('无效的事件总线对象');
        return;
    }

    Object.entries(menus).forEach(([eventName, menuItems]) => {
        eventBus.on(eventName, (event) => {
            // 确保event和detail存在
            if (!event || !event.detail) {
                console.warn(`事件 ${eventName} 的detail不存在`);
                return;
            }

            const ctx = {
                detail: {
                    ...event.detail,
                    data: event.detail.data,
                    menu: event.detail.menu
                }
            };
            
            // 确保菜单对象存在
            if (!ctx.detail.menu || typeof ctx.detail.menu.addItem !== 'function') {
                console.warn(`事件 ${eventName} 的menu对象不存在或无addItem方法`);
                return;
            }
            
            // 处理每个菜单项
            menuItems.forEach(item => {
                // 如果有过滤器且不满足条件则跳过
                if (item.filter && !item.filter(ctx)) {
                    return;
                }
                
                const menuItem = {
                    ...item,
                    click: () => item.click(ctx)
                };
                
                // 添加菜单项
                event.detail.menu.addItem(menuItem);
            });
        });
    });
}

/**
 * 创建带过滤器的菜单项
 * @param {string} label 菜单项标签
 * @param {Function} clickHandler 点击处理函数
 * @param {Function} [filterCondition] 过滤条件函数
 * @param {string} [icon] 菜单项图标
 * @returns {Object} 菜单项对象
 */
export function createMenuItem(label, clickHandler, filterCondition, icon) {
    const menuItem = {
        label,
        click: clickHandler
    };
    
    if (typeof filterCondition === 'function') {
        menuItem.filter = filterCondition;
    }
    
    if (icon) {
        menuItem.icon = icon;
    }
    
    return menuItem;
}

/**
 * 创建子菜单项
 * @param {string} label 子菜单标签
 * @param {Array} subItems 子菜单项数组
 * @param {Function} [filterCondition] 过滤条件函数
 * @param {string} [icon] 菜单项图标
 * @returns {Object} 子菜单项对象
 */
export function createSubMenu(label, subItems, filterCondition, icon) {
    const subMenu = {
        label,
        type: 'submenu',
        submenu: subItems
    };
    
    if (typeof filterCondition === 'function') {
        subMenu.filter = filterCondition;
    }
    
    if (icon) {
        subMenu.icon = icon;
    }
    
    return subMenu;
}

/**
 * 创建分隔线菜单项
 * @param {Function} [filterCondition] 过滤条件函数
 * @returns {Object} 分隔线菜单项对象
 */
export function createSeparator(filterCondition) {
    const separator = {
        type: 'separator'
    };
    
    if (typeof filterCondition === 'function') {
        separator.filter = filterCondition;
    }
    
    return separator;
}

// 英文别名
export const registerMenuItems = registerMenus;
export const createMenuOption = createMenuItem;
export const createSubmenuOption = createSubMenu; 