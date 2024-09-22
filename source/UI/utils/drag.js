import { imgeWithConut } from './decorations/iconGenerator.js'
import { plugin } from '../../asyncModules.js'
import { queryTags, saveTags } from '../../data/tags.js'
import path from '../../polyfills/path.js'

const 开始原生文件拖拽事件=async(event,files)=>{
    event.preventDefault();
    const remote = window.require('@electron/remote');
    const { webContents } = remote
   /* const webContentsId = plugin.serverContainerWebContentsID
    console.log(webContentsId)
    const webviewWebContents = webContents.fromId(webContentsId)*/
    console.log(plugin.dragListenerWebview)
    const webviewWebContents=plugin.dragListenerWebview.$webContents
    let _webContents = remote.getCurrentWindow().webContents
    const dragOperation = event.ctrlKey ? 'copy' : 'move';
    files[0] && webviewWebContents.send('startDrag',
        {
            id: _webContents.id,
            data: {
                files,
                icon: await imgeWithConut(files.length,false,event.ctrlKey ? '复制' : '移动'),
                options: {
                    dragOperation:dragOperation,
                    delay: 100 // 100毫秒的拖拽延迟
                }
            }
        }
    )
}
const 将文件写入dataTransfer=async(event,files)=>{
    event.dataTransfer.setData('application/x-electron-drag-data', JSON.stringify(files.join('\n')));
    event.dataTransfer.setData('files', files.join('\n'));
    event.dataTransfer.setData('text/plain', files.join('\n'));
    event.dataTransfer.setData('text/html', files.map(item => { return `<img src="file://${item}">` }).join('\n'));
    event.dataTransfer.setData('text/uri-list', files.join('\n'));
    event.dataTransfer.setData('sac/data-assets', JSON.stringify(files.join('\n')));
    event.dataTransfer.effectAllowed = 'copyLink';
    // 自定义拖拽图标
    const iconPath = await imgeWithConut(files.length, true);
    event.dataTransfer.setDragImage(iconPath, 64, 64);
    //window.blur()

}
export const onDragStartWithLayout = async (event, currentLayout) => {
    const selectedData = currentLayout.layout.filter(item => item.selected && item.data).map(item => item.data)
    let files = []
    selectedData.forEach(data => {
        let filePath = data.type === 'local' ? data.path : path.join(window.siyuan.config.system.workspaceDir, 'data', data.path)
        filePath = filePath.replace(/\\/g, '/')
        if (window.require('fs').existsSync(filePath)) {
            files.push(filePath)
        }
    });
    if (window.require) {
        开始原生文件拖拽事件(event,files)
    }
    将文件写入dataTransfer(event,files)
}



export const handlerDropWithTab = (event, tab) => {
    event.preventDefault();
    const data = event.dataTransfer.files;
    const droppedItems = Array.from(data).map(file => file.path.replace(/\\/g, '/'));
    if (window.require) {
        let { localPath, tagLabel } = tab.data
        if (localPath) {
            const fs = window.require('node:fs/promises');
            const copyPromises = droppedItems.map(file => {
                const destinationPath = path.join(localPath, path.basename(file));
                return fs.copyFile(file, destinationPath)
                    .then(() => {
                        console.log(`Copied ${file} to ${destinationPath}`);
                    })
                    .catch(err => {
                        console.error(`Error copying ${file} to ${destinationPath}:`, err);
                    });
            });
        } else if (tagLabel) {
            (async () => {

                const tag = await queryTags(tagLabel)
                droppedItems.forEach(
                    file => {
                        tag.assets.push(file)
                        tag.assets = Array.from(new Set(tag.assets))
                    }
                );
                await saveTags(plugin.tags)
                plugin.eventBus.emit('update-tag', tag)
            })()
        }
    }

}