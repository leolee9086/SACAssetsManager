import { plugin, clientApi, kernelApi } from '../../asyncModules.js'
import { applyStmt } from '../../data/galleryDefine.js'
import { tabEvents } from './tabs/events.js'
import { 打开附件面板 } from './tabs/assetsTab.js'
const { eventBus, events, app } = plugin
const menus = {
    'click-editortitleicon': [
        {
            label: "打开资源管理视图",
            click: (ctx) => {
                eventBus.emit(tabEvents.打开笔记资源视图, ctx.detail.data.id)
            }
        },
        {
            label: "以资源形式查看所有子文档",
            click: (ctx) => {
                let sql = `select * from blocks where path like "%${ctx.detail.data.id}%" and type='d'`
                打开附件面板({
                    icon: "iconAssets",
                    title: "资源:sql查询",
                    data: {
                        type: 'sql',
                        stmt: sql
                    },
                })
            }
        }
    ],
    
    'click-editorcontent': [
        {
            filter: (ctx) => ctx.detail.event.target.tagName === 'IMG',
            click: async (ctx) => {
                const { event } = ctx.detail
                const path = event.target.getAttribute('data-src')
                const assets = await applyStmt({
                    query: `select * from assets where path='${path}'`
                })
                plugin.eventBus.emit('assets-select', assets)
            }
        }
    ],

    'open-menu-tag': [
        {
            label: "打开附件管理视图",
            click: (ctx) => {
                const tagLabel = ctx.detail.element.textContent
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
        },
        {
            label: "列出标签下本地文件",
            click: (ctx) => {
                clientApi.openTab({
                    app: app,
                })
            }
        },
        {
            label: "列出标签下附件",
            click: (ctx) => {
                clientApi.openTab({
                    app: app,
                })
            }
        },
        {
            label: "列出标签下所有文件",
            click: (ctx) => {
                clientApi.openTab({
                    app: app,
                })
            }
        }
    ],

    'click-blockicon': [
        {
            filter: (ctx) => {
                const { blockElements } = ctx.detail
                return blockElements.some(item => {
                    let span = item.querySelector('.protyle-action__language')
                    return span && span.textContent === 'sql'
                })
            },
            label: "在assetsManager中打开sql代码查询结果",
            click: (ctx) => {
                const { blockElements } = ctx.detail
                const sqlBlocks = blockElements.filter(item => {
                    let span = item.querySelector('.protyle-action__language')
                    return span && span.textContent === 'sql'
                })
                sqlBlocks.forEach(block => 
                    打开附件面板({
                        icon: "iconAssets",
                        title: "资源:sql查询",
                        data: {
                            type: 'sql',
                            stmt: block.querySelector('[contenteditable="true"]').textContent
                        },
                    })
                )
            }
        },
        {
            filter: (ctx) => {
                const { blockElements } = ctx.detail
                return blockElements.some(item => 
                    item.getAttribute('data-type') === "NodeBlockQueryEmbed"
                )
            },
            label: "在assetsManager中打开嵌入块",
            click: (ctx) => {
                const { blockElements } = ctx.detail
                const embedBlocks = blockElements.filter(item => 
                    item.getAttribute('data-type') === "NodeBlockQueryEmbed"
                )
                embedBlocks.forEach(block => 
                    打开附件面板({
                        icon: "iconAssets",
                        title: "资源:嵌入块",
                        data: {
                            type: 'sql',
                            stmt: block.getAttribute('data-content')
                        },
                    })
                )
            }
        }
    ]
}

// 修改 registerMenus 函数以支持 filter
function registerMenus(menus) {
    Object.entries(menus).forEach(([eventName, menuItems]) => {
        eventBus.on(eventName, (event) => {
            const ctx = {
                detail: {
                    ...event.detail,
                    data: event.detail.data,
                    menu: event.detail.menu
                }
            }
            
            menuItems.forEach(item => {
                // 如果有 filter 且不满足条件则跳过
                if (item.filter && !item.filter(ctx)) {
                    return
                }
                
                const menuItem = {
                    ...item,
                    click: () => item.click(ctx)
                }
                event.detail.menu.addItem(menuItem)
            })
        })
    })
}

// 注册所有菜单
registerMenus(menus)

// 保留原有的附件相关事件处理
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