const { existsSync } = window.require('fs');
const iconv = require('iconv-lite');
import { executeCommand } from '../../../../utils/system/commond.js';

/**
 * 获取 Windows 系统下的网络驱动器映射信息
 * @returns {Promise<Map<string, string>>} 返回一个 Promise，解析为包含驱动器映射的 Map 对象
 */
async function getNetworkDriveMapping() {
    try {
        const output = await executeCommand('net use', { encoding: 'buffer' });
        const mappings = new Map();
        const decodedOutput = iconv.decode(output, 'cp936');
        const lines = decodedOutput.split('\n');
        
        lines.forEach(line => {
            const match = line.match(/([A-Z]:)\s+(\\\\[^\r\n]+)/i);
            if (match) {
                let [_, driveLetter, uncPath] = match;
                uncPath = uncPath.replace(/\s+$/, '');
                mappings.set(driveLetter, uncPath);
            }
        });
        
        return mappings;
    } catch (error) {
        throw new Error(`获取网络驱动器映射失败: ${error.message}`);
    }
}

/**
 * 执行 WMIC 命令获取磁盘信息
 * @param {string} outputFilePath 输出文件路径
 * @returns {Promise<string>} 包含磁盘信息的文件内容
 */
async function executeWmicCommand(outputFilePath) {
    const command = `chcp 65001 && wmic logicaldisk get DeviceID,VolumeName,FileSystem,Size,FreeSpace,DriveType >${outputFilePath}`;
    return executeCommand(command, {
        useFile: true,
        outputPath: outputFilePath,
        fileEncoding: 'utf16le'
    });
}

/**
 * 解析磁盘信息行
 * @param {string} line 单行磁盘信息
 * @returns {Object|null} 解析后的磁盘信息对象
 */
function parseDiskInfoLine(line) {
    const [deviceId, driveType, fileSystem, freeSpace, size, volumeName] = line.trim().split(/\s+/);
    
    if (!existsSync(deviceId + "/")) {
        return null;
    }

    try {
        const totalMB = parseInt(size) / (1024 * 1024);
        const freeMB = parseInt(freeSpace) / (1024 * 1024);
        const isLocal = ['2', '3', '6'].includes(driveType);
        
        return {
            name: deviceId.trim(),
            volumeName: volumeName && volumeName.trim() || '本地磁盘',
            Filesystem: fileSystem,
            total: totalMB,
            free: freeMB,
            usedPercentage: ((totalMB - freeMB) / totalMB) * 100,
            isLocal: isLocal,
            driveType: parseInt(driveType)
        };
    } catch (e) {
        console.error(`解析磁盘信息失败: ${e}`);
        return null;
    }
}

/**
 * 获取 Windows 系统下的磁盘信息
 * @param {string} outputFilePath 临时输出文件路径
 * @returns {Promise<Array<Object>>} 磁盘信息数组
 */
export async function listLocalDisksWin32(outputFilePath) {
    try {
        const output = await executeWmicCommand(outputFilePath);
        const lines = output.trim().split('\n').slice(1);
        const diskInfos = [];

        for (const line of lines) {
            const diskInfo = parseDiskInfoLine(line);
            if (diskInfo) {
                diskInfos.push(diskInfo);
            }
        }

        return diskInfos;
    } catch (error) {
        throw new Error(`获取磁盘信息失败: ${error.message}`);
    }
}
