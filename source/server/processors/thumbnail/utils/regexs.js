//转接导出
export { measureRegexComplexity } from "../../../../utils/strings/regexs/index.js";
// 匹配所有路径中包含.library/images或者.library\\\\images的文件,这些文件是eagle的库文件
export const eagleRegex = /.*\.library\\images|.*\.library\/images/
export const isEagleMeta =(path)=>{
    return eagleRegex.test(path)&&path.endsWith('metadata.json')
}
export const isEagleThumbnail =(path)=>{
    return eagleRegex.test(path)&&path.endsWith('_thumbnail.png')
}
export const isWindsysThumbnailDb =(path)=>{
    return path.endsWith('Thumbs.db')
}
