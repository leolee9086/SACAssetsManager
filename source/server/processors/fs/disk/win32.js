const { exec } = window.require('child_process');
const { statfsSync, existsSync } = window.require('fs');

/**
 * windows平台下调用这个函数
 * 调用wmic命令获取磁盘信息
 * @param {string} outputFilePath 输出文件路径
 * @returns {Array} 磁盘信息
 */
export function listLocalDisksWin32(outputFilePath){
    let diskInfos = []
    const command = `chcp 65001 && wmic logicaldisk get DeviceID,VolumeName,FileSystem,Size,FreeSpace >${outputFilePath} `;
    exec(command, { encoding: 'utf8' }, (error, stdout) => {
        if (error) {
            console.error(`exec error: ${error}`);
            throw error
        }
    });
    const output = fs.readFileSync(outputFilePath,'utf16le')
    const lines = output.trim().split('\n').slice(1);
    lines.forEach(line => {
        const [deviceId,  fileSystem, freeSpace,size, volumeName] = line.trim().split(/\s+/);
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
    return diskInfos
}
