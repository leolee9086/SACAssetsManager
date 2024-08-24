import { genThumbnailColor } from '../processors/thumbnail/loader.js'
const colorCache = new Map()
export async function genColor(ctx,next){
    let { 源文件地址, 缓存键 } = ctx.stats
    if (!源文件地址) {
        res.status(400).send('Invalid request: missing source file address');
        return
    }
    if(colorCache.has(缓存键)){
        return colorCache.get(缓存键)
    }
    const colors = await genThumbnailColor(源文件地址)
    colorCache.set(缓存键,colors)
    return colors
}
