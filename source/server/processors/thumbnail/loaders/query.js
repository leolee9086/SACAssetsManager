import commonLoader from "../internalGeneraters/onlyName.js"
export function getLoader(imagePath, loaderID,loaders) {
    let loader = null
    if (loaderID) {
        loader = getLoaderByID(loaderID,loaders)
    }
    else {
        loader = getLoaderByMatch(imagePath,loaders)
    }
    //如果都没有匹配到,则使用commonLoader,返回一个svg图标
    loader = loader || new commonLoader()
    return loader
}
export  function getCommonLoader(){
    return new commonLoader() 
}
function getLoaderByID(loaderID,loaders) {
    return loaders.find(item => item.id === loaderID)
}
function getLoaderByMatch(imagePath,loaders) {
    let loader = null
    for (const _loader of loaders) {
        if (imagePath.match(_loader.match(imagePath))) {
            loader = _loader
        }
    }
    return loader
}
