//这个文件是在前端调用的,注意这一点
import { plugin } from '../asyncModules.js'
import { imageExtensions } from '../server/processors/thumbnail/utils/lists.js'

export const serverHost =()=> `${window.location.protocol}//${window.location.hostname}:${plugin.http服务端口号}`


//缩略图相关
const thumbnailHost =(type,path,size)=>{
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
