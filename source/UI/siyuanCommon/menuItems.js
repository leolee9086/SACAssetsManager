import { plugin, clientApi } from '../../asyncModules.js'
export const 打开资源文件所在笔记 = (e) => {
    return {
        label: "所在笔记",
        click: () => {
            const { assets } = e.detail
            assets.forEach(asset => {
                clientApi.openTab(
                    {
                        app: plugin.app,
                        doc: {
                            id: asset.block_id,
                            action: "cb-get-focus"
                        }
                    }
                )

            });
        }
    }
}
export const 使用默认应用打开附件 = (e) => {
    return {
        label: "使用默认应用打开",
        click: () => {
            const { assets } = e.detail
            assets.forEach(asset => {
                plugin.eventBus.emit(
                    plugin.events.打开附件,
                    asset.path
                )
            });
        }
    }
}
export const 在文件管理器打开附件 = (e) => {
    return {
        label: "在资源管理器打开所在路径",
        click: () => {
            const { assets } = e.detail
            assets.forEach(asset => {
                plugin.eventBus.emit(
                    plugin.events.打开附件所在路径,
                    asset.path
                )
            });
        }
    }
}

export const 在新页签打开文件所在路径 = (e) => {
    return {
        label: "在新页签打开文件所在路径",
        click: () => {
            const { assets } = e.detail
            assets.forEach(asset => {
                if(asset.type==='local'){
                    plugin.eventBus.emit(
                        'open-localfoldertab',
                        asset.path
                    )
                    return
                }
                plugin.eventBus.emit(
                    'open-localfoldertab',
                    siyuan.config.system.workspaceDir + '\\data\\' + asset.path
                )
            });
        }
    }
}