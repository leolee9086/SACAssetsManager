import { genThumbnailColor } from '../processors/thumbnail/loader.js'
import { 添加到颜色索引 } from '../processors/color/colorIndex.js'
const colorCache = new Map()
const colorIndex = []
export async function genColor(ctx,next){
    let { 源文件地址, 缓存键 } = ctx.stats
    if (!源文件地址) {
        res.status(400).send('Invalid request: missing source file address');
        return
    }
    if(colorCache.has(缓存键)){
        console.log('colorCache.has(缓存键)',缓存键,colorCache.get(缓存键))
        return colorCache.get(缓存键)
    }
    const colors = await genThumbnailColor(源文件地址)
    colorCache.set(缓存键,colors)
    colors.forEach((colorItem,index)=>{
        添加到颜色索引(colorItem.color,源文件地址)
    })
    return colors
}
