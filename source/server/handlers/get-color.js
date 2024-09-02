import { genThumbnailColor } from '../processors/thumbnail/loader.js'
import { 添加到颜色索引,找到文件颜色, 根据颜色查找内容 } from '../processors/color/colorIndex.js'
import { awaitForEach } from '../../utils/array/walk.js'
import { statWithCatch } from '../processors/fs/stat.js';
import { statPromisesArray } from '../processors/fs/disk/tree.js'
export async function genColor(ctx,next){
    statPromisesArray.paused = true
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
    statPromisesArray.paused = false
    return colors
}
export async function getFilesByColor(ctx,next){
    statPromisesArray.paused = true
    let {color,accurity}= ctx.stats
    let files = await 根据颜色查找内容(color,accurity)
    let statPromise  = files.map(
        file=>{
            return statWithCatch(file)
        }
    )
    const result = statPromise.map(
        statProxy=>{
            const { name, path, type, size, mtime, mtimems, error } = statProxy;
            return { name, path, id: `localEntrie_${path}`, type: 'local', size, mtime, mtimems, error }
        }
    )
    ctx.res.json(result)
    statPromisesArray.paused = false
}
