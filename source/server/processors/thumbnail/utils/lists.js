/** 
* 不需要单独缩略图的列表
*/
export const noThumbnailList = [
   //文本类型的肯定是不需要的
   'inf',
   'markdown',
   'md',
   'txt',
   'json',
   'js',
   'css',
   'html',
   'htm',
   'dll',
   'go',
   'py',
   'rb',
   'sh',
   'bat',
   'cmd',
   'com',
   'sys',
   'ini',
   'config',
   'log',
   'lock',
   'cache',
   'temp',
   'backup',
   'old',
   'temp',
   'tmp',
   'cache',
   'lock',
   'pid',
   'lock',
   'cache',
   'tmp',
   'lock',
   'pid',
   'lock',
   'cache',
   'tmp',
   'lock',
   'pid',
   'pyd',
   'yml',
   'js',
   'css',
   'html',
   'htm',
   'xml',
   'docx',
   'sy',
   'db',
   'yaml',
   'gsm',
   'yml',
   'gitignore'
]
export const imageExtensions= [
    'png',
    'jpg',
    'jpeg',
    'gif',
    'bmp',
    'tiff',
    'ico',
    'webp'
]
export const vectorExtensions = [
    'svg',
    'ai',
    'eps',
    'pdf',
    'cdr',
    'emf',
    'wmf'
]
export const 是否不需要单独缩略图 =(extension)=>{
    let useExtension
    for (let i = 0; i < noThumbnailList.length; i++) {
        if (noThumbnailList[i].toLowerCase() === extension.toLowerCase()) {
            useExtension = true;
            break;
        }
    }
    return useExtension
}