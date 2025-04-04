import { kernelApi } from "../../asyncModules.js";
import { isSiyuanAssetPath } from "../../../src/utils/pathUtils/checker.js";
export {isSiyuanAssetPath}
/**
 * 清理资产路径中的时间戳和随机字符串
 * 用于从思源的资产路径中提取文件名
 * @param {string|object} asset - 资产路径
 * @returns {string} - 清理后的资产路径
 */
export function cleanAssetPath(asset) {
    let path =asset.path||asset
    if(path&&asset.type==='note'){
        return asset.$meta.content.slice(0,256)
    }
    return path && path.split('/').pop().replace(/-\d{14}-[a-z0-9]{7}/, '');
}

/**
 * 用于判定是否是思源附件文件夹的子路径
 * 思源附件文件夹路径中的标志性部分是'/data/assets'
 * @param {*} path 
 */
export async function isSiyuanAssetLocalPath(path) {
    let workspaces = await kernelApi.getWorkspaces()
    let flag
    for (let i=0;i<workspaces.length;i++){
        let workspacePath = workspaces[i].path.replace(/\\/g,'/')
        if(path && path.startsWith(`${workspacePath}/data/assets/`)){
            flag = true
            break
        }
    }
    return flag
}