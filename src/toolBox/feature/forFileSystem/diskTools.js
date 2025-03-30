/**
 * 磁盘工具模块
 * 
 * 提供用于获取和操作本地磁盘信息的功能，包括列出磁盘、获取磁盘信息等。
 */

/**
 * 列出本地磁盘
 * @returns {Promise<Array>} 磁盘信息数组
 */
export async function listLocalDisks() {
    // 检查是否为Electron环境
    if (typeof window.require !== 'function') {
        console.error('非Electron环境，无法获取磁盘信息');
        return [];
    }

    try {
        const os = window.require('os');
        const fs = window.require('fs');
        const path = window.require('path');
        const { promisify } = window.require('util');
        
        const readdir = promisify(fs.readdir);
        const stat = promisify(fs.stat);
        
        // Windows系统
        if (os.platform() === 'win32') {
            // 获取可用磁盘盘符
            const drives = [];
            // 尝试A-Z盘符
            for (let i = 65; i <= 90; i++) {
                const driveLetter = String.fromCharCode(i);
                const drivePath = `${driveLetter}:\\`;
                
                try {
                    const stats = await stat(drivePath);
                    if (stats) {
                        // 获取磁盘信息
                        const diskInfo = await getDiskInfo(drivePath);
                        if (diskInfo) {
                            drives.push(diskInfo);
                        }
                    }
                } catch (e) {
                    // 忽略不存在的盘符
                }
            }
            return drives;
        }
        
        // macOS系统
        if (os.platform() === 'darwin') {
            const volumesPath = '/Volumes';
            const entries = await readdir(volumesPath);
            
            const drives = [];
            for (const entry of entries) {
                const volumePath = path.join(volumesPath, entry);
                const diskInfo = await getDiskInfo(volumePath);
                if (diskInfo) {
                    drives.push(diskInfo);
                }
            }
            return drives;
        }
        
        // Linux系统
        if (os.platform() === 'linux') {
            const mtabPath = '/etc/mtab';
            const mtabContent = await promisify(fs.readFile)(mtabPath, 'utf8');
            
            const drives = [];
            const lines = mtabContent.split('\n');
            
            for (const line of lines) {
                const parts = line.split(' ');
                if (parts.length >= 2) {
                    const mountPath = parts[1];
                    
                    // 仅包含常见的挂载点
                    if (mountPath.startsWith('/media/') || 
                        mountPath.startsWith('/mnt/') || 
                        mountPath === '/' || 
                        mountPath === '/home') {
                        
                        const diskInfo = await getDiskInfo(mountPath);
                        if (diskInfo) {
                            drives.push(diskInfo);
                        }
                    }
                }
            }
            return drives;
        }
        
        return [];
    } catch (error) {
        console.error('获取磁盘列表失败:', error);
        return [];
    }
}

/**
 * 获取指定路径的磁盘信息
 * @param {string} path 磁盘路径
 * @returns {Promise<Object|null>} 磁盘信息对象
 */
export async function getDiskInfo(path) {
    if (typeof window.require !== 'function') {
        console.error('非Electron环境，无法获取磁盘信息');
        return null;
    }

    try {
        const fs = window.require('fs');
        const os = window.require('os');
        const { promisify } = window.require('util');
        const childProcess = window.require('child_process');
        const exec = promisify(childProcess.exec);
        
        let volumeName = '';
        let name = path;
        
        // Windows系统获取卷标
        if (os.platform() === 'win32') {
            try {
                // 获取Windows磁盘卷标
                const { stdout } = await exec(`wmic logicaldisk where "DeviceID='${path[0]}:'" get VolumeName`);
                const lines = stdout.trim().split('\n');
                if (lines.length > 1) {
                    volumeName = lines[1].trim();
                }
                name = path[0];
            } catch (e) {
                volumeName = '';
            }
        } else {
            // 非Windows系统使用路径名
            const pathParts = path.split('/');
            name = pathParts[pathParts.length - 1] || path;
            volumeName = name;
        }
        
        // 获取磁盘空间信息
        const stats = await promisify(fs.statfs)(path);
        
        // 计算总容量、已用空间和可用空间（MB）
        const total = stats.blocks * stats.bsize / (1024 * 1024);
        const free = stats.bfree * stats.bsize / (1024 * 1024);
        const used = total - free;
        const usedPercentage = (used / total) * 100;
        
        return {
            name,
            path,
            volumeName: volumeName || name,
            total,
            free,
            used,
            usedPercentage
        };
    } catch (error) {
        console.error(`获取磁盘 ${path} 信息失败:`, error);
        return null;
    }
}

/**
 * 创建磁盘选择对话框内容
 * @param {Array} disks 磁盘信息数组
 * @returns {string} 对话框HTML内容
 */
export function createDiskSelectionPanelHTML(disks) {
    return `
        <div id="diskSelectionPanel" class='fn__flex-column' style="pointer-events:auto;z-index:5;max-height:80vh; background-color: #f9f9f9; border-radius: 8px; padding: 16px;">
            <h3 style="margin-bottom: 16px;">选择磁盘</h3>
            <ul id="diskList" style="list-style-type: none; padding: 0;">
                ${disks.map(disk => `
                    <li class="disk-item" data-path="${disk.name}/" style="cursor: pointer; padding: 8px; border-bottom: 1px solid #ddd; transition: background-color 0.3s;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span>${disk.volumeName} (${disk.name})</span>
                            <span>${(disk.total / 1024).toFixed(2)} GB 总计</span>
                            <span>${(disk.free / 1024).toFixed(2)} GB 可用</span>
                            <div style="width: 100px; height: 10px; background-color: #e0e0e0; border-radius: 5px; overflow: hidden; margin-left: 10px;">
                                <div style="width: ${Math.floor(disk.usedPercentage)}%; height: 100%; background-color: #76c7c0;"></div>
                            </div>
                        </div>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
}

// 英文别名
export const getLocalDisks = listLocalDisks;
export const getDriveInfo = getDiskInfo;
export const createDiskSelectionHTML = createDiskSelectionPanelHTML; 