import { listLocalDisksWin32 } from './win32.js'
import { 构建磁盘目录树 } from './tree.js'
const { exec } = window.require('child_process');
const { statfsSync } = window.require('fs');
const siyuan = window.siyuan || { config: window.siyuanConfig }
const outputFilePath = require('path').join(siyuan.config.system.workspaceDir, 'temp', 'sac', 'wmic_output.txt');
let diskInfos = []
const platform = process.platform;
export function listLocalDisks() {
    return new Promise(async (resolve, reject) => {
        if (!diskInfos[0]) {
            if (platform === 'win32') {
                diskInfos = await listLocalDisksWin32(outputFilePath)
                resolve(diskInfos)
            } else {
                const command = 'df -P | tail -n +2';
                exec(command, (error, stdout) => {
                    if (error) {
                        console.error(`exec error: ${error}`);
                        reject(error)
                    }
                    // 获取输出中每个磁盘的设备和挂载点
                    const lines = stdout.split('\n');
                    lines.forEach(line => {
                        try {
                            const parts = line.split(/\s+/);
                            if (parts.length > 1) {
                                const device = parts[0];
                                disks.push(device);
                                let stats = statfsSync(`/dev/${device}`)
                                stats && diskInfos.push(
                                    {
                                        name: device,
                                        Filesystem: stats.type,
                                        /**MB */
                                        total: stats.blocks * stats.bsize / 1024 / 1024,
                                        free: stats.bfree * stats.bsize / 1024 / 1024
                                    }
                                )
                            }
                        } catch (e) {
                            console.error(e)
                        }
                    });
                    resolve(diskInfos)
                });
            }
            setImmediate(() => {
                let disks = diskInfos.map(d => d.name)
                const diskPromises = []
                disks.forEach(d => {
                    diskPromises.push(async () => {
                        console.log(d)
                        console.time(`构建磁盘目录树${d}`)
                        let result = await 构建磁盘目录树(d)
                        console.timeEnd(`构建磁盘目录树${d}`)
                        return result
                    })
                });
                (async () => {
                    console.time('buildIndex')
                    let statPromises = []
                    let index = 0
                    let timeout = 100
                    let isProcessing = false
                    function processNext() {
                        let jump = false
                        if (isProcessing) {
                            jump = true
                        }
                        isProcessing = true
                        if (statPromises.length && !statPromises.paused && !jump) {
                            if (index % 10000 == 0||statPromises.length<1000) {
                               console.log('processNext', index, statPromises.length, timeout)
                            }
                            index++;

                            (statPromises.pop())().then(stat => {

                            });
                            setImmediate(
                                processNext // 递归调用以处理下一个Promise
                                , timeout)

                            // 处理stat
                            timeout = Math.max(timeout / 2, 10)
                        } else {
                            if (!statPromises.ended()) {
                                if (index % 10000 == 0||statPromises.length<1000) {

                                    console.log('processNextLater', index, statPromises.length, timeout)
                                }

                                timeout = Math.min(timeout * 2, 1000)
                                setTimeout(
                                    processNext // 递归调用以处理下一个Promise
                                    , timeout)
                            }
                        }
                        isProcessing = false
                    }
                    for (let i = 0; i < diskPromises.length; i++) {
                        statPromises = (await diskPromises[i]()).statPromisesArray
                        setImmediate(processNext); // 开始处理第一个Promise
                    }
                    console.timeEnd('buildIndex')
                })()
            })

        } else {
            resolve(diskInfos)
        }
        return
        if (platform === 'win32') {
            // Windows平台
            try {
                diskInfos = listLocalDisksWin32(outputFilePath)
                resolve(diskInfos)
                disks = diskInfos.map(d => d.name)
                disks.forEach(d => {
                    构建磁盘目录树(d)
                })
            } catch (e) {
                console.error(e)
                reject(e)
            }
            return
        } else {
            // Unix-like平台
        }
    })
}
