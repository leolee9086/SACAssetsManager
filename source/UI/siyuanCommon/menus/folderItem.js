import { clientApi,plugin } from "../../../asyncModules.js"

export const 打开文件夹图标菜单=(event,folderPath,options)=>{
    const {position}=options
    const menu = new clientApi.Menu("sac-folderIcon")
    menu.addSeparator()
    menu.addItem(
        {
            label:`在新标签页中打开文件夹:${folderPath}`,
            click:()=>{
                plugin.eventBus.emit(
                    'click-galleryLocalFIleicon',
                    folderPath,
                )
            }
        }
    )
    menu.addItem(
        {
            label: `在资源管理器中打开文件夹`,
            click: () => {
                const { shell } = window.require('@electron/remote');
                shell.showItemInFolder(folderPath);
                        }
        }
    )
    menu.open(position)
}