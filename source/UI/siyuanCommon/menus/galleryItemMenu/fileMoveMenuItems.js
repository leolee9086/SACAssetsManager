import { kernelApi, clientApi, plugin } from "../../../../asyncModules.js"
import { metaRecords, thumbnail } from "../../../../server/endPoints.js";
import { isImagePath } from "../../../../utils/fs/pathType.js";
import { processFilesFrontEnd } from "../../../../utils/fs/processFrontEnd.js";
import { confirmAsPromise } from '../../../../utils/siyuanUI/confirm.js'

export const 以file链接形式添加到最近笔记本日记 = (assets) => {
    return {
        label: '添加至最近笔记本日记(file链接)',
        click: async () => {
            const fileLinks = assets.map(item => {
                return {
                    name: item.name,
                    link: `file:///${item.path}`,
                    type: item.type,
                    path: item.path,
                    href: `${thumbnail.genHref(item.type, item.path, 500)}`,
                    fileLink: `file:///${item.path}`
                }
            })
            const markdown = fileLinks.map(link => `[${link.name}](${link.link})\n![](${isImagePath(link.path) ? link.fileLink : link.href})`).join('\n\n')
            const noteBooks = await kernelApi.sql({
                //获取最近修改笔记所在的box
                stmt: `select box from blocks order by updated desc limit 1`
            })
            const result = await kernelApi.appendDailyNoteBlock(
                {
                    data: markdown,
                    dataType: 'markdown',
                    notebook: noteBooks[0].box
                }
            )
        }
    }
}
export const 移动到回收站 = (assets, panelController) => {
    return {
        label: `移动到回收站`,
        click: async () => {
            let 确认删除 = await confirmAsPromise(
                `确认删除${assets.length}个文件?`,
                "删除后,本地磁盘请在系统回收站找回,群晖nas磁盘请在挂载目录的#recycle文件夹找回"
            )
            try {
                
                if(确认删除) { 
                    assets.forEach(assetItem=> metaRecords.deleteRecord(assetItem.path))

                    await processFilesFrontEnd(assets, '', 'trash', async (operation, assetItem, targetFilePath, error) => {
                    console.log(operation, assetItem, targetFilePath, error)

                    panelController.refresh()
                })}
            } catch (e) {
                console.error(e)
                //panelController.refresh()

            }
        }
    }
}
export const 移动到最近目录菜单组 = (assets, event) => {
    let 最近打开本地文件夹数组 = Array.from(plugin.最近打开本地文件夹列表)
    return [
        {
            label: "选择目标目录并移动",
            click: async () => {
                const result = await require('@electron/remote').dialog.showOpenDialog({
                    properties: ['openDirectory']
                })
                if (!result.canceled && result.filePaths.length > 0) {
                    const targetPath = result.filePaths[0]
                    const moveMenuItem = 移动到目录(assets, targetPath, event)
                    moveMenuItem.click()
                }
            }
        },
        ...最近打开本地文件夹数组.map(
            targetPath => {
                return 移动到目录(assets, targetPath, event)
            }
        )
    ]
}

export const 移动到目录 = (assets, targetPath, event) => {
    const operations = {
        move: { label: "移动到", action: "移动", func: 'move' },
        copy: { label: "复制到", action: "复制", func: 'copy' },
        hardlink: { label: "硬链接到", action: "创建硬链接", func: 'hardlink' },
        symlink: { label: "软链接到", action: "创建软链接", func: 'symlink' }
    };

    let operation = operations.move;
    if (event.ctrlKey && event.altKey) {
        operation = operations.symlink;
    } else if (event.ctrlKey) {
        operation = operations.copy;
    } else if (event.altKey) {
        operation = operations.hardlink;
    }

    return {
        label: `${operation.label}${targetPath}`,
        click: async () => {
            let result = await confirmAsPromise(
                plugin.翻译`确认${operation.action}${assets.length}个文件到${targetPath}?`,
                plugin.翻译`由于插件作者水平所限,不保证${operation.action}操作安全性,请优先考虑使用系统资源管理器进行操作`
            );
            if (result) {
                const errors = await processFilesFrontEnd(assets, targetPath, operation.func,(operation, asset, targetFilePath, error)=>{
                    if(!error){
                        kernelApi.pushMsg({'msg':`${operation} ${asset.path}至${targetFilePath}成功`})
                    }else{
                        kernelApi.pushErrMsg({'msg':`${operation} ${asset.path}至${targetFilePath}失败`})

                    }
                });
                console.error(errors)
                // 添加操作完成后的确认提示
                 await confirmAsPromise(
                    plugin.翻译`${operation.action}操作已完成`,
                    errors.length > 0 ? plugin.翻译`有${errors.length}个文件处理失败` : plugin.翻译`所有文件处理成功`
                );
            }
        }
    };
};