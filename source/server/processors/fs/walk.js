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
const 遍历缓存 = buildCache('walk')
const timouters = {}
const batch = []
function 更新目录索引(root, stats, signal) {
    //构建目录树,这样下一次遍历的时候,可以跳过已经遍历过的目录
    console.log(signal.aborted)

    let api = new fdir()
        .withFullPaths()
        .withDirs()
        .withCache(遍历缓存)
        //   .withAbortSignal(signal)
        .exclude((name, path) => {
            for (let dir of ignoreDir) {
                if (path.toLowerCase().indexOf(dir.toLowerCase()) !== -1) {
                    return true
                }
            }
            return false
        }).filter((path, isDir) => {
            reportHeartbeat()
            if (signal.aborted) {
                console.log(signal.aborted)
                return
            }
            if (timouters[path]) {
                return true
            }
            try {

                timouters[path] = () => {
                    if (isDir) {
                        setTimeout(遍历缓存.delete(path), 1000 * path.length)
                    }
                    setTimeout(timouters[path] = undefined, 10 * 60 * path.length)
                }

                if (isDir) {
                    return true
                }
                if (isThumbnail(path) || isMetaData(path)) {
                    return
                }
                batch.push(path)
                if (stats[path]) {
                    globalTaskQueue.push(
                        async () => {
                            {
                                删除缩略图缓存行(path), await statWithNew(path);
                            }
                        }
                    )
                    return true
                }
                globalTaskQueue.push(
                    globalTaskQueue.priority(
                        async () => {
                            reportHeartbeat()

                            for (let i = 0; i < Math.max((Math.min(15 / (batch.time || 0.1), 100)), 1); i += 1) {
                                const _path = batch.pop()
                                if (_path) {
                                    if (isThumbnail(_path) || isMetaData(_path)) {
                                        continue;
                                    }

                                    const start = performance.now()
                                    await statWithNew(_path);
                                    batch.time = performance.now() - start
                                }
                            }
                            return path
                        }, 0 - Date.now()
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

            let fixed = new Set(results.map(item => item.replace(/\\/g, '/')));
            let dbResults = await 查找子文件夹(root);
            dbResults.results.forEach(entry => {

                let parsedEntry = JSON.parse(entry);
                let path = parsedEntry.path.replace(/\\/g, '/');

                if (!fixed.has(path)) {
                    console.log('找到多余数据项');
                    删除缩略图缓存行(path);

                    async () => {
                        let hash = 计算哈希(entry)
                        let hashedName = `${数据库查询结果.path.pop().replace(/\./g, '_')}_${hash}`
                        const 缓存目录 = (await getCachePath(path, 'thumbnails', true)).cachePath
                        let 缓存路径 = require('path').join(缓存目录, hashedName)
                        if (require('fs').existsSync(缓存路径)) {
                            console.log('删除多余缩略图', 缓存路径);
                            require('fs').unlink(
                                缓存路径, (err) => {
                                    console.warn('删除多余缩略图出错')
                                }
                            )

                        }
                    }
                }
                return path;
            }
            )

        }
    )
}
export async function walkAsyncWithFdir(root, _filter, _stepCallback, countCallBack, signal = { aborted: false }, timeout, maxDepth = Infinity, search) {
    const stepCallback = buildStepCallback(_stepCallback)
    const filter = buildFilter(_filter, signal)
    const startTime = Date.now()
    let { results, approximateCount } = await 查找子文件夹(root, search)
    countCallBack(approximateCount)
    console.log(Date.now() - startTime)
    const stats = {}
    results.map(
        item => {
            let stat = JSON.parse(item)
            stats[item.path] = item
            return stat
        }
    ).forEach(
        async (result) => {
            reportHeartbeat()
            let flag = await filter(result)
            if (flag) {
                stepCallback(result)
            }
        }
    )
    更新目录索引(root, stats, signal)
}

