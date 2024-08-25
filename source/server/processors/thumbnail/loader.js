import { buildCache } from '../cache/cache.js'
import commonLoader from './internalGeneraters/onlyName.js'
import { sortLoaderByRegexComplexity } from './sorter.js'
import { statWithCatch } from '../fs/stat.js'
import { idleIdle } from '../fs/fdirModified/src/api/idleQueue.js'
import { getColor } from './color.js'
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
export const 生成缩略图 = async (imagePath, loaderID = null) => {
    let loader = await getLoader(imagePath, loaderID)
    if (!loader) {
        return null
    }
    const stat = statWithCatch(imagePath)
    const 缓存键 = JSON.stringify(stat)
    if (tumbnailCache.get(缓存键)) {
        return tumbnailCache.get(缓存键)
    }
    console.log(imagePath)
    const thumbnailBuffer = await loader.generateThumbnail(imagePath)
    tumbnailCache.set(缓存键, thumbnailBuffer)
    return thumbnailBuffer
}
const tumbnailCache = buildCache('thumbnailCache')
export const 准备缩略图 = async (imagePath, loaderID = null) => {
    requestIdleCallback(async () => {
        const thumbnailBuffer = await 生成缩略图(imagePath, loaderID)
        await getColor(thumbnailBuffer, imagePath)
    }, { deadline:10 })
}
export async function genThumbnailColor(filePath, loaderID = null) {
    const start=performance.now()
    const thumbnailBuffer = await 生成缩略图(filePath, loaderID)
    const end=performance.now()
    console.log('生成缩略图',end-start)
    // 欧几里得聚类,较为简单,但效果一般
    // 不过颜色查询应该够用了
    const start2=performance.now()
    const colors = await getColor(thumbnailBuffer, filePath)
    const end2=performance.now()
    console.log('获取颜色',end2-start2)
    return colors
}

