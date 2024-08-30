import { 欧几里得聚类, CIEDE2000聚类 } from '../color/Kmeans.js'
import { awaitForEach } from '../../../utils/array/walk.js'
import { 找到文件颜色 } from '../color/colorIndex.js'
const sharp = require('sharp')
export async function getColor(buffer, filePath) {
    if (buffer.type && !buffer.isImage) {
        return
    }
    if (
        buffer.type
    ) {
        buffer = buffer.data
    }
    let finded = await 找到文件颜色(filePath)
    if (finded) {
        console.log('颜色缓存命中')
        return finded
    }
    let rgba
    try {
        rgba = await sharp(buffer).resize(32, 32, {
            fit: 'inside',
            withoutEnlargement: true // 防止放大图像
        }).raw().toBuffer()
    } catch (e) {
        console.log(buffer, filePath)

    }
    try{
    let dominantColors = 欧几里得聚类(rgba, 5)
    for (let item of dominantColors.centers) {
        for (let item2 of item.color) {
            item2 = Math.floor(item2)
        }
    }
    return dominantColors.centers}
    catch(e){
        console.warn(e)
        return []
    }
}
