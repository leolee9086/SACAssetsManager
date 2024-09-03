global[Symbol.for('tree')] = globalThis[Symbol.for('tree')] || {
    disks: [],
    flatFiles: [],
    flatDirs: []
}
import { 监听文件夹条目 } from '../watch.js'
import { buildCache } from '../../cache/cache.js'
const statPromisesArray = []
global[Symbol.for('statPromises')] = globalThis[Symbol.for('statPromises')] || statPromisesArray
export { statPromisesArray }
export const diskTree = global[Symbol.for('tree')]
const stat = require('fs').stat
const readdir = require('fs').readdirSync
const statSync = require('fs').statSync
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
    监听文件夹条目({
        path: disk.root,
        type: 'dir'
    },async (error, entries) => {
        if (error) {
            console.error('文件系统变化监听错误', error,entries)
            return
        }
        try {
            console.log('文件系统变化', event, entries)
            entries.forEach(entry => {
                let path = entry.path
                let eventType = entry.type
                path = path.replace(/\\/g, '/').replace(/\/\//g, '/')
                if(eventType === 'delete'){
                    遍历缓存.delete(path)
                    遍历缓存.delete(path.replace(/\//g, '\\'))
                    statCache.delete(path)
                    statCache.delete(path.replace(/\//g, '\\'))
                    return
                }
                statPromisesArray.push(() => {
                    return new Promise((resolve, reject) => {
                        try {
                            if(!require('fs').existsSync(path)){
                                resolve({path,error:'文件不存在'})
                                return
                            }
                            let stats = statSync(path)
                            let isDir = stats.isDirectory()
                            if (isDir) {
                                let entries = readdir(path, { withFileTypes: true })
                                遍历缓存.set(path.replace(/\//g, '\\'), entries)
                                遍历缓存.set(path, entries)
                                statCache.set(path, {
                                    path,
                                    type: 'dir',
                                    ...stats
                                })
                            } else {
                                let dir = path.split('/').slice(0, -1).join('/')
                                let entries =readdir(dir, { withFileTypes: true })
                                遍历缓存.set(dir, entries)
                                statCache.set(path, {
                                    path,
                                    type: 'file',
                                    ...stats
                                })
                            }
                            resolve(stats)
                        } catch (e) {
                            console.error('文件系统变化监听错误', e)

                            resolve({ path, error: e })
                        }
                    })
                })
            })
        } catch (e) {
            console.error('文件系统变化监听错误', e)
        }
    })

    console.log('构建磁盘目录树', disk.root)
    global[Symbol.for('tree')].disks.push(disk)
    根据路径查找并加载颜色索引(disk.root)
    //   return {disk,statPromisesArray}
    return await 构建目录树(disk.root, true, disk, diskTree.flatDirs, diskTree.flatFiles)
}
let tasks = 0
const 遍历缓存 = buildCache('walk')
const statCache = buildCache('statCache')
import { 根据路径查找并加载颜色索引 } from '../../color/colorIndex.js'
export async function 构建目录树(root, withFlat = false, $rootItem, $flatDirs, $flatFiles) {
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
                        创建文件系统条目缓存(item.path, item.type, stats)
                        合并文件系统条目(item, item.type, stats)
                    } catch (e) {
                        resolve({ path: item.path, error: e })
                    }
                    resolve(item)
                }
            })
        })
    )
}
