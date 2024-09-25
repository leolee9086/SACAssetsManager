import { clientApi, plugin } from "../../../asyncModules.js"
const assetsTabID = plugin.name + "AssetsTab"
const app = plugin.app
export  const 打开附件面板 = (custom,options={}) => {
    clientApi.openTab({
        app: app,
        custom: { ...custom, id: assetsTabID },
        ...options
    })
}
export const 打开笔记本资源视图 = (box) => {
    打开附件面板({
        icon: "iconAssets",
        title: "资源:笔记本",
        data: {
            box
        },
    })
}
export const 打开笔记资源视图 = (block_id) => {
    console.log(block_id)
    打开附件面板({
        icon: "iconAssets",
        title: "资源:笔记",
        data: {
            block_id
        },
    })
}
export const 打开标签资源视图 = (tagLabel) => {
    打开附件面板({
        icon: "iconAssets",
        title: "资源:标签",
        data: {
            tagLabel
        },
    })

}
export const 打开本地资源视图 = (localPath) => {
    if(!localPath.endsWith('/')){
        localPath+='/'
    }
    /**
     * plugin的最近打开文件列表是一个set
     */
    plugin.最近打开本地文件夹列表.add(localPath)
    打开附件面板({
        icon: "iconAssets",
        title: "资源:本地",
        data: {
            localPath
        },
    })
}
export const 打开efu文件视图页签 = (efuPath) => {
    efuPath=efuPath.replace(/\\/g,'/')
    console.log(efuPath)
    /**
     * plugin的最近打开文件列表是一个set
     */
    打开附件面板({
        icon: "iconAssets",
        title: "资源:efu文件列表",
        data: {
            efuPath
        },
    })
}
export const 打开颜色资源视图 = (color) => {

    打开附件面板({
        icon: "iconAssets",
        title: "资源:本地",
        data: {
            color
        },
    })
}
