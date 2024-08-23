import { genThumbnailColor } from '../processors/thumbnail/color.js'
export async function genColor(ctx,next){
    let { 源文件地址, 缓存键 } = ctx.stats
    if (!源文件地址) {
        res.status(400).send('Invalid request: missing source file address');
        return
    }
    const colors = await genThumbnailColor(源文件地址)
    console.log(colors)
    return colors
}