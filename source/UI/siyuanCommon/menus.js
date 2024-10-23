import { plugin, clientApi, kernelApi } from '../../asyncModules.js'
import { applyStmt } from '../../data/galleryDefine.js'
import { tabEvents } from './tabs/events.js'
const { eventBus, events, app } = plugin

eventBus.on(
    'click-editortitleicon', (event) => {
        event.detail.menu.addItem({
            label: "打开资源管理视图",
            click: () => {
                eventBus.emit(tabEvents.打开笔记资源视图, event.detail.data.id)
            }
        })
    })
eventBus.on(
    'click-editortitleicon', (event) => {
        event.detail.menu.addItem({
            label: "以资源形式查看所有子文档",
            click: () => {
                let sql = `select * from blocks where path like "%${event.detail.data.id}%" and type='d'`
                打开附件面板(
                    {
                        icon: "iconAssets",
                        title: "资源:sql查询",
                        data: {
                            type: 'sql',
                            stmt: sql
                        },

                    }
                )
            }
        })
    })
eventBus.on(
    'open-menu-doctree', (event) => {
        event.detail.menu.addItem({
            label: "打开附件管理视图",
            click: () => {
                console.log(event)
                let type = event.detail.type
                if (type === 'doc') {
                    let id = event.detail.elements[0].dataset.nodeId
                    eventBus.emit(tabEvents.打开笔记资源视图, id)
                }
                if (type === 'docs') {
                    let ids = Array.from(event.detail.elements).map(element => element.dataset.nodeId)
                    ids.forEach(
                        id => {
                            eventBus.emit(tabEvents.打开笔记资源视图, id)

                        }
                    )
                }
                if (type === 'notebook') {
                    let notebook = event.detail.elements[0].parentElement.dataset.url
                    打开笔记本资源视图(notebook)
                }
            }
        })
        // 新增菜单项：查看所有子文档
        event.detail.menu.addItem({
            label: "以资源形式查看所有子文档",
            click: () => {
                let type = event.detail.type

                if (type === 'doc' || type === 'docs') {

                    let ids = Array.from(event.detail.elements).map(element => element.dataset.nodeId)
                    ids.forEach(id => {
                        let sql = `select * from blocks where path like "%${id}%" and type='d'`
                        打开附件面板(
                            {
                                icon: "iconAssets",
                                title: "资源:sql查询",
                                data: {
                                    type: 'sql',
                                    stmt: sql
                                },
                            }
                        )
                    })
                }
                if (type === 'notebook') {
                    let notebook = event.detail.elements[0].parentElement.dataset.url
                    let sql = `select * from blocks where box like "%${notebook}%" and type='d' limit 1024`
                    打开附件面板(
                        {
                            icon: "iconAssets",
                            title: "资源:sql查询",
                            data: {
                                type: 'sql',
                                stmt: sql
                            },
                        }
                    )

                }

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

import { 打开笔记本资源视图, 打开附件面板 } from './tabs/assetsTab.js'
eventBus.on(
    'click-blockicon', (e) => {
        const { blockElements, menu, protyle } = e.detail
        let sqlBlock = blockElements.filter(
            item => {
                let span = item.querySelector('.protyle-action__language')
                return span && span.textContent === 'sql'
            }
        )
        if (sqlBlock[0]) {
            menu.addItem({
                label: "在assetsManager中打开",
                click() {
                    sqlBlock.forEach(
                        block => 打开附件面板(
                            {
                                icon: "iconAssets",
                                title: "资源:sql查询",
                                data: {
                                    type: 'sql',
                                    stmt: block.querySelector('[contenteditable="true"]').textContent
                                },

                            }
                        )
                    )

                }
            })
        }
    }
)