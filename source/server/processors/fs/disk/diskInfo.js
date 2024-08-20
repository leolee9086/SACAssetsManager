import { listLocalDisksWin32 } from './win32.js'
import { walkAsync } from '../walk.js';
const { exec } = window.require('child_process');
const { statfsSync } = window.require('fs');
const siyuan= window.siyuan||{config:window.siyuanConfig}
const outputFilePath = require('path').join(siyuan.config.system.workspaceDir, 'temp','sac','wmic_output.txt');





export function listLocalDisks() {
    return new Promise((resolve, reject) => {
        let disks = [];
        let diskInfos = []
        const platform = process.platform;
        if (platform === 'win32') {
            // Windows平台
            try{
                diskInfos = listLocalDisksWin32(outputFilePath)
         
                resolve(diskInfos)
            }catch(e){
                console.error(e)
                reject(e)
            }
            return
        } else {
            // Unix-like平台
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
            });
        }
    })
}
