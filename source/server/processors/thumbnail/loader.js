import { buildCache } from '../cache/cache.js'
import commonLoader from './internalGeneraters/onlyName.js'
import { sortLoaderByRegexComplexity } from './sorter.js'
import { statWithCatch } from '../fs/stat.js'
import { getColor } from './color.js'
import { diffColor } from '../color/Kmeans.js'
import { genStatHash } from '../fs/stat.js'
import { noThumbnailList, imageExtensions } from './utils/lists.js'
import { isEagleBackupImage } from './utils/regexs.js'
const sharp = require('sharp')
let loderPaths = [
    './internalGeneraters/svg.js',
    './internalGeneraters/sharp.js',
    './internalGeneraters/systermThumbnailWin64.js',
    './internalGeneraters/sy.js'
]
async function initLoadersFromPaths(loderPaths) {
    let loaders = []
    for (const path of loderPaths) {
        try {
            const loader = await import(path)
            loaders.push(new loader.default())
        } catch (e) {
            console.error(e)
        }
    }
    return sortLoaderByRegexComplexity(loaders)
}
let loaders = await initLoadersFromPaths(loderPaths)
//判定是否支持,因为缩略图解析器需要调用系统接口
loaders = loaders.filter(
    item => {
        return isSupport(item)
    }
)
/**
 * 判断item的系统是否支持
 * @param {*} loader 
 * @returns 
 */
function isSupport(loader) {
    if (!loader.sys) {
        return true
    }
    else {
        return loader.sys.indexOf(process.platform + " " + process.arch) !== -1
    }
}
export function getLoader(imagePath, loaderID) {
    let loader = null
    if (loaderID) {
        loader = getLoaderByID(loaderID)
    }
    else {
        loader = getLoaderByMatch(imagePath)
    }
    //如果都没有匹配到,则使用commonLoader,返回一个svg图标
    loader = loader || new commonLoader()
    return loader
}
function getLoaderByID(loaderID) {
    return loaders.find(item => item.id === loaderID)
}
function getLoaderByMatch(imagePath) {
    let loader = null
    for (const _loader of loaders) {
        if (imagePath.match(_loader.match(imagePath))) {
            loader = _loader
        }
    }
    return loader
}
export function listLoaders() {
    return loaders.map(item => {
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
const commonIcons = new Map()
export const 生成缩略图 = async (imagePath, loaderID = null) => {
    imagePath = imagePath.replace(/\\/g, '/')
    const extension = imagePath.split('.').pop().toLowerCase()
    let useExtension = false
    let useRaw = false
    for (let i = 0; i < noThumbnailList.length; i++) {
        if (noThumbnailList[i].toLowerCase() === extension) {
            useExtension = true;
            if (commonIcons.has(extension)) {
                console.log('使用扩展名缩略图',imagePath)
                return commonIcons.get(extension);
            }
            break;
        }
    }
    let loader = await getLoader(imagePath, loaderID)
    if (!loader) {
        return null
    }
    const stat = statWithCatch(imagePath)
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
    const hashedName = genStatHash(stat) + '.thumbnail.png'
    const 缓存目录 = (await getCachePath(imagePath, 'thumbnails')).cachePath
    if (!fs.existsSync(缓存目录)) {
        fs.mkdirSync(缓存目录, { recursive: true })
    }
    let 缓存路径 = require('path').join(缓存目录, hashedName)
    if (useExtension) {
        缓存路径 = require('path').join(缓存目录, `${extension}.thumbnail.png`)
    }
 
    let fromFIle = await asyncReadFile(缓存路径)
    if (fromFIle && fromFIle.length >= 100) {
        return fromFIle
    }
    const start = performance.now()
    let thumbnailBuffer = await loader.generateThumbnail(imagePath, 缓存路径)
    if (thumbnailBuffer) {

        const end = performance.now()
        //console.log(`生成缩略图用时: ${end - start}ms`)
        //@todo 使用sharp压缩图片,暂时不压缩,因为会对色彩分析造成非常剧烈的干扰
        if (thumbnailBuffer.length > 1024 * 10) {
            thumbnailBuffer = await sharp(thumbnailBuffer)
                .png({ compressionLevel: 9 })
                .toBuffer()
            console.log('成功生成缩略图',imagePath)
        }
        tumbnailCache.set(缓存键, thumbnailBuffer)
        if (noThumbnailList.includes(extension) && !commonIcons.has(extension)) {
            commonIcons.set(extension, thumbnailBuffer)
            fs.writeFile(缓存路径, thumbnailBuffer, (err) => {
                if (err) {
                    console.error(err)
                }
            })
        }
        if (!noThumbnailList.includes(extension)) {
            fs.writeFile(缓存路径, thumbnailBuffer, (err) => {
                if (err) {
                    console.error(err)
                }
            })
        }
        return thumbnailBuffer
    }
}
const tumbnailCache = buildCache('thumbnailCache')
import { 智能防抖 } from '../../../utils/functionTools.js'
import { getCachePath } from '../fs/cached/fs.js'
export const 准备缩略图 = async (imagePath, loaderID = null) => {
        await genThumbnailColor(imagePath, loaderID)
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