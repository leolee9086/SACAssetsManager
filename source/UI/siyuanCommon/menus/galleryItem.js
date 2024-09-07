import { clientApi, plugin } from "../../../asyncModules.js";
import { 解析文件属性数组内部属性显示 } from "../../../data/attributies/parseAttributies.js";
import * as menuItems from "./galleryItemMenu/menuItems.js"
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
    return 模式 && 模式.label + '附件' + (assets.length === 0 ? `` : `(${assets.length})`)
}

export const 打开附件组菜单 = (event, assets, position) => {
    const menu = new clientApi.Menu('sac-galleryitem-menu')
    menu.addItem(
        {
            label: 计算主标签(assets, plugin.附件编辑模式),
            disabled: 'ture',
            type: 'readonly'
        }
    )
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
                {
                    label: "本地文件:复制"
                },
                {
                    label: "编辑"
                },
                {
                    label: "笔记和标签"
                },
                {
                    label: "元数据"
                },
                创建模式菜单(
                    {
                        label: "插件",
                        value: '插件'
                    },
                    event, assets, position

                )
            ]
        }
    )

    if (plugin.附件编辑模式 && plugin.附件编辑模式.value === '插件') {
        menu.addItem(

            menuItems.使用TEColors插件分析图像颜色(assets),

        )
        添加插件菜单内容(menu.assets)
    }
    if (plugin.附件编辑模式 && plugin.附件编辑模式.value === '移动') {
        menu.addSeparator();
        menu.addItem(
            {
                label: '添加至最近笔记本日记(file链接)',
                click: async () => {
                    const fileLinks = assets.map(item => {
                        return {
                            name: item.name,
                            link: `file:///${item.path}`,
                            type: item.type,
                            path: item.path,
                            href: `${thumbnail.genHref(item.type, item.path, 500)}`,
                            fileLink: `file:///${item.path}`
                        }
                    })
                    const markdown = fileLinks.map(link => `[${link.name}](${link.link})\n![](${isImagePath(link.path) ? link.fileLink : link.href})`).join('\n\n')
                    const noteBooks = await kernelApi.sql({
                        //获取最近修改笔记所在的box
                        stmt: `select box from blocks order by updated desc limit 1`
                    })
                    const result = await kernelApi.appendDailyNoteBlock(
                        {
                            data: markdown,
                            dataType: 'markdown',
                            notebook: noteBooks[0].box
                        }
                    )
                }
            }
        )

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
}