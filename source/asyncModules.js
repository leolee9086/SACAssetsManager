//import * as jieba from '../static/jieba_rs_wasm.js'
//await jieba.default(import.meta.resolve(`../static/jieba_rs_wasm_bg.wasm`));

import kernelApi from './polyfills/kernelApi.js';
import "./pluginSymbolRegistry.js"
let pluginName  = import.meta.resolve('../').split('/').filter(item=>{return item}).pop()

let clientApiInstance=globalThis[Symbol.for(`clientApi`)]
export {clientApiInstance as clientApi}
export { plugin} from './pluginSymbolRegistry.js'
export {kernelApi as kernelApi}
export const Constants={
    Port_Internal_Path:'/data/public/sacPorts.json',
    Drag_Icon:'/data/plugins/SACAssetsManager/icon.png',
    Drag_Count_Icon:'/temp/sac/imgeWithConut.png'
}
export const resolveWorkspacePath=(path)=>{
    return `${siyuan.config.system.workspaceDir}${path}`
}
