//转接导出
// import { measureRegexComplexity } from "../../../../../src/utils/strings/regexs/index.js";
import { measureRegexComplexity } from "../../../../../src/toolBox/base/useEcma/forString/forRegexComplexity.js";

export { measureRegexComplexity };

// 匹配所有路径中包含.library/images或者.library\\\\images的文件,这些文件是eagle的库文件
export const eagleImageRegex = /.*\.library\/images/
export const eagleLibraryRegex = /.*\.library/


export const isEagleMeta =(path)=>{
    return eagleImageRegex.test(path)&&path.endsWith('metadata.json')
}
export const isEagleThumbnail =(path)=>{
    return eagleImageRegex.test(path)&&path.endsWith('_thumbnail.png')
}
export const isEagleBackupImage =(path)=>{
    return eagleImageRegex.test(path)&&!isEagleMeta(path)&&!isEagleThumbnail(path)
}
export const isWindowsysThumbnailDb =(path)=>{
    return path.endsWith('Thumbs.db')
}
export const isEagleBackup =(path)=>{
    return eagleLibraryRegex.test(path)&&path.split('/').pop().startsWith('backup-')
}
/**
 * 这是一个更简单的判断,所以会更快一点
 * 因为metadata基本上都不需要进管,所以遍历的时候直接全部忽略
 * @param {*} path 
 * @returns 
 */
export const isMetaData=(path)=>{
    return path.endsWith('metadata.json')
}
/***
 * 
 */
export const isThumbnail=(path)=>{
    return path.endsWith('_thumbnail.png')
}