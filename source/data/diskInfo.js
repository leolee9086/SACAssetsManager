const { exec } = window.require('child_process');
const { statfsSync, existsSync } = window.require('fs');
const outputFilePath = require('path').join(siyuan.config.system.workspaceDir, 'temp','sac','wmic_output.txt');

export function listLocalDisks() {
    return new Promise((resolve, reject) => {
        let disks = [];
        let diskInfos = []
        const platform = process.platform;
        if (platform === 'win32') {
            // Windows平台
            const command = `chcp 65001 && wmic logicaldisk get DeviceID,VolumeName,FileSystem,Size,FreeSpace >${outputFilePath} `;
            exec(command, { encoding: 'utf8' }, (error, stdout) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    reject(error)
                }
                // 获取输出中每个磁盘名称，通常是C:, D: 等
                const output = fs.readFileSync(outputFilePath,'utf16le')
                const lines = output.trim().split('\n').slice(1);

                lines.forEach(line => {
                    const [deviceId,  fileSystem, freeSpace,size, volumeName] = line.trim().split(/\s+/);
                    console.log(deviceId,  fileSystem, size, freeSpace,volumeName)
                    if (existsSync(deviceId + "/")) {
                        try {
                            const totalMB = parseInt(size) / (1024 * 1024);
                            const freeMB = parseInt(freeSpace) / (1024 * 1024);
                            diskInfos.push({
                                name: deviceId.trim(),
                                volumeName: volumeName&&volumeName.trim() || '本地磁盘', // 如果没有卷标，使用默认名称
                                Filesystem: fileSystem,
                                total: totalMB,
                                free: freeMB,
                                usedPercentage: ((totalMB - freeMB) / totalMB) * 100
                            });
                            console.log(diskInfos)
                        } catch (e) {
                            console.error(e);
                        }
                    }
                });
                resolve(diskInfos);
            });
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
