import { debounce } from "../../utils/functionTools.js"
import { findTagsByFilePath,removeFilesFromTag } from "../../data/tags.js"
import { rgba数组转字符串, rgb数组转字符串 } from "../../utils/color/convert.js"
import { 获取素材属性值,计算素材类型角标 } from "../../data/attributies/parseAttributies.js"
// 获取素材文件名
const getAssetNames = (asset) => {
    return asset.path.split('/').pop()
}
const toArray = (value) => {
    return Array.isArray(value) ? value : [value];
}
const 函数工具 = { debounce }
const 色彩工具 = {rgba数组转字符串,rgb数组转字符串}
const 素材条目管理工具 ={
    获取素材属性值,
    计算素材类型角标
}
/**
 * 计算标签计数
 * @param {Array} fileTags 文件标签数组
 * @returns {Object} 标签计数对象
 */
export function 计算标签文件数量(fileTags) {
    const counts = {}
    fileTags.forEach(file => {
        file.tags.forEach(tag => {
            counts[tag] = (counts[tag] || 0) + 1
        })
    })
    return counts
}

export {
    函数工具,
    色彩工具,
    素材条目管理工具 ,
    getAssetNames,
    toArray
}