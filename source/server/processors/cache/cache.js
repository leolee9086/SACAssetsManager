import { globalTaskQueue } from '../queue/taskQueue.js';

const crypto = require('crypto');

// 生成缓存键的函数保持不变
export function generateCacheKey(raw) {
    return crypto.createHash('md5').update(raw).digest('hex');
}
class loacalJsonAdapter {
    constructor(...$path) {
        this.path = require('path').join(...$path)
        this.fs = require('fs-extra')
    }
    initData(name, cache) {
        let dataPath = require('path').join(this.path, name + '.json')
        //如果文件不存在则创建,注意文件夹需要提前创建
        if (!this.fs.existsSync(dataPath)) {
            try {
                this.fs.mkdirSync(this.path)
            } catch (e) {
                console.error(e)
            }
            this.fs.writeFileSync(dataPath, '{}')
        }
        this.fs.promises.readFile(dataPath, 'utf8').then(data => {
            const json = JSON.parse(data)
            for (const [key, value] of Object.entries(json)) {
                cache.set(key, value)
            }
        })
    }
    saveData(name, cache, cb) {
        //cache是map,需要转换成对象
        console.log('saveData', cache.size)
        let dataPath = require('path').join(this.path, name + '.json')

        const data = JSON.stringify(Object.fromEntries(cache))
        this.fs.writeFile(dataPath, data).then(() => {
            cb && cb()
        })
    }
}
/**
 * 默认缓存适配器
 * 使用工作空间的文件系统进行缓存
 */
/**
 * 缓存提供者
 * 用于管理缓存数据
 */
export class BaseCacheProvider {
    constructor(name, adapter) {
        this.cache = new Map()
        /**
         * 缓存适配器
         * 用于数据持久化以及读取
         */
        this.adapter = adapter
        /**
         * 初始化缓存
         */
        this.adapter && this.adapter.initData(name, this.cache)
        this.name = name
        this.stat = {
            transactionCount: 0,
        }
    }
    get size() {
        return this.cache.size
    }
    /**
     * 更新缓存,超时之后会自动删除
     * @param {string} key
     * @param {*} value
     */
    set(key, value, timeout) {
        const item = {
            value,
            timestamp: Date.now(),
            expiresAt: timeout ? Date.now() + timeout : null
        };
        this.cache.set(key, item);
        if (timeout) {
            globalTaskQueue.push(
                async () => {
                    const currentItem = this.cache.get(key);
                    if (currentItem && currentItem.expiresAt === item.expiresAt) {
                        this.cache.delete(key);
                    }
                    return {}
                }
            )
        }
    }
    filterSync(filter) {
        const keys = this.cache.keys()
        const result = []
        for (const key of keys) {
            try {
                if (filter(this.cache.get(key).value)) {
                    result.push(this.cache.get(key).value)
                }
            } catch (e) {
                console.error(e)
            }
        }
        return result[0] ? result[0] : null
    }
    /**
     * 
     */
    async filter(filter, signal) {
        const keys = this.cache.keys()
        const result = []
        for await (const key of keys) {
            if (signal && signal.aborted) {
                break
            }
            if (await filter(this.cache.get(key).value)) {
                result.push(this.cache.get(key).value)
            }

        }
        return result
    }
    /**
     * 删除缓存
     * @param {string} key
     */
    delete(key) {
        this.cache.delete(key)
    }
    /**
     * 根据key获取缓存值
     * 超时返回null
     * @param {string} key
     * @param {*} key 
     * @returns 
     */
    get(key) {
        const item = this.cache.get(key)
        if (!item) return null
        return item.value
    }
    getRaw(key) {
        return this.cache.get(key)
    }
    /**
     * 清空缓存
     */
    clear() {
        this.cache.clear()
    }
    /**
     * 清除超时缓存直到缓存大小小于等于指定大小
     * @returns {number}
     */
    sizeTo(size) {
        if (this.cache.size <= size) return
        /**
         * 遍历缓存
         */
        const keys = Array.from(this.cache.keys())
        console.log('sizeTo', keys)
        /**
         * 根据时间排序
         */
        const sortedKeys = keys.sort((a, b) => {
            const aRaw = this.getRaw(a)
            const bRaw = this.getRaw(b)
            console.log('aRaw', aRaw)
            return aRaw.timestamp - bRaw.timestamp
        })
        /**
         * 删除最旧的缓存直到缓存大小小于等于指定大小
         */
        console.log('sortedKeys', sortedKeys)
        while (this.cache.size > size) {
            this.delete(sortedKeys.shift())
        }
    }
    /**
     * 持久化缓存
     */
    persist() {
        //持久化前先清理缓存到10G
        if (this.updating) {
            return
        }
        this.updating = true
        let cb = () => {
            this.updating = false
        }
        this.sizeTo(1024 * 1024 * 1024)
        console.log('persist', this.cache.size)
        console.log('persist', this.adapter)
        this.adapter && this.adapter.saveData(this.name, this.cache, cb)
        if (!this.adapter) {
            cb()
        }
    }

    /**
     * 从持久化数据中恢复缓存
     */
    restore() {
        this.adapter && this.adapter.initData(this.name, this.cache)
    }
}
const defaultAdapter = new loacalJsonAdapter(siyuanConfig.system.workspaceDir, 'temp', 'sac', 'cache')
export function buildCache(name, adapter) {
    const globalCache = globalThis[Symbol.for('cache')] || {}
    globalThis[Symbol.for('cache')] = globalCache
    const symbol = Symbol.for(name)
    globalCache[symbol] = globalCache[symbol] || new BaseCacheProvider(name, adapter)
    return globalCache[symbol]
}

