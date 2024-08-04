import { clientApi,plugin } from "../../asyncModules.js";
import {tabEvents} from './tabs/events.js'
import {打开笔记本资源视图,打开标签资源视图,打开本地资源视图,打开附件面板} from './tabs/assetsTab.js'
export {tabEvents}
const {eventBus} = plugin
/**
 * 打开gallery数据
 */
eventBus.on(
    tabEvents.打开附件面板, (event) => {
        打开附件面板({icon:"iconAssets",title:event.detail.title||"资源",data:event.detail.data},event.detail.options)
    }
)
eventBus.on(
    tabEvents.打开笔记本资源视图, (event) => {
        打开笔记本资源视图(event.detail.data.box)
    }
)
eventBus.on(
    'click-tag-item', (event) => {
        打开标签资源视图(event.detail)
    }
)
eventBus.on(
    'click-galleryLocalFIleicon',(event)=>{
        打开本地资源视图(event.detail)
    }
)

eventBus.on(
    'open-localfoldertab',(event)=>{

        打开本地资源视图(require('path').dirname(event.detail))
    }
)
