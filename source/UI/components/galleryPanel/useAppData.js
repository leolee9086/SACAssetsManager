import { toRef,computed } from "../../../../static/vue.esm-browser.js";
import { plugin } from "../../../pluginSymbolRegistry.js";

export const useAppData = ({data:appData,controller})=>{
    console.error(appData)    
    const appDataRef = toRef(appData)
    const tagLabel = computed(
        appDataRef,()=>{
            return  appDataRef.tagLabel
        }
    )
    const containerID =computed(
        appDataRef,()=>{
            return appDataRef.value.tab?.id
        }
    )

    plugin.eventBus.on('need-refresh-gallery-panel', (e) => {
        const { type, data } = e.detail;
        if (type === 'tag') {
            tagLabel.value ? controller.refresh() : null;
        }
    })
    return {
        appData:appDataRef,
        tagLabel,
        containerID
    }
}
