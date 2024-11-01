import { 打开编辑器面板 } from "../../../tabs/editorTab.js"

export const 打开图片编辑器对话框 = (assets) => {
    const { path } = assets[0]

    return {
        label: `打开图片编辑页签`,
        click: () => {
            打开编辑器面板({
                icon: "iconAssets",
                title: "资源:笔记本",
                data: {
                    type:'local',
                    subtype:'file',
                    meta:{
                        path
                    }
                }
            })
        }
    }
}

export const items = [打开图片编辑器对话框]