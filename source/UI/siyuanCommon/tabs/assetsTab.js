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
    打开附件面板({
        icon: "iconAssets",
        title: "资源:本地",
        data: {
            localPath
        },
    })
}