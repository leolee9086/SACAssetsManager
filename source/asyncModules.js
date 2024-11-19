//import * as jieba from '../static/jieba_rs_wasm.js'
//await jieba.default(import.meta.resolve(`../static/jieba_rs_wasm_bg.wasm`));
import kernelApi from './polyfills/KernelApi.js';
import "./pluginSymbolRegistry.js"
let clientApiInstance=globalThis[Symbol.for(`clientApi`)]
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
/**
 * 测试用代码,发布前记得删除
 */
import './utils/image/histogram.js'