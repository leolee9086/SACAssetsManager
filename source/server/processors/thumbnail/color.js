import { statWithCatch } from '../fs/stat.js';
import { 欧几里得聚类 } from '../color/Kmeans.js'
import { 生成缩略图 } from './loader.js'

const sharp = require('sharp')

const bufferCache = new Map()
export async function getColor(buffer,filePath) {
    if(buffer.type){
        return
    }
    if(bufferCache.has(filePath)){
        return bufferCache.get(filePath)
    }
    //缩放之后进行处理
    let rgba = await sharp(buffer).resize(64, 64, {
        fit: 'inside',
        withoutEnlargement: true // 防止放大图像

    }).raw().toBuffer()
    let dominantColors = 欧几里得聚类(rgba, 5)
    //这里的键不能用buffer本身,要进行序列化
    bufferCache.set(filePath,dominantColors.centers)
    return dominantColors.centers
}
