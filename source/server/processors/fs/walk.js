import { buildStepCallback, statWithNew } from './stat.js'
import { buildFilter } from './builder-filter.js'
import { fdir } from './fdirModified/index.js'
import { buildCache } from '../cache/cache.js'
import { isMetaData, isThumbnail } from '../thumbnail/utils/regexs.js'
import { ignoreDir } from './dirs/ignored.js'
import { globalTaskQueue } from '../queue/taskQueue.js'
import { reportHeartbeat } from '../../utils/heartBeat.js'
import { 查找子文件夹, 删除缩略图缓存行, 计算哈希 } from '../thumbnail/indexer.js'
import { getCachePath } from './cached/fs.js'
import { 查找文件夹状态 } from '../../dataBase/mainDb.js'
/**
 * 使用修改后的fdir,遍历指定目录
 * @param {*} root 
 * @param {*} _filter 
 * @param {*} _stepCallback 
 * @param {*} useProxy 
 * @param {*} signal 
 * @param {*} maxCount 
 * @returns 
 */
const 索引遍历缓存 = buildCache('walkForStat')
const timouters = {}
const batch = []
async function 更新目录索引(root) {
    let fixedroot = root.replace(/\\/g, '/')
    let 遍历优先级 = 0 - Date.now()
    //构建目录树,这样下一次遍历的时候,可以跳过已经遍历过的目录
    let oldStat = await 查找文件夹状态(fixedroot)
    if (!oldStat) {
        遍历优先级 = 0 - Date.now() - 1000
    } else {
        let stat = require('fs').statSync(fixedroot)
        if (new Date(stat.mtime).getTime() <= oldStat.mtime) {
            遍历优先级 = 0 - Date.now() + 1000
        } else {
            遍历优先级 = 0 - Date.now()
        }
    }
    setTimeout(索引遍历缓存.delete(root), 10 * root.length)
    let count = 0
    let api = new fdir()
        .withFullPaths()
        .withDirs()
        .withCache(索引遍历缓存)
        //   .withAbortSignal(signal)
        .exclude(判定路径排除)
        .filter(async (path, isDir) => {
            let fixedPath = path.replace(/\\/g, '/')
            reportHeartbeat()
            try {
                timouters[path] = () => globalTaskQueue.push(
                    globalTaskQueue.priority(
                        async () => {
                            索引遍历缓存.delete(path)
                            timouters[path] = undefined
                            return { path }
                        }, 1
                    )
                )
                if (isThumbnail(path) || isMetaData(path)) {
                    return
                }
                batch.push(path)
                count++
                globalTaskQueue.push(
                    globalTaskQueue.priority(
                        async () => {
                            reportHeartbeat()
                            for (let i = 0; i < Math.max((Math.min(15 / (batch.time || 0.1), 30)), 1); i += 1) {
                                const _path = batch.pop()
                                if (_path) {
                                    if (isThumbnail(_path) || isMetaData(_path)) {
                                        continue;
                                    }
                                    const start = performance.now()
                                    await statWithNew(_path);
                                    timouters[_path] && timouters[_path]()
                                    batch.time = performance.now() - start
                                }
                            }
                            return { path }
                        }, (遍历优先级 + count - isDir ? 0 : 1000) / (fixedPath.replace(fixedroot, '')).length
                    )
                )
            } catch (e) {
                console.warn(e)
            }
            return true
        })
    api = api.crawl(root)
    api.withPromise().then(
        async (results) => {
            globalTaskQueue.start()
            let fixed = new Set(results.map(item => item.replace(/\\/g, '/')));
            let dbResults = await 查找子文件夹(root);
            dbResults.results.forEach(entry => {
                let parsedEntry = entry
                let path = parsedEntry.path.replace(/\\/g, '/');
                if (!fixed.has(path)) {
                    处理缓存文件(path, entry)
                }
                return path;
            }
            )
        }
    )
}
const 判定路径排除 = (name, path) => {
    for (let dir of ignoreDir) {
        if (path.toLowerCase().indexOf(dir.toLowerCase()) !== -1) {
            return true
        }
    }
    return false

}
async function 处理缓存文件(path, entry) {
    删除缩略图缓存行(path);
    let hash = 计算哈希(entry)
    let hashedName = `${entry.path.split('/').pop().replace(/\./g, '_')}_${hash}`
    const 缓存目录 = (await getCachePath(path, 'thumbnails', true)).cachePath
    let 缓存路径 = require('path').join(缓存目录, hashedName)
    if (require('fs').existsSync(缓存路径)) {
        console.log('删除多余缩略图', 缓存路径);
        require('fs').unlink(缓存路径, (err) => {
            if (err) console.warn('删除多余缩略图出错', err)
        })
    }
}
export async function walkAsyncWithFdir(root, _filter, _stepCallback, countCallBack, signal = { aborted: false }, timeout, maxDepth = Infinity, search,extensions) {
    const stepCallback = buildStepCallback(_stepCallback)
    const filter = buildFilter(_filter, signal)
    let { results, approximateCount } = await 查找子文件夹(root, search,extensions)
    countCallBack(approximateCount)
    const stats = {}
    for await (const result of results) {
        globalTaskQueue.pause()
        stats[result.path] = result
        if (result.type !== 'file') {
            continue
        }
        reportHeartbeat()
        let flag = await filter(result)
        if (flag) {
            await stepCallback(result)
        }
    }
    更新目录索引(root, stats, signal)
}

