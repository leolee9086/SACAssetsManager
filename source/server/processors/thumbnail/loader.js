import commonLoader from './internalGeneraters/onlyName.js'
let loderPaths=['./internalGeneraters/svg.js','./internalGeneraters/sharp.js','./internalGeneraters/systermThumbnailWin64.js']
async function initLoadersFromPaths(loderPaths){
    let loaders=[]
    for(const path of loderPaths){
        try{
            const loader = await import(path)
            loaders.push(new loader.default())
        }catch(e){
            console.error(e)
        }
    }
    return loaders
}
let loaders = await initLoadersFromPaths(loderPaths)
loaders=loaders.filter(
    item=>{
        return isSupport(item)
    }
)
/**
 * 判断item的系统是否支持
 * @param {*} loader 
 * @returns 
 */
function isSupport(loader){
    if(!loader.sys){
        return true
    }
    else{
        return loader.sys.indexOf(process.platform+" "+process.arch) !== -1
    }
}
export function getLoader(imagePath) {
    let loader = null
    for (const _loader of loaders) {
        if (imagePath.match(_loader.match(imagePath))) {
            loader = _loader
        }
    }
    //如果都没有匹配到,则使用commonLoader,返回一个svg图标
    loader = loader || new commonLoader()
    return loader
}




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



function measureRegexComplexity(regexString) {
    const regex = new RegExp('^' + regexString + '$');
    const complexity = {
      totalLength: regexString.length,
      specialChars: (regexString.match(/[\(\)\[\]\{\}\^\$\.\?\*\+\-\|]/g) || []).length,
      quantifiers: (regexString.match(/(\?|\{[^}]+\})[+*?]?/g) || []).length,
      groups: (regexString.match(/\((?!\?)/g) || []).length,
      alternations: (regexString.match(/\|/g) || []).length,
      lookarounds: (regexString.match(/(?<=\()(?:\\[1-9]+\|\\b|\\B)/g) || []).length,
      flags: (regex.flags.length > 0) ? 1 : 0,
      namedGroups: (regexString.match(/(?<=\()\?<[^>]+>/g) || []).length,
      comments: (regexString.match(/(?<=\()\?#[^*]*\*\//g) || []).length,
      nestedDepth: 0,
      complexityScore: 0
    };
  
    // 计算嵌套深度
    let stack = [];
    for (let i = 0; i < regexString.length; i++) {
      if (regexString[i] === '(') {
        stack.push(i);
      } else if (regexString[i] === ')' && stack.length > 0) {
        complexity.nestedDepth = Math.max(complexity.nestedDepth, stack.length);
        stack.pop();
      }
    }
  
    // 计算复杂度得分
    complexity.complexityScore = (
      complexity.totalLength +
      complexity.specialChars * 2 +
      complexity.quantifiers * 3 +
      complexity.groups * 2 +
      complexity.alternations * 2 +
      complexity.lookarounds * 5 +
      complexity.flags +
      complexity.namedGroups * 2 +
      complexity.comments * 1 +
      complexity.nestedDepth * 4
    );
  
    return complexity;
  }
  