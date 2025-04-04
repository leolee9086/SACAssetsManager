import { plugin } from "../../../pluginSymbolRegistry.js"
import { requirePluginDeps } from "../requireDeps.js"

export const 加载裸模块=async(name)=>{
    const module=  import(`/plugins/${plugin.name}/static/${name.js}`)
    if(module){
        return await module

    }
    const cjsModule = requirePluginDeps(name)
    return cjsModule
}