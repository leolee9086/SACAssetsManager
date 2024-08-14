const crypto = require('crypto');

// 生成缓存键的函数保持不变
export function generateCacheKey(filePath) {
    return crypto.createHash('md5').update(filePath).digest('hex');
}



class loacalJsonAdapter{
    constructor(path){
        this.path = path
        this.fs = require('fs')
    }
    /**
     * 初始化数据
     * @param {string} name
     * @param {Map} cache
     */
    initData(name,cache){
        const data = this.read(name)
        if(data) cache.set(name, data)
    }
    /**
     * 持久化数据
     * @param {Map} cache
     */
    persist(cache){
        const data = Object.fromEntries(cache)
        this.fs.writeFileSync(this.path, JSON.stringify(data))
    }
    /**
     * 从持久化数据中恢复数据
     * @param {Map} cache
     */
    restore(cache){
        const data = JSON.parse(this.fs.readFileSync(this.path, 'utf-8'))
        for(const [key, value] of Object.entries(data)){
            cache.set(key, value)
        }
    }
    read(name){
        const data = JSON.parse(this.fs.readFileSync(this.path, 'utf-8'))
        return data[name]
    }
}

/**
 * 缓存提供者
 * 用于管理缓存数据
 */
export class BaseCacheProvider{
    constructor(name,adapter){
        this.cache = new Map()
        /**
         * 缓存适配器
         * 用于数据持久化以及读取
         */
        this.adapter = adapter
        /**
         * 初始化缓存
         */
        this.adapter&&this.adapter.initData(name,this.cache)
    }
    /**
     * 更新缓存
     * @param {string} key
     * @param {*} value
     */
    set(key, value){
        this.cache.set(key, {value, timestamp: Date.now()})
    }
    /**
     * 删除缓存
     * @param {string} key
     */
    delete(key){
        this.cache.delete(key)
    }
    /**
     * 根据key获取缓存值
     * 超时返回null
     * @param {string} key
     * @param {*} key 
     * @returns 
     */
    get(key){
        const item = this.cache.get(key)
        if(!item) return null
        if(item.timestamp + this.ttl < Date.now()) return null
        return item.value
    }
    /**
     * 清空缓存
     */
    clear(){
        this.cache.clear()
    }
    /**
     * 清除超时缓存直到缓存大小小于等于指定大小
     * @returns {number}
     */
    sizeTo(size){
        /**
         * 遍历缓存
         */
        const keys = this.cache.keys()
        /**
         * 根据时间排序
         */
        const sortedKeys = keys.sort((a, b) => this.cache.get(a).timestamp - this.cache.get(b).timestamp)
        /**
         * 删除最旧的缓存直到缓存大小小于等于指定大小
         */
        while(this.cache.size > size){
            this.delete(sortedKeys.shift())
        }
    }
    /**
     * 持久化缓存
     */
    persist(){
        this.adapter&&this.adapter.persist(this.cache)
    }
    /**
     * 从持久化数据中恢复缓存
     */
    restore(){
        this.adapter&&this.adapter.restore(this.cache)
    }
}
export const adapters =[loacalJsonAdapter]
// 内存缓存
export const memoryCache = new BaseCacheProvider('memoryCache')

