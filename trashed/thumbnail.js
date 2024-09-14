export const checkAndSendWritedIconWithCacheWrite = async (req, res, next) => {
    statPromisesArray.paused = true;

    const 源文件地址 = req.sourcePath
    const stat = await statWithCatch(源文件地址)
    const 缓存键 = JSON.stringify(stat)
    const thumbnailCache = buildCache('thumbnailCache')
    const hashedName =await 获取哈希并写入数据库(stat) + '.thumbnail.png'
    const 缓存目录 = (await getCachePath(源文件地址, 'thumbnails', true)).cachePath
    let 缓存路径 = require('path').join(缓存目录, hashedName)
    console.log(缓存路径)
    // 先检查是否存在缓存的缩略图
    console.log(`查找文件缩略图硬盘缓存`,缓存路径)
    if (await sendFileWithCacheSet(res, 缓存路径, thumbnailCache, 缓存键)) {
        console.log(`文件缩略图硬盘缓存命中`,源文件地址)
        statPromisesArray.paused = false;
        return
    }
    next()
}
