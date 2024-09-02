//转接导出
export { measureRegexComplexity } from "../../../../utils/strings/regexs/index.js";
// 匹配所有路径中包含.library/images或者.library\\\\images的文件,这些文件是eagle的库文件
export const eagleImageRegex = /.*\.library\\images|.*\.library\/images/
export const eagleLibraryRegex = /.*\.library|.*\.library/
export const isEagleMeta =(path)=>{
    return eagleImageRegex.test(path)&&path.endsWith('metadata.json')
}
export const isEagleThumbnail =(path)=>{
    return eagleImageRegex.test(path)&&path.endsWith('_thumbnail.png')
}
export const isWindowsysThumbnailDb =(path)=>{
    return path.endsWith('Thumbs.db')
}
export const isEagleBackup =(path)=>{
    return eagleLibraryRegex.test(path)&&path.split('/').pop().startsWith('backup-')
}