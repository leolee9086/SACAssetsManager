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
export const 使用TEColors插件分析图像颜色 = (e)=>{
    return {
        label:"使用TEColors插件分析图像颜色",
        click:()=>{
            const { assets } = e.detail 
            assets.forEach(asset=>{
                const image = new Image()
                const serverHost=`${window.location.protocol}//${window.location.hostname}:${plugin.http服务端口号}`
                image.src = `${serverHost}/thumbnail/?localPath=${encodeURIComponent(asset.path)}`
                image.onload=()=>{
                    siyuan.ws.app.plugins.forEach(
                        item=>{
                            item.eventBus.emit(
                                'open-imageColors-palatte',
                                image
                            )
                        }
                    )
        
                }
    
            })
        }
    }
}