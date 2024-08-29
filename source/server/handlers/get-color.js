import { genThumbnailColor } from '../processors/thumbnail/loader.js'
import { 添加到颜色索引,找到文件颜色 } from '../processors/color/colorIndex.js'
import { awaitForEach } from '../../utils/array/walk.js'
export async function genColor(ctx,next){
    let { 源文件地址, 缓存键 } = ctx.stats
    if (!源文件地址) {
        res.status(400).send('Invalid request: missing source file address');
        return
    }
    let color=await 找到文件颜色(源文件地址)
    if(color){
        return color
    }
    let callback = async (colorItem,index)=>{
        添加到颜色索引(colorItem,源文件地址)
    }
    const colors = await genThumbnailColor(源文件地址)
    colors&&await awaitForEach(colors,callback)
    return colors
}
