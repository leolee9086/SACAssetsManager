export {SystemThumbnailLoader} from './systermThumbnail.js'
export {SvgLoader} from './svg.js'
export {SharpLoader} from './sharp.js'
import {SvgLoader} from './svg.js'
import {SharpLoader} from './sharp.js'
import {SystemThumbnailLoader} from './systermThumbnail.js'
const loaders = [
    new SvgLoader(),
    new SharpLoader()
]

export function getLoader(imagePath) {
    let loader = null
    for (const _loader of loaders) {
        if (imagePath.match(_loader.match(imagePath))) {
            loader = _loader
        }
    }
    loader = loader || new SystemThumbnailLoader()
    return loader
}
const loaderRegister = new Map()



function sortMatchRules(matchRules, imagePath) {
    //根据matchRules的长度排序，长度越短的优先级越高
    //同样长度的matchRules，匹配越严格的优先级越高
    matchRules.sort((a, b) => compareMatchRules(a, b, imagePath))
}
function compareMatchRules(rulerArray_a, rulerArray_b, imagePath) {
    let flag = 0
    //首先比较数组长度
    if (rulerArray_a.length < rulerArray_b.length) {
        flag = -1
    } else if (rulerArray_a.length > rulerArray_b.length) {
        flag = 1
    }
    //如果长度相同，比较正则表达式,匹配越严格的优先级越高
    //所谓匹配严格,指的是正则表达式匹配到的字符串长度越长,优先级越高
    //需要注意,两个序列都是正则表达式数组,所以需要遍历匹配后进行比较
    const matchedResult_a = useMatchRules(rulerArray_a, imagePath)
    const matchedResult_b = useMatchRules(rulerArray_b, imagePath)
    //如果匹配到,则比较匹配到的字符串长度
    if (matchedResult_a && matchedResult_b) {
        flag = matchedResult_a.matched.length - matchedResult_b.matched.length
    }
    
    //如果还是无法比较,则比较正则表达式
    if (flag === 0) {
        flag = rulerArray_a.source.length - b.source.length
    }
    return flag
}


function useMatchRules(matchRules, imagePath) {
    for (const matchRule of matchRules) {
        //如果匹配到,则返回匹配到的字符串
        if (matchRule.test(imagePath)) {
            return {matched:matchRule.exec(imagePath),matchedRule:matchRule}
        }
    }
    //否则返回false
    return false
}