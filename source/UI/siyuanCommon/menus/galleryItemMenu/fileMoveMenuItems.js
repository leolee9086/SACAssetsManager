import { kernelApi,clientApi } from "../../../../asyncModules.js"
import { thumbnail } from "../../../../server/endPoints.js";
import { isImagePath } from "../../../../utils/fs/pathType.js";

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
export const 移动到回收站=(assets)=>{
    return {
        label:`移动到回收站`,
        click:()=>{
            clientApi.confirm(
                `确认删除${assets.length}个文件?`,
                "删除后,本地磁盘请在系统回收站找回,群晖nas磁盘请在挂载目录的#recycle文件夹找回"
            )
        }
    }
}
export const 移动到目录=(assets,targetPath,event)=>{
    return  {
        label:(event.ctrlKey?'复制到':"移动到")+targetPath,
        click:()=>{
            clientApi.confirm(
                `确认移动${assets.length}个文件?`,
                "由于插件作者水平所限,不保证移动操作安全性,请优先考虑使用系统资源管理器移动或复制文件"
            )
        }
    }
}