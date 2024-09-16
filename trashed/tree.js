global[Symbol.for('tree')] = globalThis[Symbol.for('tree')] || {
    disks: [],
    flatFiles: [],
    flatDirs: []
}
import { 永久监听文件夹条目 } from '../source/server/processors/fs/watch.js'
import { buildCache } from '../source/server/processors/cache/cache.js'
import { globalTaskQueue } from '../source/server/processors/queue/taskQueue.js'
import { 根据路径查找并加载颜色索引 } from '../source/server/processors/color/colorIndex.js'
import { 准备缩略图 } from '../source/server/processors/thumbnail/loader.js'
import { ignoreDir } from '../source/server/processors/fs/dirs/ignored.js'
import { parcel文件系统变化监听回调 } from '../source/server/processors/fs/cached/update.js'
const statPromisesArray = globalTaskQueue
export { statPromisesArray }
export const diskTree = global[Symbol.for('tree')]
const stat = require('fs').stat
const readdir = require('fs').readdirSync
const statSync = require('fs').statSync
const 遍历缓存 = buildCache('walk')
const statCache = buildCache('statCache')

export function pushPromise(promise) {
    return new Promise((resolve, reject) => {
        promise.then(() => {
            resolve()
        }).catch(e => {
            reject(e)
        })
    })
}
/***
 * 暂时没有用上,先取消导出
 */
 async function 构建磁盘目录树(diskLetter) {
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
    永久监听文件夹条目({
        path: disk.root,
        type: 'dir'
    }, parcel文件系统变化监听回调)

    console.log('构建磁盘目录树', disk.root)
    global[Symbol.for('tree')].disks.push(disk)
    根据路径查找并加载颜色索引(disk.root)
    return await 构建目录树(disk.root, true, disk, diskTree.flatDirs, diskTree.flatFiles)
}
let tasks = 0
export async function 构建目录树(root, withFlat = false, $rootItem, $flatDirs, $flatFiles,ignoreCache) {
    let rootItem = $rootItem || {
        name: root,
        path: root,
        subDirs: [],
        files: [],
    }
    if (withFlat) {
        rootItem.flatFiles = []
        rootItem.flatDirs = []
    }
    let totalTasks = 0
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
            遍历缓存.set(currentDir.replace(/\//g, '\\'), entries)
            遍历缓存.set(currentDir.replace(/\\/g, '/'), entries)
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
                if (ignoreDir.indexOf(entryName)===-1) {
                    if (!entryName.startsWith('.') && !entryName.startsWith('$')) {
                        let dirItem = {
                            name: entryName,
                            path: currentDir + entryName + '/',
                            subDirs: [],
                            files: [],
                            parent: currentDir,
                            type: 'dir'
                        }
                        tasks++;
                        if (statCache.get(dirItem.path)) {
                            tasks--
                            continue
                        }
                        statPromisesArray.push(
                            () => new Promise(async (resolve, reject) => {
                                try {
                                    await 递归构建目录树(dirItem)
                                    resolve(dirItem)
                                } catch (e) {
                                    resolve(e)
                                    tasks--
                                }
                            })
                        )
                        dirs.push(dirItem)
                        pushFlatDirs(dirItem)
                        tasks++
                        添加文件解析任务到任务队列(dirItem, tasks)
                    }
                } else {
                    dir.sacIndexed = true
                }
            } else {
                let fileItem = {
                    name: entryName,
                    path: currentDir + entryName,
                    parent: currentDir,
                    type: 'file'
                }
                files.push(fileItem)
                pushFlatFiles(fileItem)
                tasks++
                if (statCache.get(fileItem.path)) {
                    tasks--
                    continue
                }
                添加文件解析任务到任务队列(fileItem, tasks)
            }
        }
        tasks--
    }
    tasks++
    statPromisesArray.ended = () => {
        return tasks === 0
    }
    try {
        await 递归构建目录树(rootItem)
    } catch (e) {
        tasks--
        throw e
    }

    return { rootItem, statPromisesArray }
}

function 创建文件系统条目缓存(path, type, stats) {
    let cacheKey = path.replace(/\\/g, '/').replace(/\/\//g, '/')
    statCache.set(cacheKey, {
        path,
        type,
        ...stats
    })
}
/**
 * 这里这么长是因为之后还需要处理
 * @param {*} item 
 * @param {*} type 
 * @param {*} stats 
 */
function 合并文件系统条目(item, type, stats) {
    item.type = type
    item.atime = stats.atime
    item.atimeMs = stats.atimeMs
    item.birthtime = stats.birthtime
    item.birthtimeMs = stats.birthtimeMs
    item.blksize = stats.blksize
    item.blocks = stats.blocks
    item.blksize = stats.blksize
    item.blocks = stats.blocks
    item.ctime = stats.ctime
    item.ctimeMs = stats.ctimeMs
    item.dev = stats.dev
    item.gid = stats.gid
    item.ino = stats.ino
    item.mode = stats.mode
    item.mtime = stats.mtime
    item.mtimeMs = stats.mtimeMs
    item.nlink = stats.nlink
    item.rdev = stats.rdev
    item.size = stats.size
    item.uid = stats.uid
    item.rdev = stats.rdev
    item.size = stats.size
    item.uid = stats.uid
}
function 添加文件解析任务到任务队列(item, tasksCount) {
    statPromisesArray.push(
        () => new Promise((resolve, reject) => {
            stat(item.path, (err, stats) => {
                tasksCount--
                if (err) {
                    resolve({ path: item.path, error: err })
                } else {
                    try {
                        创建文件系统条目缓存(item.path, item.type, stats);
                        合并文件系统条目(item, item.type, stats);
                        (item.type === 'file' && statPromisesArray.push(
                            async () => {
                                准备缩略图(item.path)
                                return {item}
                            }
                        ))
                    } catch (e) {
                        resolve({ path: item.path, error: e })
                    }
                    resolve(item)
                }
            })
        })
    )
}
