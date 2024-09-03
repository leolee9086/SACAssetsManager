const fastGlob = require('fast-glob');
import { fdir } from '../processors/fs/fdirModified/index.js';
import {buildCache} from '../processors/cache/cache.js'
const 遍历缓存 = buildCache('walk')
async function countEntries(dir) {
    let fileCount = 0
    let folderCount = 0

    let api = new fdir()
    .withMaxDepth(1)
    .withDirs()
    .withCache(遍历缓存)
    .filter(async (path,isDir)=>{
        if(isDir){
            folderCount++
        }else{
            fileCount++
        }
        return true
    })
    .crawl(dir)
    await api.withPromise()
    return {
        name: dir.split('/').pop(),
        fileCount: fileCount,
        folderCount: folderCount,
        show: true
    };
}
async function getTopLevelFoldersInfo(rootDir, maxCount=100) {
    const topLevelFolders = await fastGlob(['*'], { cwd: rootDir, onlyDirectories: true, absolute: true, suppressErrors: true, dot: true });
    let folderInfoPromises = []
    for (let i = 0; i < maxCount; i++) {
        let folderPath = topLevelFolders[i]
        folderPath&&folderInfoPromises.push(
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