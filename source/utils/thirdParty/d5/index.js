import { addFileToZip } from '../../zip/modify.js'
export async function 修改d5a缩略图(d5aFilePath, thumbnailPath, callbacks = {}) {
    const fs = require('fs')
    if (d5aFilePath.endsWith('.d5a') && fs.existsSync(thumbnailPath)) {
        try {
            await addFileToZip(d5aFilePath, thumbnailPath, 'icon.jpg')
            const successMsg = `成功将缩略图${thumbnailPath}写入 ${d5aFilePath}`
            if (callbacks.onSuccess) {
                await callbacks.onSuccess(successMsg)
            }
            return true
        } catch (error) {
            const errorMsg = `写入缩略图到 ${d5aFilePath} 失败: ${error}`
            console.error(errorMsg)
            if (callbacks.onError) {
                await callbacks.onError(errorMsg)
            }
            return false
        }
    }
    return false
}