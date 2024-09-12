import { buildStepCallback, statWithNew } from './stat.js'
import { buildFilter } from './builder-filter.js'
import { fdir } from './fdirModified/index.js'
import { buildCache } from '../cache/cache.js'
import { isMetaData, isThumbnail } from '../thumbnail/utils/regexs.js'
import { ignoreDir } from './dirs/ignored.js'
import { globalTaskQueue } from '../queue/taskQueue.js'
import { reportHeartbeat } from '../../utils/heartBeat.js'
import { 查找子文件夹,删除缩略图缓存行 } from '../thumbnail/indexer.js'
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
const timouters = {

}
function 更新目录索引(root) {
    //构建目录树,这样下一次遍历的时候,可以跳过已经遍历过的目录
    let api = new fdir()
        .withFullPaths()
        .withDirs()
        .exclude((name, path) => {
            for (let dir of ignoreDir) {
                if (path.toLowerCase().indexOf(dir.toLowerCase()) !== -1) {
                    return true
                }
            }
            return false
        }).filter((path, isDir) => {
            reportHeartbeat()
            if (timouters[path]) {
                return true
            }
            try {
                timouters[path] = () => {
                    if (isDir) {
                        清理子文件夹索引(path)
                        setTimeout(遍历缓存.delete(path), 100 * path.length)
                    }
                    setTimeout(timouters[path] = undefined, 1000 * 60 * path.length)
                }
                globalTaskQueue.push(
                    globalTaskQueue.priority(
                        async () => {
                            reportHeartbeat()
                            if (isThumbnail(path) || isMetaData(path)) {
                                return
                            }
                            statWithNew(path)
                            return path
                        }, 2
                    )
                )
            } catch (e) {
                console.warn(e)
            }
            return true
        })
    api = api.crawl(root)
    api.withPromise().then(
        async(results)=>{
            
            let  fixed =results.map(item=>item.replace(/\\/g,'/'))
            let dbResults= await 查找子文件夹(root)
            
            dbResults.results.forEach(
                entry=>{
                    let find= fixed.find(item=>entry.indexOf(`"path":"${item}"`)!==-1)
                    if(!find){
                        console.log('找到多余数据项')
                        删除缩略图缓存行(JSON.parse(entry).path.replace(/\\/g,'/'))
                    }
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
    results.map(
        item => {
            return JSON.parse(item)
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
    更新目录索引(root)
}

