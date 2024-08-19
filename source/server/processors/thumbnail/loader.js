import { buildCache } from '../cache/cache.js'
import commonLoader from './internalGeneraters/onlyName.js'
import { sortLoaderByRegexComplexity } from './sorter.js'
import { statWithCatch } from '../fs/stat.js'
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
    return loaders
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
export function getLoader(imagePath,loaderID) {
    let loader = null
    if(loaderID){
        loader = getLoaderByID(loaderID)
    }
    else{
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
    loaders = sortLoaderByRegexComplexity(loaders)
    for (const _loader of loaders) {
        if (imagePath.match(_loader.match(imagePath))) {
            loader = _loader
        }
    }
    return loader
}
export function listLoaders(){
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






export const 生成缩略图 = async (imagePath,loaderID=null) => {
    let loader =await getLoader(imagePath,loaderID)
    if(!loader){
        return null
    }
    return await loader.generateThumbnail(imagePath)
}
const tumbnailCache = buildCache('thumbnailCache')
export const 准备缩略图 = async (imagePath,loaderID=null) => {

    requestIdleCallback(async ()=>{

        const stat = statWithCatch(imagePath)
        const 缓存键 =JSON.stringify(stat)
        if(!tumbnailCache.get(缓存键)){

            tumbnailCache.set(缓存键,await 生成缩略图(imagePath,loaderID))
        }
    },{timeout:10000,deadline:100})
}




