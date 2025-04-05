import { buildStepCallback, statWithNew } from './stat.js'
import { buildFilter } from './builder-filter.js'
import { fdir } from './fdirModified/index.js'
import { buildCache } from '../cache/cache.js'
import { isMetaData, isThumbnail } from '../thumbnail/utils/regexs.js'
import { globalTaskQueue, 添加带有优先级的全局任务,添加后进先出后台任务 } from '../queue/taskQueue.js'
import { reportHeartbeat } from '../../../../src/toolBox/base/useElectron/useHeartBeat.js'
import { 查找子文件夹, 删除缩略图缓存行, 计算哈希 } from '../thumbnail/indexer.js'
import { getCachePath } from './cached/fs.js'
import { 查找文件夹状态 } from '../../dataBase/mainDb.js'
import { 判定路径排除 } from '../../../../src/utils/fs/windowsSystemDirs.js'
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
// 添加两个队列
const 需要立即更新队列 = new Set();
const 延迟更新队列 = new Set();
/**
 * 计算目录遍历优先级
 * 优先级说明：
 * 1. 新目录（数据库中无记录）：最高优先级 (-2)
 * 2. 已修改的目录：中等优先级 (-1)
 * 3. 未修改的目录最低优先级 (0)
 * 
 * 同级优先级中，先发现的先处理（使用时间戳确保顺序）
 * @param {string} fixedroot 目录路径
 * @returns {number} 优先级值
 */
async function 计算目录遍历优先级(fixedroot) {
    const 基础时间戳 = Date.now()
    const 优先级系数 = {
        新目录: -2,
        已修改: -1,
        未修改: 0
    }
    // 查询数据库中的记录
    let oldStat = await 查找文件夹状态(fixedroot)
    // 如果是新目录（数据库中无记录）
    if (!oldStat) {
        return (优先级系数.新目录 * 1000000) - 基础时间戳
    }
    // 获取文件系统中的实际修改时间
    let stat = require('fs').statSync(fixedroot)
    let 是否已修改 = new Date(stat.mtime).getTime() > oldStat.mtime
    // 根据修改状态返回对应优先级
    return (是否已修改 ? 优先级系数.已修改 : 优先级系数.未修改) * 1000000 - 基础时间戳
}
// 文件过滤回调函数
async function 文件遍历回调(path, isDir, fixedroot, 遍历优先级, count) {
    let fixedPath = path.replace(/\\/g, '/')
    reportHeartbeat()
    try {
        let 删除索引任务函数 = async () => {
            索引遍历缓存.delete(path)
            timouters[path] = undefined
            return { path }
        }
        timouters[path] = () =>添加带有优先级的全局任务(删除索引任务函数,1)
        if (isThumbnail(path) || isMetaData(path)) {
            return
        }
        batch.push(path)
        count++
        let 真实遍历优先级 = (遍历优先级) / (fixedPath.replace(fixedroot, '')).length
        let 遍历任务函数 =  async () => {
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
        }
        添加带有优先级的全局任务(遍历任务函数,真实遍历优先级)
    } catch (e) {
        console.warn(e)
    }
    return true
}

async function 计算文件夹优先级(path, fixedroot, 基础优先级) {
    try {
        // 根目录最优先处理
        if (path === fixedroot) {
            需要立即更新队列.add(path);
            return -Infinity; // 确保根目录永远最优先
        }
        const stat = require('fs').statSync(path);
        const dbStat = await 查找文件夹状态(path.replace(/\\/g,'/'));
        // 判断是否需要立即更新
        if (!dbStat || stat.mtime.getTime() > dbStat.mtime) {
            console.log(path,stat.mtime.getTime(),dbStat?.mtime)
            需要立即更新队列.add(path);
            const now = Date.now();
            let priority = 基础优先级;
            if (!dbStat) {
                priority -= 2000; // 新文件夹
            } else {
                priority -= 1000; // 已修改文件夹
            }
            const mtimeDiff = now - stat.mtime.getTime();
            const mtimeScore = Math.min(500, mtimeDiff / (1000 * 60));
            priority += mtimeScore;
            return priority;
        } else {
            延迟更新队列.add(path);
            return Infinity;
        }
    } catch (err) {
        console.warn('获取文件夹状态失败:', path, err);
        需要立即更新队列.add(path);
        return 基础优先级;
    }
}

export async function 更新目录索引(root) {
    let fixedroot = root.replace(/\\/g, '/');
    let 基础优先级 = await 计算目录遍历优先级(fixedroot);
    let count = 0;
    const 智能文件遍历回调 = async (path, isDir, fixedroot, count) => {
        if (!isDir) {
            return 文件遍历回调(path, isDir, fixedroot, 基础优先级, count);
        }
        const priority = await 计算文件夹优先级(path, fixedroot, 基础优先级);
        return 文件遍历回调(path, isDir, fixedroot, priority, count);
    };
    let api = new fdir()
        .withFullPaths()
        .withDirs()
        .withCache(索引遍历缓存)
        .exclude(判定路径排除)
        .filter(
            (path, isDir) => 智能文件遍历回调(path, isDir, fixedroot, count)
        );

    api = api.crawl(root)
    api.withPromise().then(async (results) => {
        globalTaskQueue.start();
        // 先处理需要立即更新的队列
        for (const path of 需要立即更新队列) {
            await statWithNew(path);
        }
        // 打印延迟更新队列信息
        if (延迟更新队列.size > 0) {
            console.log('以下文件夹将延后更新:');
            for (const path of 延迟更新队列) {
                console.log(`  - ${path}`);
            }
            console.log(`共 ${延迟更新队列.size} 个文件夹延后更新`);
        }
        // 当立即更新队列处理完后，再处理延迟更新队列
        if (需要立即更新队列.size === 0) {
            for (const path of 延迟更新队列) {
                await statWithNew(path);
            }
        }
        // 清空队列
        需要立即更新队列.clear();
        延迟更新队列.clear();
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
    })
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

// 初始化遍历参数和回调
export const initializeWalkParams = (_stepCallback, _filter, signal) => {
    return {
        stepCallback: buildStepCallback(_stepCallback),
        filter: buildFilter(_filter, signal)
    }
}

// 处理单个文件结果
const processFileResult = async (result, filter, stepCallback) => {
    if (result.type !== 'file') {
        return false
    }
    reportHeartbeat()
    let flag = await filter(result)
    if (flag) {
        await stepCallback(result)
    }
    return true
}

// 处理遍历结果
export const processWalkResults = async (results, filter, stepCallback) => {
    const stats = {}
    for await (const result of results) {
        globalTaskQueue.pause()
        stats[result.path] = result
        await processFileResult(result, filter, stepCallback)
    }
    return stats
}

// 安排目录索引更新任务
export  const 调度文件夹索引任务 = (root, stats, signal) => {
    let 任务函数 =             async () => {
        await 更新目录索引(root, stats, signal)
        return {}
    }
    添加后进先出后台任务(任务函数)
}
