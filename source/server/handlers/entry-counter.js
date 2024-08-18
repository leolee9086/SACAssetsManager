const fastGlob = require('fast-glob');

async function countEntries(dir) {
    const files = await fastGlob(['*'], { cwd: dir + '/', absolute: true, onlyFiles: true, suppressErrors: true, dot: true });
    const folders = await fastGlob(['*'], { cwd: dir + '/', absolute: true, onlyDirectories: true, suppressErrors: true, dot: true });
    console.log(dir,files,folders)
    return {
        name: dir.split('/').pop(),
        fileCount: files.length,
        folderCount: folders.length,
        show: true

    };
}

async function getTopLevelFoldersInfo(rootDir, maxCount=1000) {
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
    console.log(data)
    res.end(JSON.stringify(data.slice(0, maxCount)))
}