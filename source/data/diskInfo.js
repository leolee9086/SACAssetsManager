const { exec } = window.require('child_process');
const { statfsSync, existsSync } = window.require('fs');

export function listLocalDisks() {
    return new Promise((resolve, reject) => {
        let disks = [];
        let diskInfos = []
        const platform = process.platform;
        if (platform === 'win32') {
            // Windows平台
            const command = 'wmic logicaldisk get name';
            exec(command, (error, stdout) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    reject(error)
                }
                // 获取输出中每个磁盘名称，通常是C:, D: 等
                disks = stdout.split('\n').filter(Boolean).map(disk => disk.trim()).filter(letter => { return existsSync(letter + "/") })
                disks.forEach(disk => {
                    try {
                        let stats = statfsSync(`\\\\.\\${disk}`)
                        stats && diskInfos.push(
                            {
                                name: disk,
                                Filesystem: stats.type,
                                /**MB */
                                total: stats.blocks * stats.bsize / 1024 / 1024,
                                free: stats.bfree * stats.bsize / 1024 / 1024,
                                usedPercentage:stats.bfree/stats.blocks*100
                            }
                        )
                    } catch (e) {
                        console.error(e)
                    }
                });
                resolve(diskInfos)
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
