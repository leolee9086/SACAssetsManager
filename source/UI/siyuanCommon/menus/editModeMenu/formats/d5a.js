import { confirmAsPromise } from '../../../../../utils/siyuanUI/confirm.js'
import { addFileToZip } from '../../../../../utils/zip/modify.js'
import {kernelApi,plugin} from '../../../../../asyncModules.js'
import { 修改d5a缩略图 } from '../../../../../utils/thirdParty/d5/index.js'
const {翻译}=plugin
export const d5a内置缩略图单次确认 = (assets) => {
    const d5aCount = assets.filter(item => item.path.endsWith('.d5a')).length
    return {
        label: 翻译`尝试寻找并内置缩略图(${d5aCount}个d5a文件，单次确认)`,
        click: async () => {
            const path = require('path')
            const fs = require('fs')
            const writeIcon = await confirmAsPromise(
                翻译`确定修改?`,
                翻译`确认后将尝试为${d5aCount}个d5a文件内置缩略图。此操作不可撤销，是否继续？`
            )
            let successCount = 0
            let failCount = 0
            if (writeIcon) {
                for (const asset of assets) {
                    if (asset && asset.path.endsWith('.d5a')) {
                        const dirname = path.dirname(asset.path)
                        const cachePath = path.join(dirname, '.cache', path.basename(asset.path))
                        const iconPath = path.join(cachePath, 'icon.jpg')
                        if (fs.existsSync(iconPath)) {
                            try {
                                await addFileToZip(asset.path, iconPath, 'icon.jpg')
                                console.log(`成功将缩略图${iconPath}写入 ${asset.path}`)
                                await kernelApi.pushMsg({'msg':`成功将缩略图${iconPath}写入 ${asset.path}`})
                                successCount++
                            } catch (error) {
                                await kernelApi.pushErrMsg({'msg':`写入缩略图到 ${asset.path} 失败:${error}`})

                                console.error(`写入缩略图到 ${asset.path} 失败:`, error)
                                failCount++

                            }
                        }
                    }
                }
            }
            await confirmAsPromise(
                '处理完成',
                `处理完成！成功：${successCount}个，失败：${failCount}个。`
            )
        }
    }
}

export const d5a内置缩略图 = (assets) => {
    const d5aCount = assets.filter(item => item.path.endsWith('.d5a')).length
    return {
        label:翻译 `尝试寻找并内置缩略图(${d5aCount}个d5a文件)`,
        click: async () => {
            const path = require('path')
            const fs = require('fs')
            let successCount = 0
            let failCount = 0
            for await (const asset of assets) {
                if (asset && asset.path.endsWith('.d5a')) {
                    const dirname = path.dirname(asset.path)
                    const cachePath = path.join(dirname, '.cache', path.basename(asset.path))
                    const iconPath = path.join(cachePath, 'icon.jpg')

                    if (fs.existsSync(iconPath)) {
                        const fileUrl = `file://${iconPath.replace(/\\/g, '/')}`
                        const writeIcon = await confirmAsPromise(
                            '确定修改?',
                            `确认后将${iconPath}写入d5a文件中<br><img src="${fileUrl}" alt="缩略图预览" style="max-width: 200px; max-height: 200px;">`
                        )
                        if (writeIcon) {
                            const success = await 修改d5a缩略图(asset.path, iconPath, {
                                onSuccess: ()=>kernelApi.pushMsg({'msg':`成功将缩略图${iconPath}写入 ${asset.path}`}),
                                onError:(error)=>kernelApi.pushErrMsg({'msg':`写入缩略图到 ${asset.path} 失败:${error}`})
                            })
                            if (success) {
                                successCount++
                            } else {
                                failCount++
                            }
                        }
                    }
                }
            }
        }
    }
}
export const items = [
    d5a内置缩略图,d5a内置缩略图单次确认
]