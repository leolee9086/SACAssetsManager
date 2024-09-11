import { buildCache } from '../../cache/cache.js'
const readdir = require('fs').readdirSync
const statSync = require('fs').statSync
const 遍历缓存 = buildCache('walk')
const statCache = buildCache('statCache')

export const parcel文件系统变化监听回调 = (error,entries)=>{
    if (error) {
        console.error('文件系统变化监听错误', error, entries)
        return
    }
    try {
        console.log('文件系统变化', event, entries)
        entries.forEach(entry => {
            let path = entry.path
            let eventType = entry.type
            path = path.replace(/\\/g, '/').replace(/\/\//g, '/')
            if (eventType === 'delete') {
                遍历缓存.delete(path)
                遍历缓存.delete(path.replace(/\//g, '\\'))
                statCache.delete(path)
                statCache.delete(path.replace(/\//g, '\\'))
                return
            }
            statPromisesArray.push(() => {
                return new Promise((resolve, reject) => {
                    try {
                        if (!require('fs').existsSync(path)) {
                            resolve({ path, error: '文件不存在' })
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
                            let entries = readdir(dir, { withFileTypes: true })
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
}
