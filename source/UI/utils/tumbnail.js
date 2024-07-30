import {plugin} from '../../asyncModules.js'
export function getCommonThumbnail(localPath){
    const serverHost=`${window.location.protocol}//${window.location.hostname}:${plugin.http服务端口号}`
    return !localPath.startsWith('assets/')?`${serverHost}/thumbnail/?localPath=${encodeURIComponent(localPath)}`:`${serverHost}/thumbnail/?localPath=${encodeURIComponent(siyuan.config.system.workspaceDir+'/data/'+localPath)}`
}
export function getCommonThumbnailsFromAssets(assets){
    return assets.map(item=>getCommonThumbnail(item.path))
}