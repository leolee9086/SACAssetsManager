// 处理缓存写入
const fs = require('fs')
export function 写入缩略图缓存(ctx, resultBuffer) {
    if (!Buffer.isBuffer(resultBuffer)) return
    
    const { extension, useExtension, targetPath, extensionThumbnailPath, fixedPath } = ctx
    const 写入路径 = useExtension ? extensionThumbnailPath : targetPath
    
    fs.writeFile(写入路径, resultBuffer, (err) => {
        err && console.error('缩略图生成成功但是写入失败', extension, resultBuffer, fixedPath, err)
    })
}