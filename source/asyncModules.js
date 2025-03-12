import kernelApi from './polyfills/KernelApi.js';
import "./pluginSymbolRegistry.js"
let clientApiInstance=globalThis[Symbol.for(`siyuanClientApi`)]
export {clientApiInstance as clientApi}
export { plugin} from './pluginSymbolRegistry.js'
export {kernelApi as kernelApi}
export const Constants={
    Port_Internal_Path:'/data/public/sacPorts.json',
    Drag_Icon:'/data/plugins/SACAssetsManager/icon.png',
    Drag_Count_Icon:'/temp/sac/imgeWithConut.png',
    //瀑布流到表格布局的阈值
    Waterfall_To_Table_Threshold:150
}
export const resolveWorkspacePath=(path)=>{
    return `${siyuan.config.system.workspaceDir}${path}`
}
