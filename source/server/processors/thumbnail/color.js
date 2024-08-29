import { 欧几里得聚类,CIEDE2000聚类 } from '../color/Kmeans.js'
import { awaitForEach } from '../../../utils/array/walk.js'
const sharp = require('sharp')
export async function getColor(buffer,filePath) {
    if(buffer.type&&!buffer.isImage){
        return
    }
    if(
        buffer.type
    ){
        buffer=buffer.data
    }
    let rgba = await sharp(buffer).resize(64, 64, {
        fit: 'inside',
        withoutEnlargement: true // 防止放大图像
    }).raw().toBuffer()
    let dominantColors = 欧几里得聚类(rgba,5)
    for(let item of dominantColors.centers){
        for(let item2 of item.color){
            item2=Math.floor(item2)
        }
    }
    return dominantColors.centers
}
