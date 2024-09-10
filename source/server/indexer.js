import { 根据路径查找并加载颜色索引 } from "./processors/color/colorIndex.js";
import { listLocalDisks } from "./processors/fs/disk/diskInfo.js";
import { globalTaskQueue } from "./processors/queue/taskQueue.js";
let diskInfos= await listLocalDisks()

setImmediate(() => {
    let disks = diskInfos.map(d => d.name)
    const diskPromises = []
    disks.forEach(
        d=>{
            根据路径查找并加载颜色索引(d+'/')
        }
    )
    disks.forEach(d => {
        diskPromises.push(async () => {
            console.warn(d)
           console.time(`构建磁盘目录树${d}`)

            let result = await 构建磁盘目录树(d)
            console.timeEnd(`构建磁盘目录树${d}`)
           return result
        })
    });
    (async () => {
        console.time('buildIndex')
        for (let i = 0; i < diskPromises.length; i++) {
            setImmediate(globalTaskQueue.start); // 开始处理第一个Promise
        }
        console.timeEnd('buildIndex')
    })()
})
