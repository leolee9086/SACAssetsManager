import { clientApi,plugin } from "../../../asyncModules.js"
const assetsTabID = plugin.name + "AssetsTab"
const app = plugin.app
export const 打开笔记本资源视图=(box)=>{
    clientApi.openTab({
        app: app,
        custom: {
            icon: "iconAssets",
            title: "资源",
            data: {
                box
            },
            id: assetsTabID
        },
})
}