const { exec } = window.require('child_process');
const { statfsSync } = window.require('fs');

export function getUnixDiskInfo(resolve, reject) {
    const command = 'df -P | tail -n +2';
    exec(command, (error, stdout) => {
        if (error) {
            console.error(`exec error: ${error}`);
            reject(error);
            return;
        }
        parseUnixDiskInfo(stdout);
        resolve(diskInfos);
    });
}

function parseUnixDiskInfo(stdout) {
    const lines = stdout.split('\n');
    lines.forEach(line => {
        try {
            const parts = line.split(/\s+/);
            if (parts.length > 1) {
                const device = parts[0];
                disks.push(device);
                addUnixDiskStats(device);
            }
        } catch (e) {
            console.error(e);
        }
    });
}

function addUnixDiskStats(device) {
    let stats = statfsSync(`/dev/${device}`);
    if (stats) {
        diskInfos.push({
            name: device,
            Filesystem: stats.type,
            /**MB */
            total: stats.blocks * stats.bsize / 1024 / 1024,
            free: stats.bfree * stats.bsize / 1024 / 1024
        });
    }
}
