import { 
    getCachePath, 
    buildCache, 
    statWithCatch, 
    sendFileWithCacheSet 
} from "../runtime_cache.js"
import { 暂停文件系统解析队列,恢复文件系统解析队列 } from "../runtime_queue.js"
export const checkAndSendExtensionIcon = async (req, res, next) => {
    暂停文件系统解析队列()
    const 源文件地址 = req.sourcePath
    const stat = statWithCatch(源文件地址)
    let extension = 源文件地址.split('.').pop()
    const 缓存目录 = (await getCachePath(源文件地址, 'thumbnails', true)).cachePath
    let 扩展名缓存路径 = require('path').join(缓存目录, `${extension}.thumbnail.png`)
    const thumbnailCache = buildCache('thumbnailCache')
    const 缓存键 = JSON.stringify(stat)
    console.log(`查找扩展名缓存路径`,扩展名缓存路径)
    if (await sendFileWithCacheSet(res, 扩展名缓存路径, thumbnailCache, 缓存键)) {
        console.log(`扩展名缓存命中`,源文件地址)
        恢复文件系统解析队列()
        return
    }
    恢复文件系统解析队列()
    next()
}