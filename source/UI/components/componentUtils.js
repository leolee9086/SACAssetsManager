import { debounce } from "../../utils/functionTools.js"

// 获取素材文件名
const getAssetNames = (asset) => {
    return asset.path.split('/').pop()
}
const toArray = (value) => {
    return Array.isArray(value) ? value : [value];
}
const 函数工具 = { debounce }
export {
    函数工具,
    getAssetNames,
    toArray
}