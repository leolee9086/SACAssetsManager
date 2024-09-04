import { plugin, clientApi, kernelApi } from '../../asyncModules.js'
import { applyStmt } from '../../data/galleryDefine.js'
import * as menuItems from './menuItems.js'
import { tabEvents } from './tabs/events.js'
import { thumbnail } from '../../server/endPoints.js'
import { imageExtensions } from '../../server/processors/thumbnail/utils/lists.js'
const { eventBus, events, app } = plugin
function isImagePath(path){
    return imageExtensions.includes(path.split('.').pop())
}
eventBus.on(
    'click-editortitleicon', (event) => {
        event.detail.menu.addItem({
            label: "打开附件管理视图",
            click: () => {
                eventBus.emit(tabEvents.打开笔记资源视图,event.detail.data.id)
            }
        })
    })

/**
 * 点击笔记内容中的图片
 */
eventBus.on('click-editorcontent',async(e)=>{
    const {protyle,event} = e.detail
    if(event.target.tagName==='IMG'){
        const span = event.target.parentElement.parentElement
        const path = event.target.getAttribute('data-src')
        const assets =await applyStmt({
            query:`select * from assets where path='${path}'`
        })
        plugin.eventBus.emit('assets-select',assets)
    }
})
/**
 * 打开附件
 */
eventBus.on(events.打开附件, (e) => {
    const assetPath = e.detail
    const { shell } = window.require('@electron/remote');
    shell.openPath(assetPath).then((result) => {
        if (result) {
            console.error('Failed to open asset:', result);
        }
    });
})
/**
 * 打开附件所在路径
 */
eventBus.on(events.打开附件所在路径, (e) => {
    const assetPath = e.detail
    const { shell } = window.require('@electron/remote');
    shell.showItemInFolder(assetPath);
})

/**
 * 打开菜单标签
 */
eventBus.on('open-menu-tag',(event)=>{
    const tagLabel=event.detail.element.textContent
    event.detail.menu.addItem({
        label: "打开附件管理视图",
        click: () => {
            clientApi.openTab({
                app: app,
                custom: {
                    icon: "iconAssets",
                    title: tagLabel,
                    data: {
                        tagLabel: tagLabel.trim()
                    },
                    id: plugin.name + 'AssetsTab'
                },
            })
        }
    })
    event.detail.menu.addItem(
        {
            label: "列出标签下本地文件",
            click: () => {
                clientApi.openTab({
                    app: app,
                })
            }
        }
    )
    event.detail.menu.addItem(
        {
            label: "列出标签下附件",
            click: () => {
                clientApi.openTab({
                    app: app,
                })
            }
        }
    )
    event.detail.menu.addItem(
        {
            label: "列出标签下所有文件",
            click: () => {
                clientApi.openTab({
                    app: app,
                })
            }
        }
    )
})

eventBus.on(
    'rightclick-galleryitem', (e) => {
        const { event, assets } = e.detail
        const menu = new clientApi.Menu('sac-galleryitem-menu')
        menu.addItem(
            {
                label: '附件' + (assets.length === 0 ? `` : `(${assets.length})`),
                disabled: 'ture',
                type: 'readonly'
            }
        )
        menu.addSeparator();
        menu.addItem(menuItems.打开资源文件所在笔记(e))
        menu.addItem(menuItems.使用默认应用打开附件(e))
        menu.addItem(menuItems.在文件管理器打开附件(e))
        menu.addItem(menuItems.在新页签打开文件所在路径(e))
        menu.addSeparator();
        menu.addItem(menuItems.复制文件地址(e))
        menu.addItem(menuItems.复制文件链接(e))
        menu.addItem(menuItems.复制文件缩略图地址(e))
        menu.addItem(menuItems.上传到assets并复制链接(e))
        menu.addSeparator();
        menu.addItem(
            {
                label: '添加至',
                submenu: [
                    {
                        label: "最近笔记"
                    }, {
                        label: "日记(file链接)",
                        click:async()=>{
                            const fileLinks = assets.map(item=>{return{
                                name:item.name,
                                link: `file:///${item.path}`,
                                type:item.type,
                                path:item.path,
                                href:`${thumbnail.genHref(item.type, item.path, 500)}`,
                                fileLink:`file:///${item.path}`
                            }})     
                            const markdown = fileLinks.map(link=>`[${link.name}](${link.link})\n![](${isImagePath(link.path)?link.fileLink:link.href})`).join('\n\n')
                            const noteBooks = await kernelApi.sql({
                                //获取最近修改笔记所在的box
                                stmt:`select box from blocks order by updated desc limit 1`
                            })
                            const result = await kernelApi.appendDailyNoteBlock(
                                {
                                    data:markdown,
                                    dataType:'markdown',
                                    notebook:noteBooks[0].box
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
                submenu:[
                    menuItems.使用TEColors插件分析图像颜色(e),
                ]
            }
        )
        eventBus.emit(
            'contextmenu-galleryitem', { event, assets, menu }
        )
        menu.open({ y: event.y||e.detail.y, x: event.x||e.detail.x })
        document.addEventListener('mousedown', () => { menu.close }, { once: true })
    }
)
