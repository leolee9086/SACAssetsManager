const fs = require('fs');
const path = require('path');

const { Readable } = require('stream');
const fastGlob = require('fast-glob');
const { pipeline } = require('stream');

async function countEntries(dir) {
    console.log(dir)
    const files = await fastGlob(['*'], { cwd: dir+'/', absolute: true, onlyFiles: true ,suppressErrors:true,dot:false});
    const folders = await fastGlob(['*'], { cwd: dir+'/', absolute: true, onlyDirectories: true,suppressErrors:true,dot:false });

    return {
        fileCount: files.length,
        folderCount: folders.length
    };
}

async function getTopLevelFoldersInfo(rootDir) {
    console.log(rootDir)
    const topLevelFolders = await fastGlob(['*'], { cwd: rootDir, onlyDirectories: true, absolute: true ,suppressErrors:true,dot:false});

    const folderInfoPromises = topLevelFolders.map(folderPath => {

        return countEntries(folderPath).then(counts => ({
            name: folderPath.split('/').pop(),
            fileCount: counts.fileCount,
            folderCount: counts.folderCount,
            show: true
        }));
    });

    const topLevelFoldersInfo = (await Promise.all(folderInfoPromises)).filter(item => item);

    return topLevelFoldersInfo;
}
export  const entryCounter= async (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    const root = req.query.root
    let data=await getTopLevelFoldersInfo(root)
    console.log(data)
    res.end(JSON.stringify(data))
}