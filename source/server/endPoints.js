//这个文件是在前端调用的,注意这一点
import {  plugin } from '../asyncModules.js'
import { imageExtensions } from '../server/processors/thumbnail/utils/lists.js'
import {  获取文档图标 } from '../utils/siyuanData/icon.js'

export const serverHost =()=> `${window.location.protocol}//${window.location.hostname}:${plugin.http服务端口号}`

//缩略图相关
const thumbnailHost =(type,path,size,data)=>{
    if(type==='note'){
        let meta = data.$meta
            return 获取文档图标(meta)
        
    }    
    let src=!type ? `${serverHost()}/thumbnail/?path=${encodeURIComponent(path)}&size=${size}` : `${serverHost()}/thumbnail/?localPath=${encodeURIComponent(path)}&size=${size}`
    let rawSrc=!type ? `${serverHost()}/raw/?path=${encodeURIComponent(path)}` : `${serverHost()}/raw/?localPath=${encodeURIComponent(path)}`
    if(size>500&&imageExtensions.includes(path.split('.').pop())){
        return rawSrc
    }else{
        return src
    }
}
const upload= (type, path) => {
    let baseUrl = `${serverHost()}/thumbnail/upload`;
    let params = new URLSearchParams();
    
    if (!type) {
        params.append('path', path);
    } else {
        params.append('localPath', path);
    }
    
    return `${baseUrl}?${params.toString()}`;
}
export const fs={
    path:{
        getPathExtensions(localPath){return `${serverHost()}/fs/path/extentions/?dirPath=${encodeURIComponent(localPath)}`}
    }
}
export const thumbnail={
    genHref:thumbnailHost,
    getColor: (type, path, reGen = false) => {
        let baseUrl = `${serverHost()}/color/`;
        let params = new URLSearchParams();
        
        if (!type) {
            params.append('path', path);
        } else {
            params.append('localPath', path);
        }
        
        if (reGen) {
            params.append('reGen', 'true');
        }
        
        return `${baseUrl}?${params.toString()}`;
    },
    upload:upload
}
export const metaRecords = {
    deleteRecord:async(path)=>{
        let baseUrl= `${serverHost()}/metaRecords/delete/`
        let params = new URLSearchParams();
        params.append('localPath', path);
        return await fetch(`${baseUrl}?${params.toString()}`)
    }
}