/**
 * 用于将思源基于事件的菜单注册方式转换为基于扩展点的菜单注册方式
 * 扩展是插件的插件,由于扩展需要更加声明式和灵活,所以需要将思源的事件注册方式转换为扩展点注册方式
 */
import { 检查思源环境 } from '../../base/useEnv/siyuanEnv.js';

const 全局思源菜单注册点代理 = globalThis[Symbol.for('思源菜单注册点代理')]

/**
 * 初始化全局菜单注册点代理（如果不存在）
 * @returns {Object} 初始化后的菜单注册点代理
 */
export function 初始化菜单注册点代理() {
    if (!globalThis[Symbol.for('思源菜单注册点代理')]) {
        globalThis[Symbol.for('思源菜单注册点代理')] = Object.entries(思源内置事件菜单位置对照表)
            .reduce((acc, [_, value]) => {
                acc[value] = [];
                return acc;
            }, {});
    }
    return globalThis[Symbol.for('思源菜单注册点代理')];
}

/**
 * 获取思源前端API菜单原型,用于之后注册菜单扩展点时创建自定义菜单使用
 * @param {Object} siyuanClientApi 思源客户端API对象
 * @returns {Object} 思源菜单原型
 */
export function 获取思源前端API菜单原型(siyuanClientApi) {
    return siyuanClientApi.Menu;
}

/**
 * 注册菜单扩展点
 * @param {string} 菜单位置 菜单的位置标识
 * @param {Object} 菜单项 要添加的菜单项配置
 * @throws {Error} 如果菜单注册点代理不存在则抛出错误
 */
export function 注册菜单扩展点(菜单位置, 菜单项) {
    if (!全局思源菜单注册点代理) {
        初始化菜单注册点代理();
    }
    全局思源菜单注册点代理[菜单位置].push(菜单项);
}

/**
 * 移除已注册的菜单项
 * @param {string} 菜单位置 菜单的位置标识
 * @param {string} 菜单项ID 要移除的菜单项ID
 * @returns {boolean} 是否成功移除
 */
export function 移除菜单项触发器(菜单位置, 菜单项ID) {
    if (!全局思源菜单注册点代理 || !全局思源菜单注册点代理[菜单位置]) {
        return false;
    }
    
    const 原始长度 = 全局思源菜单注册点代理[菜单位置].length;
    全局思源菜单注册点代理[菜单位置] = 全局思源菜单注册点代理[菜单位置]
        .filter(项 => 项.id !== 菜单项ID);
    
    return 原始长度 !== 全局思源菜单注册点代理[菜单位置].length;
}

/**
 * 创建菜单项配置对象
 * @param {string} id 菜单项唯一标识
 * @param {string} label 菜单项显示文本
 * @param {Function} 点击回调 点击菜单项时的回调函数
 * @param {Object} 附加属性 其他可选配置，如icon、快捷键等
 * @returns {Object} 菜单项配置对象
 */
export function 创建菜单项触发器(id, label, 点击回调, 附加属性 = {}) {
    return {
        id,
        label,
        click: 点击回调,
        ...附加属性
    };
}

/**
 * 批量注册菜单项
 * @param {string} 菜单位置 菜单的位置标识
 * @param {Array} 菜单项数组 要添加的菜单项配置数组
 */
export function 批量注册菜单扩展点(菜单位置, 菜单项数组) {
    菜单项数组.forEach(项 => 注册菜单扩展点(菜单位置, 项));
}

/**
 * 获取所有可用的菜单位置
 * @returns {Array} 菜单位置数组
 */
export function 获取所有菜单位置() {
    return Object.values(思源内置事件菜单位置对照表);
}

// 思源内置事件与菜单位置的对照表
const 思源内置事件菜单位置对照表 = {
    'open-menu-doctree': 'siyuan-doctree',
    'open-menu-blockref': 'siyuan-blockref',
    'open-menu-fileannotationref': 'siyuan-fileannotationref',
    'open-menu-tag': 'siyuan-tag',
    'open-menu-link': 'siyuan-link',
    'open-menu-image': 'siyuan-image',
    'open-menu-av': 'siyuan-av',
    'open-menu-content': 'siyuan-content',
    'open-menu-breadcrumbmore': 'siyuan-breadcrumbmore',
    'open-menu-inbox': 'siyuan-inbox',
    'open-siyuan-url-plugin': 'siyuan-url-plugin',
    'open-siyuan-url-block': 'siyuan-url-block',
    'click-editorcontent': 'siyuan-editorcontent',
    'click-blockicon': 'siyuan-blockicon',
    'click-pdf': 'siyuan-pdf',
    'click-editortitleicon': 'siyuan-editortitleicon',
    'click-backlink': 'siyuan-backlink',
    'click-backlinkitem': 'siyuan-backlinkitem',
    'click-refs': 'siyuan-refs',
    'click-refsitem': 'siyuan-refsitem',
    'click-toc': 'siyuan-toc',
    'click-flashcard': 'siyuan-flashcard',
    'click-item': 'siyuan-item'
};

/**
 * 根据事件名称获取对应的菜单位置
 * @param {string} 事件名称 思源内置事件名称
 * @returns {string|null} 对应的菜单位置，不存在则返回null
 */
export function 获取菜单位置(事件名称) {
    return 思源内置事件菜单位置对照表[事件名称] || null;
}

/**
 * 递归处理菜单项，创建完整的菜单结构
 * @param {Object} 菜单项 原始菜单项配置
 * @returns {Object} 处理后的菜单项
 */
function 递归处理菜单项(菜单项) {
    const 基础菜单项 = {
        id: 菜单项.id,
        label: 菜单项.label,
        icon: 菜单项.icon,
        accelerator: 菜单项.accelerator,
        click: 事件细节 => 菜单项.click?.(事件细节),
    };

    // 处理子菜单
    if (Array.isArray(菜单项.submenu) && 菜单项.submenu.length > 0) {
        基础菜单项.submenu = 菜单项.submenu.map(子项 => 递归处理菜单项(子项));
    }

    // 处理分隔线
    if (菜单项.type === 'separator') {
        基础菜单项.type = 'separator';
    }

    // 处理禁用状态
    if (typeof 菜单项.disabled !== 'undefined') {
        基础菜单项.disabled = 菜单项.disabled;
    }

    return 基础菜单项;
}

/**
 * 使用插件事件总线监听扩展点
 * @param {Object} 插件 思源插件实例
 * @param {string} 事件名称 要监听的事件名称
 * @throws {Error} 如果事件名称不存在或参数无效则抛出错误
 */
export function 使用插件事件总线监听扩展点(插件, 事件名称) {
    // 参数验证
    if (!插件?.eventBus) {
        throw new Error('无效的插件实例');
    }

    const 事件总线 = 插件.eventBus;
    const 菜单位置标记 = 获取菜单位置(事件名称);
    
    if (!菜单位置标记) {
        throw new Error(`事件名称 ${事件名称} 不存在`);
    }

    const 事件监听函数 = (事件细节) => {
        try {
            if (!事件细节?.menu) {
                return;
            }

            // 获取对应的菜单项
            const 匹配菜单项 = 全局思源菜单注册点代理[菜单位置标记]?.find(项 => 项.id === 事件细节.menu.id);
            
            if (匹配菜单项) {
                // 创建完整的菜单项实例
                事件细节.menu = 递归处理菜单项(匹配菜单项);
                
                // 保留原始事件细节中的其他属性
                Object.keys(事件细节.menu).forEach(键 => {
                    if (!(键 in 事件细节.menu)) {
                        事件细节.menu[键] = 事件细节.menu[键];
                    }
                });
            }
        } catch (错误) {
            console.error(`处理菜单事件时出错: ${错误.message}`, 错误);
        }
    };

    // 注册事件监听
    事件总线.on(事件名称, 事件监听函数);
    
    // 返回用于清理的函数
    return () => 事件总线.off(事件名称, 事件监听函数);
}

export function 开始监听所有内部菜单事件(思源插件实例){
    Object.entries(思源内置事件菜单位置对照表).forEach(([事件名称, 菜单位置标记]) => {
        使用插件事件总线监听扩展点(思源插件实例, 事件名称);
    });
}

/**
 * 移除插件事件总线监听
 * @param {Object} 插件 思源插件实例
 * @param {string} 事件名称 要移除监听的事件名称
 * @param {Function} 事件细节 要移除的事件处理函数
 * @returns {boolean} 是否成功移除
 */
export function 移除插件事件总线监听(插件, 事件名称, 事件细节) {
    const 事件总线 = 插件.eventBus;
    const 事件类型 = 思源内置事件菜单位置对照表[事件名称];
    if (!事件类型) {
        return false;
    }
    
    事件总线.off(事件类型, 事件细节);
    return true;
}



/**
 * 用于封装思源的原生菜单为可链式调用
 */
export const 创建链式思源菜单 = (思源原生菜单实例) => {
    // 检查是否在思源环境中
    if (!检查思源环境()) {
        console.warn('当前不在思源环境中，菜单功能可能无法正常工作');
        return null;
    }
    
    return {
        addItem: (菜单项) => {
            思源原生菜单实例.addItem(菜单项)
            return 思源原生菜单实例
        },
        addSeparator: () => {
               思源原生菜单实例.addSeparator()
            return 思源原生菜单实例
        },
     
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
export function 向菜单批量添加项目(menu, menuItems, args = {}) {
   // 检查是否在思源环境中
   if (!检查思源环境()) {
       console.warn('当前不在思源环境中，菜单功能可能无法正常工作');
       return;
   }
   
   menuItems.forEach(item => {
       if (item.separator) {
           menu.addSeparator();
       }
       menu.addItem(item.action(args, ...(item.args || [])));
   });
}

/**
 * 用于创建并打开思源的原生菜单
 */
export const 创建并打开思源原生菜单 = (思源前端API,menuId,position,菜单构建函数)=>{
    // 检查是否在思源环境中
    if (!检查思源环境()) {
        console.warn('当前不在思源环境中，菜单功能可能无法正常工作');
        return null;
    }
    
    const 菜单 = new 思源前端API.Menu(menuId)
    菜单构建函数(菜单)
    菜单.open(position)
    document.addEventListener('mousedown', () => { 菜单.close }, { once: true });
    return 菜单
}

