import { plugin, clientApi } from '../../asyncModules.js'
import * as menuItems from './menuItems.js'
const { eventBus, events, app } = plugin
eventBus.on(events.打开附件, (e) => {
    const assetPath = e.detail
    const { shell } = window.require('@electron/remote');
    shell.openPath(assetPath).then((result) => {
        if (result) {
            console.error('Failed to open asset:', result);
        }
    });
})
eventBus.on(events.打开附件所在路径, (e) => {
    const assetPath = e.detail
    const { shell } = window.require('@electron/remote');
    shell.showItemInFolder(assetPath);
})
eventBus.on(
    'open-gallery-data', (event) => {
        clientApi.openTab({
            app: app,
            custom: {
                icon: "iconAssets",
                title: event.detail.title||"资源",
                data: event.detail.data,
                id: plugin.name + 'AssetsTab'
            },
            position: 'right'
        })
    }
)

eventBus.on(
    'click-galleryboxicon', (event) => {
        clientApi.openTab({
            app: app,
            custom: {
                icon: "iconAssets",
                title: "资源",
                data: {
                    box: event.detail.data.box
                },
                id: plugin.name + 'AssetsTab'
            },
            position: 'right'
        })
    }
)
eventBus.on(
    'click-galleryLocalFIleicon',(event)=>{
        console.log(event.detail)
        clientApi.openTab(
            {
                app:app,
                custom: {
                    icon: "iconAssets",
                    title: "本地文件夹",
                    data: {
                        localPath: event.detail
                    },
                    id: plugin.name + 'AssetsTab'
                },
                position: 'right'
    
            }
        )
    }
)

eventBus.on(
    'open-localfoldertab',(event)=>{
        console.log(event.detail)
        clientApi.openTab(
            {
                app:app,
                custom: {
                    icon: "iconAssets",
                    title: "本地文件夹",
                    data: {
                        localPath: require('path').dirname(event.detail)
                    },
                    id: plugin.name + 'AssetsTab'
                },
                position: 'right'
    
            }
        )
    }
)
eventBus.on(
    'click-editortitleicon', (event) => {
        event.detail.menu.addItem({
            label: "打开附件管理视图",
            click: () => {
                clientApi.openTab({
                    app: app,
                    custom: {
                        icon: "iconAssets",
                        title: "资源",
                        data: {
                            block_id: event.detail.data.id
                        },
                        id: plugin.name + 'AssetsTab'
                    },
                    position: 'right'

                })
            }
        })
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
        menu.addItem(
            {
                label: '打开',
                submenu: [
                    menuItems.打开资源文件所在笔记(e),
                    menuItems.使用默认应用打开附件(e),
                    menuItems.在文件管理器打开附件(e),
                    menuItems.在新页签打开文件所在路径(e),
                    menuItems.使用TEColors插件分析图像颜色(e)
                ]
            },
        )
        menu.addSeparator();
        menu.addItem(
            {
                label: '添加至',
                submenu: [
                    {
                        label: "最近笔记"
                    }, {
                        label: "日记"
                    }
                ]
            },
        )
        eventBus.emit(
            'contextmenu-galleryitem', { event, assets, menu }
        )
        menu.open({ y: event.y, x: event.x })
        document.addEventListener('mousedown', () => { menu.close }, { once: true })
    }
)
