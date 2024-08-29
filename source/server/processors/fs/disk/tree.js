global[Symbol.for('tree')] = globalThis[Symbol.for('tree')] || {
    disks: [],
    flatFiles: [],
    flatDirs: []
}
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
    await 构建目录树(disk.root, true, disk, diskTree.flatDirs, diskTree.flatFiles)
}
const fs = require('fs')
const statSync = require('fs').statSync
import { fdir } from '../fdirModified/index.js'
export async function 构建目录树(root, withFlat = false, $rootItem, $flatDirs, $flatFiles) {
 /*   console.log(root)
    console.time('fdir' + root)
    const paths = new fdir().withFullPaths().crawl(root)
    const result = await paths.withPromise()
    console.timeEnd('fdir' + root)
    console.log(result)
    const statPromisesArray = []
    console.time('stat1' + root)
    for (let i = 0; i < result.length && i < 1000000; i++) {
        let file = result[i]
        statPromisesArray.push(
            new Promise((resolve, reject) => {
                try {
                    resolve({
                        path: file,
                        stats: statSync(file)
                    })
                } catch (e) {
                    resolve({
                        path: file,
                        stats: null,
                        error: e.message
                    })
                }
            })
        )
    }
    await Promise.all(statPromisesArray)
    console.timeEnd('stat1' + root)*/

    
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
     let tasks = 0
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
     const promises = []
     const statPromises = []
 
 
 
     async function 递归构建目录树(dir) {
         let entries = []
         let dirs = dir.subDirs
         let currentDir = dir.path
         const files = dir.files
 
         try {
             entries =  readdir(currentDir, options)
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
                         promises.push(
                             new Promise(async (resolve, reject) => {
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
                         statPromises.push(
                             new Promise((resolve, reject) => {
                                 stat(dirItem.path, (err, stats) => {
                                     if (err) {
                                         resolve()
                                     } else {
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
                 statPromises && statPromises.length <= 1000000 && statPromises.push(
                    new Promise((resolve, reject) => {
                         stat(fileItem.path, (err, stats) => {
                             if (err) {
                                 resolve()
                             } else {
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
     try {
         await 递归构建目录树(rootItem)
     } catch (e) {
         tasks--
         throw e
     }
     console.time('glob' + rootItem.path)
     while (tasks > 0) {
         await Promise.all(promises)
     }
     console.timeEnd('glob' + rootItem.path)
     //stat响应不需要等待，存入之前能读取多少就读取多少
     console.time('stat' + rootItem.path)
     console.log(statPromises.length, statPromises)
 
     Promise.all(statPromises )
     console.timeEnd('stat' + rootItem.path)
     return rootItem
}
