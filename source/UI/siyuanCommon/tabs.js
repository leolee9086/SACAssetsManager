import { clientApi,plugin } from "../../asyncModules.js";
const {eventBus} = plugin
const {openTab} = clientApi
/**
 * 打开gallery数据
 */
plugin.events.打开附件面板 = 'open-gallery-data'
eventBus.on(
    'open-gallery-data', (event) => {
        openTab({
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
    'click-tag-item', (event) => {
        clientApi.openTab({
            app: app,
            custom: {
                icon: "iconAssets",
                title: "资源",
                data: {
                    tagLabel: event.detail
                },
                id: plugin.name + 'AssetsTab'
            },
            position: 'right'
        })
    }
)

eventBus.on(
    'click-galleryLocalFIleicon',(event)=>{
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
