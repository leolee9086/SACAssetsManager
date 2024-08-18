import { statWithCatch } from '../fs/stat.js';
import { 欧几里得聚类 } from '../color/Kmeans.js'

export async function genThumbnailColor(filePath,loaderID=null){
    const thumbnailBuffer = await 生成缩略图(filePath,loaderID)
    // 欧几里得聚类,较为简单,但效果一般
    // 不过颜色查询应该够用了
    const colors = await getColor(thumbnailBuffer)
    return colors
}

const sharp = require('sharp')

async function getColor(buffer) {
    let time = new Date().getTime()
    //先用sharp缩放到100x100,避免裁切,在转换为rgba数值数组
    console.time(`color-${buffer.length}-${time}`)
    //缩放之后进行处理
    let rgba = await sharp(buffer).resize(64, 64, {

        fit: 'inside',
        withoutEnlargement: true // 防止放大图像

    }).raw().toBuffer()
    let dominantColors = 欧几里得聚类(rgba, 5)
    console.timeEnd(`color-${buffer.length}-${time}`)
    console.log(dominantColors)
}