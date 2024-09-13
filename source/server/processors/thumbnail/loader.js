import { buildCache } from '../cache/cache.js'
import { statWithCatch } from '../fs/stat.js'
import { getColor } from './color.js'
import { diffColor } from '../color/Kmeans.js'
import { 获取哈希并写入数据库 } from '../fs/stat.js'
import { noThumbnailList, imageExtensions, 是否不需要单独缩略图 } from './utils/lists.js'
import { globalTaskQueue } from '../queue/taskQueue.js'
import { 内置缩略图生成器序列 } from './loaders/internal.js'
import { getLoader } from './loaders/query.js'
const sharp = require('sharp')

export function listLoaders() {
    return 内置缩略图生成器序列.map(item => {
        return {
            id: item.id,
            name: item.name,
            match: item.match,
            sys: item.sys,
            support: item.support,
            description: item.description
        }
    })
}



const fs = require('fs')
import { asyncReadFile } from '../fs/utils/withExists.js'
import { getFileExtension } from '../../../utils/fs/extension.js'
const commonIcons = new Map()
export const 生成缩略图 = async (imagePath, loaderID = null) => {
    imagePath = imagePath.replace(/\\/g, '/')
    //const extension = imagePath.split('.').pop().toLowerCase()
    const extension = getFileExtension(imagePath)
    let useExtension = 是否不需要单独缩略图(extension)
    let useRaw = false

    let loader = await getLoader(imagePath, loaderID,内置缩略图生成器序列)
    if (!loader) {
        return null
    }
    const stat = await statWithCatch(imagePath)
    console.log(stat)
    const 缓存键 = JSON.stringify(stat)
    if (tumbnailCache.get(缓存键)) {
        return tumbnailCache.get(缓存键)
    }
    //小图片直接返回
    if (imageExtensions.includes(extension) && stat.size < 1024 * 512) {
        useRaw = true
        console.log('使用原始图', imagePath)
        try {
            const rawBuffer = fs.readFileSync(imagePath)
            tumbnailCache.set(缓存键, rawBuffer)
            return {
                data: rawBuffer,
                type: extension,
                isImage: true,
            }
        } catch (e) {
            console.error(e)
        }
    }
    const hashedName = await 获取哈希并写入数据库(stat) + '.thumbnail.png'
    const 缓存目录 = (await getCachePath(imagePath, 'thumbnails')).cachePath
    if (!fs.existsSync(缓存目录)) {
        fs.mkdirSync(缓存目录, { recursive: true })
    }
    let 缓存路径 = require('path').join(缓存目录, hashedName)
    let 原始缓存路径 = 缓存路径
    let 扩展名缓存路径 = require('path').join(缓存目录, `${extension}.thumbnail.png`)
    if (useExtension) {
        缓存路径 = 扩展名缓存路径
    }

    //如果原始缓存有存在的话,说明特别生成了缩略图
    let fromFIle1 = await asyncReadFile(
        原始缓存路径,
        //表示不存在时不抛出错误
        true
    )
    if (fromFIle1 && fromFIle1.length >= 100) {
        return fromFIle1
    }
    if (commonIcons.has(extension)) {
        console.log('使用扩展名缩略图', imagePath)

        return commonIcons.get(extension);
    }


    let fromFIle = await asyncReadFile(缓存路径,        //表示不存在时不抛出错误
        true
    )
    if (fromFIle && fromFIle.length >= 100) {

        return fromFIle
    }

    let thumbnailBuffer = await loader.generateThumbnail(imagePath, 缓存路径)
    if (thumbnailBuffer) {
        //@todo 使用sharp压缩图片,暂时不压缩,因为会对色彩分析造成非常剧烈的干扰
        if (thumbnailBuffer.length > 1024 * 10) {
            thumbnailBuffer = await sharp(thumbnailBuffer)
                .png({ compressionLevel: 9 })
                .toBuffer()
            console.log('成功生成缩略图', imagePath)
        }
        tumbnailCache.set(缓存键, thumbnailBuffer)
        if (noThumbnailList.includes(extension) && !commonIcons.has(extension)) {
            commonIcons.set(extension, thumbnailBuffer)
            fs.writeFile(缓存路径, thumbnailBuffer, (err) => {
                if (err) {
                    console.error(err)
                    return
                }
            })
        }
        if (!noThumbnailList.includes(extension)) {
            fs.writeFile(缓存路径, thumbnailBuffer, (err) => {
                if (err) {
                    console.error(err)
                    return
                }
            })
        }
        return thumbnailBuffer
    }
}
const tumbnailCache = buildCache('thumbnailCache')
import { getCachePath } from '../fs/cached/fs.js'
export const 准备缩略图 = async (imagePath, loaderID = null) => {
    let fn = async () => {
        try {
            await genThumbnailColor(imagePath, loaderID)
        } catch (e) {
            console.error(e)
        } finally {
            return imagePath
        }
    }
    // 使用当前时间的负值作为优先级
    const priority = -Date.now();
    // 处理可能的边界情况
    if (priority === 0) {
        // 在极少数情况下，如果 Date.now() 返回 0，我们使用一个非常小的负数
        fn = globalTaskQueue.priority(fn, -Number.MIN_SAFE_INTEGER);
    } else {
        fn = globalTaskQueue.priority(fn, priority);
    }
    globalTaskQueue.push(fn);
}
export async function genThumbnailColor(filePath, loaderID = null) {
    const thumbnailBuffer = await 生成缩略图(filePath, loaderID)
    // 欧几里得聚类,较为简单,但效果一般
    // 不过颜色查询应该够用了
    if (!thumbnailBuffer) {
        return null
    }
    const colors = await getColor(thumbnailBuffer, filePath)
    return colors
}
export async function diffFileColor(filePath, color) {
    let simiColor = await genThumbnailColor(filePath)
    if (!simiColor) {
        return false
    }
    for await (let item of simiColor) {
        if (diffColor(item.color, color)) {
            return true
        }
    }
    return false
}