import { plugin } from "../../../../asyncModules.js";
export const 创建模式菜单 = (模式, event, assets, options) => {
    return {
        label: 模式.label,
        click: () => {
            plugin.附件编辑模式 = 模式
            setTimeout(() =>plugin.打开附件组菜单(event, assets, options), 100)
        }
    }
}
export const 模式切换菜单项=(event,assets,options)=>{
    const result =        {
        label: "切换模式",
        submenu: [
            创建模式菜单({
                label: '移动',
                value: "移动"
            },
                event, assets, options
            ),
            创建模式菜单(
                {
                    label: "插件",
                    value: '插件'
                },
                event, assets, options
            ),
            创建模式菜单(
                {
                    label: "常规",
                    value: '常规'

                },
                event, assets, options
            ),
            创建模式菜单(
                {
                    label: "编辑",
                    value: '编辑'

                },
                event, assets, options
            ),
           
        ]
    }
    options.tab.data.localPath&&result.submenu.push(
            创建模式菜单(
                {
                    label: "批处理(实验性)",
                    value: '批处理'
                },
                event, assets, options
            )
    )
    return result
}
