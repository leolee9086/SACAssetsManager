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
    // 按顺序尝试匹配，返回第一个匹配的生成器
    for (const _loader of loaders) {
        const match = _loader.match(imagePath);
        if (typeof match === 'string' && match === imagePath) {
            return _loader;
        }
        if (match instanceof RegExp && match.test(imagePath)) {
            return _loader;
        }
    }
    return null;
}
