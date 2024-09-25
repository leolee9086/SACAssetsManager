import { 欧几里得聚类,CIEDE2000聚类 } from '../../../utils/color/Kmeans.js'
import { 找到文件颜色 } from '../color/colorIndex.js'
import { 添加到颜色索引 } from '../color/colorIndex.js'
import { awaitForEach } from '../../../utils/array/walk.js'
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
    let rgba=buffer
    try {
        rgba = await sharp(buffer).resize(32, 32, {
            fit: 'inside',
            withoutEnlargement: true // 防止放大图像
        }).raw().toBuffer()
    } catch (e) {
        console.log(buffer, filePath)

    }
    try {
        let dominantColors = 欧几里得聚类(rgba, 5)
        for (let item of dominantColors.centers) {
            for (let item2 of item.color) {
                item2 = Math.floor(item2)
            }
        }
        let colors= dominantColors.centers.filter(item=>item.percent>0.05)
        let callback = async (colorItem,index)=>{
            添加到颜色索引(colorItem,filePath)
        }
        colors&&await awaitForEach(colors,callback)
        return colors
    }
    catch (e) {
        console.warn(e)
        return []
    }
}

