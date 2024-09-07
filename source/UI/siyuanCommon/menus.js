import { plugin, clientApi, kernelApi } from '../../asyncModules.js'
import { applyStmt } from '../../data/galleryDefine.js'
import * as menuItems from './menuItems.js'
import { tabEvents } from './tabs/events.js'
import { thumbnail } from '../../server/endPoints.js'
import { imageExtensions } from '../../server/processors/thumbnail/utils/lists.js'
const { eventBus, events, app } = plugin
function isImagePath(path) {
    return imageExtensions.includes(path.split('.').pop())
}
eventBus.on(
    'click-editortitleicon', (event) => {
        event.detail.menu.addItem({
            label: "打开附件管理视图",
            click: () => {
                eventBus.emit(tabEvents.打开笔记资源视图, event.detail.data.id)
            }
        })
    })

/**
 * 点击笔记内容中的图片
 */
eventBus.on('click-editorcontent', async (e) => {
    const { protyle, event } = e.detail
    if (event.target.tagName === 'IMG') {
        const span = event.target.parentElement.parentElement
        const path = event.target.getAttribute('data-src')
        const assets = await applyStmt({
            query: `select * from assets where path='${path}'`
        })
        plugin.eventBus.emit('assets-select', assets)
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
eventBus.on('open-menu-tag', (event) => {
    const tagLabel = event.detail.element.textContent
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

import { 打开附件组菜单 } from './menus/galleryItem.js'
eventBus.on(
    'rightclick-galleryitem', (e) => {
        const { event, assets } = e.detail
        打开附件组菜单(event,assets,{ y: event.y || e.detail.y, x: event.x || e.detail.x })
    }
)
