import { clientApi,plugin } from "../../../asyncModules.js";
import * as menuItems from "../menuItems.js"
const {eventBus}=plugin
export const 打开附件组菜单=(event,assets,position)=>{
    const menu = new clientApi.Menu('sac-galleryitem-menu')
    menu.addItem(
        {
            label: '附件' + (assets.length === 0 ? `` : `(${assets.length})`),
            disabled: 'ture',
            type: 'readonly'
        }
    )
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
    menu.addItem(
        {
            label: '添加至',
            submenu: [
                {
                    label: "最近笔记"
                }, {
                    label: "日记(file链接)",
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
            ]
        },
    )
    menu.addSeparator();
    menu.addItem(
        {
            label: "插件",
            submenu: [
                menuItems.使用TEColors插件分析图像颜色(assets),
            ]
        }
    )
    eventBus.emit(
        'contextmenu-galleryitem', { event, assets, menu }
    )
    menu.open(position)
    document.addEventListener('mousedown', () => { menu.close }, { once: true })
}