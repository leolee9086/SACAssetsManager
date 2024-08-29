import { 欧几里得聚类 } from '../color/Kmeans.js'
import { awaitForEach } from '../../../utils/array/walk.js'
const sharp = require('sharp')
const bufferCache = new Map()
export async function getColor(buffer,filePath) {
    if(buffer.type&&!buffer.isImage){
        return
    }
    if(
        buffer.type
    ){
        buffer=buffer.data
    }
    let key = buffer.toString('base64')
    if(bufferCache.has(key)){
        return bufferCache.get(key)
    }
    //缩放之后进行处理
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
    //这里的键不能用buffer本身,要进行序列化
    bufferCache.set(key,dominantColors.centers)
    return dominantColors.centers
}
