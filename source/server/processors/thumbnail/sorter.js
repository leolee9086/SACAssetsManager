import { measureRegexComplexity } from "./utils/regexs.js"
export function sortLoaderByRegexComplexity(loaders){
    /**
     * 如果有match，则按照match的复杂度排序
     * 如果没有,排到最后
     */

    loaders.sort((a,b) => {
        if(a.match && b.match){
            return measureRegexComplexity(`${a.match}`) - measureRegexComplexity(`${b.match}`)
        }else if(a.match){
            return -1
        }else if(b.match){
            return 1
        }else{
            return 0
        }
    })
    return loaders
}