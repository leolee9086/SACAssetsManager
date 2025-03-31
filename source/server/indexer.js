import { 根据路径查找并加载颜色索引 } from "./processors/color/colorIndex.js";
import { listLocalDisks } from "./processors/fs/disk/diskInfo.js";
import { globalTaskQueue } from "./processors/queue/taskQueue.js";
import { 日志 } from '../../src/toolBox/base/useEcma/forLogs/useLogger.js';

let diskInfos = await listLocalDisks()
setImmediate(() => {
    let disks = diskInfos.map(d => d.name)
    const diskPromises = []
    disks.forEach(
        d => {
            根据路径查找并加载颜色索引(d + '/')
        }
    )
    disks.forEach(d => {
        diskPromises.push(async () => {
            日志.警告(`开始处理磁盘: ${d}`, 'Indexer');
            const startTime = Date.now();
            let result = await 构建磁盘目录树(d)
            const endTime = Date.now();
            日志.信息(`磁盘 ${d} 目录树构建完成，耗时: ${endTime - startTime}ms`, 'Indexer');
            return result
        })
    });
    (async () => {
        const startTime = Date.now();
        日志.信息('开始构建索引', 'Indexer');
        for (let i = 0; i < diskPromises.length; i++) {
            setImmediate(globalTaskQueue.start); // 开始处理第一个Promise
        }
        const endTime = Date.now();
        日志.信息(`索引构建完成，总耗时: ${endTime - startTime}ms`, 'Indexer');
    })()
})
