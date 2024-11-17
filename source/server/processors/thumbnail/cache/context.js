import { statWithCatch } from '../../fs/stat.js'
import { 获取哈希并写入数据库 } from '../../fs/stat.js'
import { imageExtensions, 是否不需要单独缩略图 } from '../utils/lists.js'
import { getCommonLoader, getLoader } from '../loaders/query.js'
import { getCachePath } from '../../fs/cached/fs.js'
import { getFileExtension } from '../../../../utils/fs/extension.js'
import { 内置缩略图生成器序列 } from '../loaders/internal.js'
const fs = require('fs')
export const 创建缩略图生成上下文 = async (imagePath, loaderID = null) => {
    imagePath = imagePath.replace(/\\/g, '/')
    const extension = getFileExtension(imagePath)
    let useExtension = 是否不需要单独缩略图(extension)

    let loader = await getLoader(imagePath, loaderID, 内置缩略图生成器序列)
    if (!loader) {
        loader = await getCommonLoader()
    }
    const stat = await statWithCatch(imagePath)
    if (!stat) {
        throw new Error(`获取文件属性失败,不能为${imagePath}创建缩略图上下文`)
    }
    let useRaw = false
    if (imageExtensions.includes(extension) && stat.size < 1024 * 1024 * 1) {
        useRaw = true
    }
    const hash = await 获取哈希并写入数据库(stat)
    const cacheDir = (await getCachePath(imagePath, 'thumbnails')).cachePath
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true })
    }
    const hashedName = hash + '.thumbnail.png'
    const targetPath = require('path').join(cacheDir, hashedName)
    const extensionThumbnailPath = require('path').join(cacheDir, `${extension}.thumbnail.png`)
    return {
        extension,
        useExtension,
        useRaw,
        loader,
        stat,
        hash,
        fixedPath: imagePath,
        cacheDir,
        hashedName,
        targetPath,
        extensionThumbnailPath
    }
}

