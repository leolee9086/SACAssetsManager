import { buildCache } from '../cache/cache.js'
import commonLoader from './internalGeneraters/onlyName.js'
import { sortLoaderByRegexComplexity } from './sorter.js'
import { statWithCatch } from '../fs/stat.js'
import { getColor } from './color.js'
import { genStatHash } from '../fs/stat.js'
import { noThumbnailList } from './utils/lists.js'
let imageExtensions = [
    'png',
    'jpg',
    'jpeg',
    'gif',
    'bmp',
    'tiff',
    'ico',
    'webp'
]

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


const 缓存目录 = require('path').join(siyuanConfig.system.workspaceDir, 'temp', 'sac', 'thumbnail')
if (!require('fs').existsSync(缓存目录)) {
    require('fs').mkdirSync(缓存目录, { recursive: true })
}
const fs = require('fs')
import { asyncReadFile } from '../fs/utils/withExists.js'
const commonIcons = new Map()
export const 生成缩略图 = async (imagePath, loaderID = null) => {
    const extension = imagePath.split('.').pop()
    let useExtension = false
    let useRaw = false
    if (noThumbnailList.includes(extension)) {
        useExtension = true
        if (commonIcons.has(extension)) {
            return commonIcons.get(extension)
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
    if (imageExtensions.includes(extension) && stat.size < 1024 * 50) {
        useRaw = true
        console.log('使用原始图', imagePath)
        const rawBuffer = require('fs').readFileSync(imagePath)
        tumbnailCache.set(缓存键, rawBuffer)
        return {
            data: rawBuffer,
            type: extension,
            isImage: true,
        }
    }
    const hashedName = genStatHash(stat) + '.thumbnail.png'
    let 缓存路径 = require('path').join(缓存目录, hashedName)
    if (useExtension) {
        缓存路径 = require('path').join(缓存目录, `${extension}.thumbnail.png`)
    }
    let fromFIle=await asyncReadFile(缓存路径)
    if(fromFIle){
        return fromFIle
    }
    const thumbnailBuffer = await loader.generateThumbnail(imagePath)
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
const tumbnailCache = buildCache('thumbnailCache')
export const 准备缩略图 = async (imagePath, loaderID = null) => {
    requestIdleCallback(async () => {
        const thumbnailBuffer = await 生成缩略图(imagePath, loaderID)
        await getColor(thumbnailBuffer, imagePath)
    }, { deadline: 10 })
}
export async function genThumbnailColor(filePath, loaderID = null) {
    const start = performance.now()
    const thumbnailBuffer = await 生成缩略图(filePath, loaderID)
    const end = performance.now()
    console.log('生成缩略图', filePath, end - start)
    // 欧几里得聚类,较为简单,但效果一般
    // 不过颜色查询应该够用了
    const start2 = performance.now()
    const colors = await getColor(thumbnailBuffer, filePath)
    const end2 = performance.now()
    console.log('获取颜色', filePath, end2 - start2)
    return colors
}

