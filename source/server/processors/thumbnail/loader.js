import commonLoader from './internalGeneraters/onlyName.js'
import { sortLoaderByRegexComplexity } from './sorter.js'
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






