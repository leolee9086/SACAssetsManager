// 处理缓存写入
const fs = require('fs')
export function 写入缩略图缓存(ctx, resultBuffer) {
    if (!Buffer.isBuffer(resultBuffer)) return
    
    const { extension, useExtension, targetPath, extensionThumbnailPath, fixedPath, cacheDir, hashedName } = ctx
    const 写入路径 = useExtension 
        ? (extensionThumbnailPath || require('path').join(cacheDir, `${extension}.thumbnail.png`))
        : (targetPath || require('path').join(cacheDir, hashedName))
    
    if (!写入路径) {
        console.error('无法确定缩略图写入路径', {
            extension,
            useExtension,
            targetPath,
            extensionThumbnailPath,
            fixedPath,
            cacheDir,
            hashedName
        });
        return;
    }
    
    fs.writeFile(写入路径, resultBuffer, (err) => {
        if (err) {
            console.error('缩略图生成成功但是写入失败', {
                extension,
                fixedPath,
                写入路径,
                错误: err
            });
        }
    })
}