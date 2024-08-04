import { clientApi,plugin } from "../../asyncModules.js";
import {tabEvents} from './tabs/events.js'
export {tabEvents}
const {eventBus} = plugin
const {openTab} = clientApi
/**
 * 打开gallery数据
 */
const assetsTabID=plugin.name+'AssetsTab'
const {app}=plugin
eventBus.on(
    tabEvents.打开附件面板, (event) => {
        openTab({
            app: app,
            custom: {
                icon: "iconAssets",
                title: event.detail.title||"资源",
                data: event.detail.data,
                id: assetsTabID
            },
            position: 'right'
        })
    }
)
eventBus.on(
    tabEvents.打开笔记本资源视图, (event) => {
        clientApi.openTab({
            app: app,
            custom: {
                icon: "iconAssets",
                title: "资源",
                data: {
                    box: event.detail.data.box
                },
            },
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
                id: assetsTabID
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
                    id: assetsTabID
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
                    id: assetsTabID
                },
                position: 'right'
    
            }
        )
    }
)
