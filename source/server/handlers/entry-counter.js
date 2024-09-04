import { fdir } from '../processors/fs/fdirModified/index.js';
import { buildCache } from '../processors/cache/cache.js'
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
    let api = new fdir().withCache(遍历缓存).withMaxDepth(1).withDirs().filter((path, isDir) => {
        if (isDir) {
            topLevelFolders2.push(path.replace(/\\/g, '/'))
        }
        return isDir
    }).crawl(rootDir)
    await api.withPromise()
    topLevelFolders2 = topLevelFolders2.filter(item => item.replace(/\\/g, '/') !== rootDir.replace(/\\/g, '/'))
    let folderInfoPromises = []
    for (let i = 0; i < topLevelFolders2.length; i++) {
        let folderPath = topLevelFolders2[i]
        folderPath && folderInfoPromises.push(
            countEntries(folderPath)
        )
    }
    const topLevelFoldersInfo = (await Promise.all(folderInfoPromises)).filter(item => item);
    return topLevelFoldersInfo;
}
export const entryCounter = async (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    const root = req.query.root
    let maxCount = req.query.maxCount
    let data = await getTopLevelFoldersInfo(root, maxCount)
    res.end(JSON.stringify(data.slice(0, maxCount)))
}