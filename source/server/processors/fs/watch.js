import { buildCache } from '../cache/cache.js'
const watcher = require('@parcel/watcher')
const wachedPaths = buildCache('wachedPaths')
export function 上级目录已监听(path) {
    return wachedPaths.filterSync(p => path.startsWith(p.path))
}
export function 找到所有下级目录(path) {
    return wachedPaths.filterSync(p => p.path.startsWith(path))
}
export function 取消监听(path) {
    let watcherSubscription = wachedPaths.get(path)
    if (watcherSubscription) {
        watcherSubscription.subscription.unsubscribe()
        wachedPaths.delete(path)
    }
}
export function 监听文件夹条目(item, callback) {
    let { path, type } = item
    console.log('监听文件夹条目', item)
    if (type !== 'dir') {
        console.error('监听文件夹条目失败，因为不是目录', item)
        return
    }
    if (上级目录已监听(path)) {
        console.log('已经监听上级目录', item.path)
        return
    }
    if (wachedPaths.get(item.path)) {
        console.log('已经监听', item.path)
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
        console.log('监听文件夹条目', path)
        //chokidar不适用,直接使用nodejs的fs.watch
        const subscription = watcher.subscribe(path, (event, path) => {
            callback && callback(event, path);
        });
        wachedPaths.set(path, { path, subscription })
    } catch (e) {
        console.error('监听文件夹条目失败', e)
    }
}
