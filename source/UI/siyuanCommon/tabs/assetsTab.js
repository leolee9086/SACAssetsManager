import { clientApi, plugin } from "../../../asyncModules.js"
const assetsTabID = plugin.name + "AssetsTab"
const app = plugin.app
export const 打开笔记本资源视图 = (box) => {
    clientApi.openTab({
        app: app,
        custom: {
            icon: "iconAssets",
            title: "资源:笔记本",
            data: {
                box
            },
            id: assetsTabID
        },
    })
}
export const 打开标签资源视图 = (tagLabel) => {
    clientApi.openTab({
        app: app,
        custom: {
            icon: "iconAssets",
            title: "资源:标签",
            data: {
                tagLabel
            },
            id: assetsTabID
        },
    })
}
export const 打开本地资源视图 = (localPath) => {
    clientApi.openTab({
        app: app,
        custom: {
            icon: "iconAssets",
            title: "资源:本地",
            data: {
                localPath
            },
            id: assetsTabID
        },
    })
}