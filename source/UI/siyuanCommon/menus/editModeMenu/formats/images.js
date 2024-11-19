import { 打开编辑器面板 } from "../../../tabs/editorTab.js"
import { showHistogramDialog } from "../../../dialog/image/histogram.js"
export const 打开图片编辑器对话框 = (assets) => {
    const { path } = assets[0]

    return {
        label: `打开图片编辑页签(节点式)`,
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

export  function 打开简版图片编辑器(assets) {
        return {
            label: `打开图片编辑页签(编辑面板)`,
            click: () => {
                const imagePath = assets[0]?.path;        

                showHistogramDialog({imagePath});

            }
        }
    
}

export const items = [打开图片编辑器对话框,打开简版图片编辑器]