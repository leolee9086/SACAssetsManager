import { fdir } from '../processors/fs/fdirModified/index.js';
import { buildCache } from '../processors/cache/cache.js'
import { 日志 } from '../utils/logger.js';

const 遍历缓存 = buildCache('walk')

async function countEntries(dir) {
    return new Promise(async(resolve, reject) => {
        let fileCount = 0
        let folderCount = 0
        let api = new fdir()
            .withMaxDepth(1)
            .withDirs()
            .withCache(遍历缓存)
            .filter((path, isDir) => {
                if (isDir && path !== dir && path.replace(/\\/g, '/') !== dir.replace(/\\/g, '/')) {
                    folderCount++
                } else {
                    fileCount++
                }
                return true
            })
            .crawl(dir)
        await api.withPromise()
        日志.信息(`目录统计完成: ${dir}, 文件数: ${fileCount}, 文件夹数: ${folderCount}`, 'EntryCounter');
        resolve({
            name: dir.split('/')[dir.split('/').length - 2],
            fileCount: fileCount,
            folderCount: folderCount,
            show: true
        });
    })
}

async function getTopLevelFoldersInfo(rootDir, maxCount = 100) {
    let topLevelFolders2 = []
    日志.信息(`开始获取顶层文件夹信息: ${rootDir}, 最大数量: ${maxCount}`, 'EntryCounter');
    let api = new fdir().withCache(遍历缓存).withMaxDepth(1).withDirs().filter((path, isDir) => {
        if (isDir) {
            topLevelFolders2.push(path.replace(/\\/g, '/'))
        }
        return isDir
    }).crawl(rootDir)
    await api.withPromise()
    日志.信息(`找到顶层文件夹: ${JSON.stringify(topLevelFolders2)}`, 'EntryCounter');
    topLevelFolders2 = topLevelFolders2.filter(item => item.replace(/\\/g, '/') !== rootDir.replace(/\\/g, '/'))
    let folderInfoPromises = []
    日志.信息(`过滤后的顶层文件夹: ${JSON.stringify(topLevelFolders2)}`, 'EntryCounter');
    for (let i = 0; i < topLevelFolders2.length; i++) {
        let folderPath = topLevelFolders2[i]
        folderPath && folderInfoPromises.push(
            countEntries(folderPath)
        )
    }
    const topLevelFoldersInfo = (await Promise.all(folderInfoPromises)).filter(item => item);
    日志.信息(`获取顶层文件夹信息完成: ${JSON.stringify(topLevelFoldersInfo)}`, 'EntryCounter');
    return topLevelFoldersInfo;
}

export const entryCounter = async (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    const root = req.query.root
    let maxCount = req.query.maxCount
    日志.信息(`开始处理目录计数请求: ${root}, 最大数量: ${maxCount}`, 'EntryCounter');
    let data = await getTopLevelFoldersInfo(root, maxCount)
    日志.信息(`目录计数完成: ${JSON.stringify(data)}`, 'EntryCounter');
    res.end(JSON.stringify(data.slice(0, maxCount)))
}