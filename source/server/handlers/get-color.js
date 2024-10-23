import { genThumbnailColor } from '../processors/thumbnail/loader.js'
import { 找到文件颜色, 删除文件颜色记录, 流式根据颜色查找内容 } from '../processors/color/colorIndex.js'
import { statWithCatch } from '../processors/fs/stat.js';
import { statPromisesArray } from '../../../trashed/tree.js'
import { stat2assetsItemStringLine } from './utils/responseType.js';

export async function genColor(ctx, next) {
    statPromisesArray.paused = true
    let { 源文件地址, 缓存键, 重新计算文件颜色 } = ctx.stats
    if (!源文件地址) {
        ctx.res.status(400).send('Invalid request: missing source file address');
        return
    }
    /**
     * 如果传入参数中有重新计算的话
     */
    if(重新计算文件颜色){
       await 删除文件颜色记录(源文件地址)
    }
    const start= performance.now()
    try{
    let color = await 找到文件颜色(源文件地址)
    console.log('查找颜色耗时',performance.now()-start,color)
    if (color&&color[0]) {
        return color
    }

    const colors = await genThumbnailColor(源文件地址)
    statPromisesArray.paused = false
    return colors
    }catch(e){
        console.error(e)
        ctx.res.status(500).json({error:`为${源文件地址}生成颜色色板错误\n${e.message}`});
        return

    }
}


export async function getFilesByColor(ctx, next) {
    statPromisesArray.paused = true
    let { color, accurity } = ctx.stats
    //设置响应头
    ctx.res.writeHead(200, {
        "Content-Type": "text/plain;charset=utf-8",
    });
    //没有compression中间件的情况下,也就没有res.flush方法
    ctx.res.flushHeaders()
    let sended={}
    let cb =(file,count)=> requestIdleCallback(async () => {
        const statProxy = await statWithCatch(file)
        const result = stat2assetsItemStringLine(statProxy)
        if(!sended[result]){
            ctx.res.write(result)
        }
        sended[result]=true
        count--
        count===0 &&ctx.res.end()
    }, { timeout: 17, deadline: 18 })
    流式根据颜色查找内容(color, accurity, cb,ctx.res.end)
    statPromisesArray.paused = false
}