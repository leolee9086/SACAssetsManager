import { sortLoaderByRegexComplexity } from "../sorter.js"
export async function initLoadersFromPaths(loderPaths) {
    let loaders = []
    for (const path of loderPaths) {
        try {
            const loader = await import(path)
            loaders.push(new loader.default())
        } catch (e) {
            console.error(e)
        }
    }
    return sortLoaderByRegexComplexity(loaders.filter(
        loader=>{
            return isSupport(loader)
        }
    ))
}
function isSupport(loader) {
    if (!loader.sys) {
        return true
    }
    else {
        return loader.sys.indexOf(process.platform + " " + process.arch) !== -1
    }
}
