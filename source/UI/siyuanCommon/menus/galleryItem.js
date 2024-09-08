import { clientApi, plugin, kernelApi } from "../../../asyncModules.js";
import { 解析文件属性数组内部属性显示 } from "../../../data/attributies/parseAttributies.js";
import * as menuItems from "./galleryItemMenu/menuItems.js"
import * as 文件移动菜单组 from "./galleryItemMenu/fileMoveMenuItems.js"
const { eventBus } = plugin
const 创建模式菜单 = (模式, event, assets, position) => {
    return {
        label: 模式.label,
        click: () => {
            plugin.附件编辑模式 = 模式
            setTimeout(() => 打开附件组菜单(event, assets, position), 100)
        }
    }
}

function 计算主标签(assets, 模式) {
    if (模式 && 模式.label) {
        return 模式 && 模式.label + ':' + '附件' + (assets.length === 0 ? `` : `(${assets.length})`)
    } else {
        return '附件' + (assets.length === 0 ? `` : `(${assets.length})`)
    }
}

export const 打开附件组菜单 = (event, assets, position) => {
    plugin.附件编辑模式=plugin.附件编辑模式||{
        label:'常规',
        value:"常规"
    }
    const menu = new clientApi.Menu('sac-galleryitem-menu')
    menu.addItem(
        {
            label: 计算主标签(assets, plugin.附件编辑模式),
            disabled: 'true',
            type: 'readonly'
        }
    )
    menu.addSeparator()
    menu.addItem(
        {
            label: "切换模式",
            submenu: [
                创建模式菜单({
                    label: '移动',
                    value: "移动"
                },
                    event, assets, position
                ),
                创建模式菜单(
                    {
                        label: "插件",
                        value: '插件'
                    },
                    event, assets, position
                ),
                创建模式菜单(
                    {
                        label: "常规",
                        value: '常规'

                    },
                    event, assets, position
                ),
                创建模式菜单(
                    {
                        label: "编辑",
                        value: '编辑'

                    },
                    event, assets, position
                )

            ]
        }
    )

    if (plugin.附件编辑模式 && plugin.附件编辑模式.value === '插件') {
        menu.addSeparator();

        menu.addItem(

            menuItems.使用TEColors插件分析图像颜色(assets),

        )
        添加插件菜单内容(menu.assets)
    }
    if (plugin.附件编辑模式 && plugin.附件编辑模式.value === '移动') {
        menu.addSeparator();
        menu.addItem(文件移动菜单组.以file链接形式添加到最近笔记本日记(assets))
        menu.addItem(文件移动菜单组.移动到回收站(assets))
        menu.addItem(文件移动菜单组.移动到目录(assets,'D:/',event))
    }
    添加通用菜单内容(menu, assets)
    添加只读菜单内容(menu, assets)
    eventBus.emit(
        'contextmenu-galleryitem', { event, assets, menu, mode: plugin.附件编辑模式 }
    )
    menu.open(position)
    document.addEventListener('mousedown', () => { menu.close }, { once: true })
}
function 添加只读菜单内容(menu, assets) {
    menu.addItem({
        label: `创建时间:${解析文件属性数组内部属性显示('ctimeMs', assets)}`,
        disabled: 'ture',
        type: 'readonly'
    })

}
function 添加插件菜单内容(menu, assets) {
    /**
     * 创建一个下级菜单
     */
    const 插件菜单代理 = {
        items: [],
        addItem(menuItem) {
            this.items.push(menuItem)
        },
        addSeparator: () => {
            menu.addSeparator()
        }
    }
    const plugins = siyuan.ws.app.plugins
    plugins.forEach(
        plugin => {
            try {
                plugin.eventBus.emit(
                    'assets-item-clicked', {
                    menu, assets
                }
                )
            } catch (e) {
                console.warn(e)
            }
        }
    )
    if (插件菜单代理.items.length) {
        menu.addSeparator()
        插件菜单代理.items.forEach(
            menuItem => {
                try {
                    menu.addItem(menuItem)
                } catch (e) {
                    console.warn(e)
                }
            }
        )
        menu.addSeparator()
    }
}


/**
 * 常规菜单内容
 * @param {*} menu 
 * @param {*} assets 
 */
function 添加通用菜单内容(menu, assets) {
    //常规模式下展开所有常规菜单
    if ((plugin.附件编辑模式.value==='常规')) {
        menu.addSeparator();
        menu.addItem(menuItems.打开资源文件所在笔记(assets))
        menu.addItem(menuItems.使用默认应用打开附件(assets))
        menu.addItem(menuItems.在文件管理器打开附件(assets))
        menu.addItem(menuItems.在新页签打开文件所在路径(assets))
        menu.addSeparator();
        menu.addItem(menuItems.复制文件地址(assets))
        menu.addItem(menuItems.复制文件链接(assets))
        menu.addItem(menuItems.复制文件缩略图地址(assets))
        menu.addItem(menuItems.上传到assets并复制链接(assets))
        menu.addSeparator();
    } else {
        //否则收缩到子菜单项目
        menu.addSeparator();
        const 附件打开菜单组 = [
            menuItems.打开资源文件所在笔记(assets),
            menuItems.使用默认应用打开附件(assets),
            menuItems.在文件管理器打开附件(assets),
            menuItems.在新页签打开文件所在路径(assets),
        ]
        menu.addItem(
            {
                label: "打开",
                submenu: 附件打开菜单组
            }
        )
        menu.addSeparator();
        const 附件复制菜单组 = [
            menuItems.复制文件地址(assets),
            menuItems.复制文件链接(assets),
            menuItems.复制文件缩略图地址(assets),
            menuItems.上传到assets并复制链接(assets),
        ]
        menu.addItem(
            {
                label: "复制",
                submenu: 附件复制菜单组
            }
        )

    }
}