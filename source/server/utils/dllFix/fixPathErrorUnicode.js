const path = require('path')
const fs = require('fs-extra')

export function setupDllPaths() {
    // 原始 DLL 文件的路径
    const 思源工作空间路径 = siyuanConfig.system.workspaceDir;
    const originalDllPath = path.join(思源工作空间路径, '/data/plugins/SACAssetsManager/node_modules/electron-edge-js/node_modules/edge-cs/lib/').replace(/\\/g, '/');
    // 新的软链接位置，位于磁盘根目录下的 .sac 文件夹
    const newDllLinkPath = path.join(process.env.ALLUSERSPROFILE, "sac").replace(/\\/g, '/');
    console.log(process.env);
    // 创建 .sac 目录如果它不存在
    if (!fs.existsSync(newDllLinkPath)) {
        fs.mkdirSync(newDllLinkPath, { recursive: true });
    }

    // 复制整个目录
    try {
        fs.copySync(originalDllPath, newDllLinkPath);
    } catch (e) {
        console.warn(e);
    }
    process.env.EDGE_CS_NATIVE = (path.join(newDllLinkPath, 'edge-cs.dll')).replace(/\\/g, '/');
    console.log('Symlink created and environment variable set:', process.env.EDGE_CS_NATIVE, process.env);
}
setupDllPaths();