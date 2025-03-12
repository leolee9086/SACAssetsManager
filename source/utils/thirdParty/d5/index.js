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
// 提取共用的文件处理逻辑
/**
 * 用于根据D5a文件路径获取缩略图路径
 * 一般网上下载的D5a文件，缩略图路径为：.cache/icon.jpg
 * 这是因为它们一般是从D5的本地素材库中直接复制出来的,默认的文件结构就是这样
 * @param {*} assetPath 
 * @returns 
 */
export const 获取常规D5a缩略图路径 = (assetPath) => {
  //守卫
  const path = require('path')
  const dirname = path.dirname(assetPath)
  const cachePath = path.join(dirname, '.cache', path.basename(assetPath))
  return path.join(cachePath, 'icon.jpg')
}