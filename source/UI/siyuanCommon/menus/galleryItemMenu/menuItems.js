import { plugin, clientApi } from '../../../../asyncModules.js'
import { 打开efu文件视图页签 } from '../../tabs/assetsTab.js'
export const 打开efu文件视图=(assets)=>{
    return {
        label: "在新页签打开efu文件列表",
        click:()=>{
            assets.filter(item=>{
                console.log(item)
                return item.path.endsWith('.efu')
            }).forEach(
                item=>打开efu文件视图页签(item.path)
            )
        }
    }
}
export const 打开资源文件所在笔记 = (assets) => {
    return {
        label: "所在笔记",
        click: () => {
            assets.forEach(asset => {
                if (asset.type === 'note') {
                    clientApi.openTab(
                        {
                            app: plugin.app,
                            doc: {
                                id: asset.id,
                                action: "cb-get-focus"
                            }
                        }
                    )
                    return
                }
                clientApi.openTab(
                    {
                        app: plugin.app,
                        doc: {
                            id: asset.block_id,
                            action: "cb-get-focus"
                        }
                    }
                )
            });
        }
    }
}
export const 使用默认应用打开附件 = (assets) => {
    return {
        label: "使用默认应用打开",
        click: () => {
            assets.forEach(asset => {
                plugin.eventBus.emit(
                    plugin.events.打开附件,
                    asset.path
                )
            });
        }
    }
}
export const 在文件管理器打开附件 = (assets) => {
    return {
        label: "在资源管理器打开所在路径",
        click: () => {
            assets.forEach(asset => {
                plugin.eventBus.emit(
                    plugin.events.打开附件所在路径,
                    asset.path
                )
            });
        }
    }
}

export const 在新页签打开文件所在路径 = (assets) => {
    return {
        label: "在新页签打开文件所在路径",
        click: () => {
            assets.forEach(asset => {
                if (asset.type === 'local') {
                    plugin.eventBus.emit(
                        'open-localfoldertab',
                        asset.path
                    )
                    return
                }
                plugin.eventBus.emit(
                    'open-localfoldertab',
                    siyuan.config.system.workspaceDir + '\\data\\' + asset.path
                )
            });
        }
    }
}
export const 使用TEColors插件分析图像颜色 = (assets) => {
    return {
        label: "使用TEColors插件分析图像颜色",
        click: () => {
            assets.forEach(asset => {
                const image = new Image()
                const serverHost = `${window.location.protocol}//${window.location.hostname}:${plugin.http服务端口号}`
                image.src = `${serverHost}/thumbnail/?localPath=${encodeURIComponent(asset.path)}`
                image.onload = () => {
                    siyuan.ws.app.plugins.forEach(
                        item => {
                            item.eventBus.emit(
                                'open-imageColors-palatte',
                                image
                            )
                        }
                    )

                }

            })
        }
    }
}
export const 复制文件地址 = (assets) => {
    return {
        label: "复制文件地址",
        click: () => {
            navigator.clipboard.writeText(assets.map(asset => asset.path).join('\n\n'))
        }
    }
}
export const 复制文件链接 = (assets) => {
    return {
        label: "复制文件链接(markdown)",
        click: () => {
            navigator.clipboard.writeText(assets.map(asset => `![${asset.name}](file:///${asset.path})`).join('\n\n'))
        }
    }
}
export const 复制文件缩略图地址 = (assets) => {
    return {
        label: "复制文件缩略图",
        click: () => {
            const serverHost = `${window.location.protocol}//${window.location.hostname}:${plugin.http服务端口号}`
            let text = ''
            assets.forEach(asset => {
                const thumbnailSrc = `${serverHost}/thumbnail/?localPath=${encodeURIComponent(asset.path)}`
                text += `![${asset.name}](${thumbnailSrc})\n\n`
            });
            navigator.clipboard.writeText(text)
        }
    }
}
/**
 * 
 * @param {/api/asset/upload}

The parameter is an HTTP Multipart form

assetsDirPath: The folder path where assets are stored, with the data folder as the root path, for example:

"/assets/": workspace/data/assets/ folder
"/assets/sub/": workspace/data/assets/sub/ folder
Under normal circumstances, it is recommended to use the first method, which is stored in the assets folder of the workspace, putting in a subdirectory has some side effects, please refer to the assets chapter of the user guide.

file[]: Uploaded file list

Return value

{
  "code": 0,
  "msg": "",
  "data": {
    "errFiles": [""],
    "succMap": {
      "foo.png": "assets/foo-20210719092549-9j5y79r.png"
    }
  }
}
} e 
 * @returns 
 */

export const 上传到assets并复制链接 = (assets) => {
    return {
        label: "上传到assets并复制链接",
        click: async () => {
            const assetsDirPath = '/assets/'
            const formData = new FormData()
            /**
             * 这里应该是一个文件列表对象而不是路径数组
             * 使用for循环避免异步问题
             */
            // 读取文件并添加到 FormData
            for (let i = 0; i < assets.length; i++) {
                const asset = assets[i]
                // 读取文件
                let fileData = require('fs').readFileSync(asset.path)
                // 转换为 Blob 对象
                let fileBlob = new Blob([fileData.buffer], { type: 'application/octet-stream' });
                // 添加到 FormData，使用索引作为字段名，或者使用统一的字段名如 'files[]'
                let fileObj = new File([fileData], require('path').basename(asset.path))
                formData.append(`file[${i}]`, fileObj);

            }
            formData.append('assetsDirPath', assetsDirPath)
            const res = await fetch('/api/asset/upload', {
                method: 'POST',
                body: formData
            })
            console.log(res)
            navigator.clipboard.writeText(assets.map(asset => `![${asset.name}](file:///${asset.path})`).join('\n'))
        }
    }
}

export const 清理缓存并硬刷新 =  () => {
    return {
        label:"清理缓存并硬刷新当前窗口",
        click: async () => {
            const remote = require('@electron/remote')
            try {
                // 清理会话缓存
                const session = remote.session.defaultSession;
                await session.clearCache();

                // 强制刷新页面
                remote.getCurrentWindow().reload();
            } catch (error) {
                console.error('清理缓存并硬刷新失败:', error);
            }
        }
    }
}
