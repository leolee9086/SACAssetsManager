//这个文件是在前端调用的,注意这一点
import { plugin } from '../asyncModules.js'


export const serverHost = `${window.location.protocol}//${window.location.hostname}:${plugin.http服务端口号}`


//缩略图相关
const thumbnailHost =(type,path)=>{
    let src=!type ? `${serverHost}/thumbnail/?path=${encodeURIComponent(path)}` : `${serverHost}/thumbnail/?localPath=${encodeURIComponent(path)}`
    return src
}
export const thumbnail={
    genHref:thumbnailHost,
    getColor:(type,path)=>{
        let src=!type ? `${serverHost}/color/?path=${encodeURIComponent(path)}` : `${serverHost}/color/?localPath=${encodeURIComponent(path)}`
        return src
    }
}
