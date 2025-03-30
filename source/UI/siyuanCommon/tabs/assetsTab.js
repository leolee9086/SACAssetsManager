/**
 * 兼容层 - 旧版本引用路径保持不变
 * 
 * @deprecated 请直接使用 src/toolBox/useAge/forSiyuan/useSiyuanTab.js
 */

import { clientApi, plugin } from "../../../asyncModules.js"

// 导入新的实现
import * as TabTools from "../../../../src/toolBox/useAge/forSiyuan/useSiyuanTab.js"

console.warn('弃用警告: 直接从 source/UI/siyuanCommon/tabs/assetsTab.js 导入已弃用，请使用 src/toolBox/useAge/forSiyuan/useSiyuanTab.js')

const assetsTabID = plugin.name + "AssetsTab"
const app = plugin.app

// 保持兼容
export const 打开附件面板 = (custom,options={}) => {
    return TabTools.打开附件面板(custom, options, plugin)
}
export const 打开笔记本资源视图 = (box) => {
    return TabTools.打开笔记本资源视图(box, plugin)
}
export const 打开笔记资源视图 = (block_id) => {
    return TabTools.打开笔记资源视图(block_id, plugin)
}
export const 打开标签资源视图 = (tagLabel) => {
    return TabTools.打开标签资源视图(tagLabel, plugin)
}
export const 打开本地资源视图 = (localPath) => {
    return TabTools.打开本地资源视图(localPath, plugin)
}
export const 打开efu文件视图页签 = (efuPath) => {
    return TabTools.打开efu文件视图页签(efuPath, plugin)
}
export const 打开颜色资源视图 = (color) => {
    return TabTools.打开颜色资源视图(color, plugin)
}
export const 打开everything搜索面板 = (everythingApiLocation) => {
    return TabTools.打开everything搜索面板(everythingApiLocation, plugin)
}
export const 打开anytxt搜索面板 = (anytxtApiLocation) => {
    return TabTools.打开anytxt搜索面板(anytxtApiLocation, plugin)
}
