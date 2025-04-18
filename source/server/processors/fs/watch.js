import { 修正路径分隔符号为反斜杠 } from '../../../../src/toolBox/base/usePath/forFix.js'
import { buildCache } from '../cache/cache.js'
const watcher = require('@parcel/watcher')
const wachedPaths = buildCache('wachedPaths')
export function 上级目录已监听(path) {
    return wachedPaths.filterSync(p => path.startsWith(p.path)&& p.path!==path)
}
export function 找到所有下级目录(path) {
    return wachedPaths.filterSync(p => p.path.startsWith(path)&& p.path!==path)
}
export function 取消监听(path) {
    let watcherSubscription = wachedPaths.get(path)
    if (watcherSubscription) {
        watcherSubscription.subscription.unsubscribe()
        wachedPaths.delete(path)
    }
}
export function 永久监听文件夹条目(dirpath, callback) {
    let path = 修正路径分隔符号为反斜杠(dirpath)
    console.log('监听文件夹条目', path)
    if (上级目录已监听(path)) {
        console.log('已经监听上级目录', dirpath)
        return
    }
    if (wachedPaths.get(dirpath)) {
        console.log('已经监听', dirpath)
        return
    }
    let 下级目录列表 = 找到所有下级目录(path)
    if (下级目录列表 && 下级目录列表.length > 0) {
        console.log('已经监听下级目录', 下级目录列表)
        下级目录列表.forEach(p => {
            if (wachedPaths.get(p)) {
                console.log('已经监听下级目录', p)
                取消监听(p)

            }
        })
    }
    /**
     * 当已经监听上级目录时，不监听下级目录
     */
    try {
        console.log('尝试监听文件夹条目', path)
        //chokidar不适用,直接使用nodejs的fs.watch
        const subscription = watcher.subscribe(path, (event, path) => {
            callback && callback(event, path);
        });
        wachedPaths.set(path, { path, subscription })
    } catch (e) {
        console.error('监听文件夹条目失败', e)
    }
}
