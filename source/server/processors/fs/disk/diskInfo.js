import { listLocalDisksWin32 } from './win32.js'
import { getUnixDiskInfo } from './unix.js';
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
                await getUnixDiskInfo(resolve, reject);
            }
        } else {
            resolve(diskInfos)
        }
        return
    })
}
