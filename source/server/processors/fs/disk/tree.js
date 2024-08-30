global[Symbol.for('tree')] = globalThis[Symbol.for('tree')] || {
    disks: [],
    flatFiles: [],
    flatDirs: []
}
import { buildCache } from '../../cache/cache.js'
const statPromisesArray = []
global[Symbol.for('statPromises')] = globalThis[Symbol.for('statPromises')] ||statPromisesArray
export {statPromisesArray}
export const diskTree = global[Symbol.for('tree')]
const stat = require('fs').stat
const readdir = require('fs').readdirSync
export function pushPromise(promise) {
    return new Promise((resolve, reject) => {
        promise.then(() => {
            resolve()
        }).catch(e => {
            reject(e)
        })
    })
}
export async function 构建磁盘目录树(diskLetter) {
    let disk = {
        letter: diskLetter,
        root: diskLetter + '/',
        subDirs: [],
        files: [],
        name: diskLetter,
        path: diskLetter + '/',
        sacIndexed: false,
        stats: null,
        flatFiles: [],
        flatDirs: []
    }
    global[Symbol.for('tree')].disks.push(disk)
    return await 构建目录树(disk.root, true, disk, diskTree.flatDirs, diskTree.flatFiles)
}
let tasks = 0
const 遍历缓存 = buildCache('walk')
const statCache = buildCache('statCache')
import { 根据路径查找并加载颜色索引 } from '../../color/colorIndex.js'
export async function 构建目录树(root, withFlat = false, $rootItem, $flatDirs, $flatFiles) {
    console.log(root)
    let rootItem = $rootItem || {
        name: root,
        path: root,
        subDirs: [],
        files: [],
    }
    根据路径查找并加载颜色索引(root)  
    if (withFlat) {
        rootItem.flatFiles = []
        rootItem.flatDirs = []
    }
    let totalTasks = 0
    let stated = 0
    let { flatFiles, flatDirs } = rootItem
    const pushFlatFiles = (dir) => {
        if (withFlat) {
            flatFiles.push(dir)
            $flatFiles.push(dir)
        }
    }
    const pushFlatDirs = (dir) => {
        if (withFlat) {
            flatDirs.push(dir)
            $flatDirs.push(dir)
        }
    }
    let options = {
        withFileTypes: true
    }
    async function 递归构建目录树(dir) {
        let entries = []
        let dirs = dir.subDirs
        let currentDir = dir.path
        const files = dir.files

        try {
            entries = readdir(currentDir, options)
            遍历缓存.set(currentDir.replace(/\//g,'\\'),entries)
            totalTasks += entries.length
        } catch (e) {
            dir.error = e.message
            tasks--
            return
        }
        for (let i = 0; i < entries.length; i++) {
            let entry = entries[i]
            let entryName = entry.name
            if (entry.isDirectory()) {
                if (entryName !== '.sac') {
                    if (!entryName.startsWith('.') && !entryName.startsWith('$')) {
                        let dirItem = {
                            name: entryName,
                            path: currentDir + entryName + '/',
                            subDirs: [],
                            files: [],
                            parent: currentDir
                        }
                        tasks++;
                        statPromisesArray.push(
                            ()=>  new Promise(async (resolve, reject) => {
                                try {
                                    await 递归构建目录树(dirItem)
                                    resolve()
                                } catch (e) {
                                    resolve()
                                    tasks--
                                }
                            })
                        )
                        dirs.push(dirItem)
                        pushFlatDirs(dirItem)
                        tasks++
                        statPromisesArray.push(
                            ()=>   new Promise((resolve, reject) => {
                                stat(dirItem.path, (err, stats) => {
                                    tasks--
                                    if (err) {
                                        resolve()
                                    } else {
                                        statCache.set(
                                            dirItem.path.replace(/\\/g,'/').replace(/\/\//g,'/'),
                                            {
                                                path:dirItem.path,
                                                type:'dir',
                                                ...stats,
                                            }
                                        )
                                        dirItem.type = 'dir'
                                        dirItem.atime = stats.atime
                                        dirItem.atimeMs = stats.atimeMs
                                        dirItem.birthtime = stats.birthtime
                                        dirItem.birthtimeMs = stats.birthtimeMs
                                        dirItem.blksize = stats.blksize
                                        dirItem.blocks = stats.blocks
                                        dirItem.blksize = stats.blksize
                                        dirItem.blocks = stats.blocks
                                        dirItem.ctime = stats.ctime
                                        dirItem.ctimeMs = stats.ctimeMs
                                        dirItem.dev = stats.dev
                                        dirItem.gid = stats.gid
                                        dirItem.ino = stats.ino
                                        dirItem.mode = stats.mode
                                        dirItem.mtime = stats.mtime
                                        dirItem.mtimeMs = stats.mtimeMs
                                        dirItem.nlink = stats.nlink
                                        dirItem.rdev = stats.rdev
                                        dirItem.size = stats.size
                                        dirItem.uid = stats.uid
                                        dirItem.rdev = stats.rdev
                                        dirItem.size = stats.size
                                        dirItem.uid = stats.uid
                                        resolve()
                                    }
                                })
                            })
                        )
                    }
                } else {
                    dir.sacIndexed = true
                }
            } else {
                let fileItem = {
                    name: entryName,
                    path: currentDir + entryName,
                    parent: currentDir
                }
                files.push(fileItem)
                pushFlatFiles(fileItem)
                tasks++
                statPromisesArray.push(
                  ()=>  new Promise((resolve, reject) => {
                        stat(fileItem.path, (err, stats) => {
                            tasks--
                            if (err) {
                                resolve()
                            } else {
                                statCache.set(
                                    fileItem.path.replace(/\\/g,'/').replace(/\/\//g,'/'),
                                    {
                                        path:fileItem.path,
                                        type:'file',
                                        ...stats,
                                    }
                                )

                                fileItem.stats = stats
                                fileItem.type = 'file'
                                fileItem.atime = stats.atime
                                fileItem.atimeMs = stats.atimeMs
                                fileItem.birthtime = stats.birthtime
                                fileItem.birthtimeMs = stats.birthtimeMs
                                fileItem.blksize = stats.blksize
                                fileItem.blocks = stats.blocks
                                fileItem.blksize = stats.blksize
                                fileItem.blocks = stats.blocks
                                fileItem.ctime = stats.ctime
                                fileItem.ctimeMs = stats.ctimeMs
                                fileItem.dev = stats.dev
                                fileItem.gid = stats.gid
                                fileItem.ino = stats.ino
                                fileItem.mode = stats.mode
                                fileItem.mtime = stats.mtime
                                fileItem.mtimeMs = stats.mtimeMs
                                fileItem.nlink = stats.nlink
                                fileItem.rdev = stats.rdev
                                fileItem.size = stats.size
                                fileItem.uid = stats.uid
                                fileItem.rdev = stats.rdev
                                fileItem.size = stats.size
                                fileItem.uid = stats.uid
                                resolve()
                            }
                        })
                    })
                )
            }
        }
        tasks--
    }
    tasks++
    statPromisesArray.ended =()=>{
        return tasks === 0
    }
    try {
        await 递归构建目录树(rootItem)
    } catch (e) {
        tasks--
        throw e
    }
    return {rootItem,statPromisesArray}
}
