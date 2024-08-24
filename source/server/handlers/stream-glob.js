
import { walkAsyncWithFdir } from '../processors/fs/walk.js'
import { buildStatProxyByPath } from '../processors/fs/stat.js'
import { Query } from '../../../static/mingo.js';
import { 准备缩略图 } from '../processors/thumbnail/loader.js'
import { genThumbnailColor } from '../processors/thumbnail/loader.js'
import { diffColor } from '../processors/color/Kmeans.js'
const { pipeline } = require('stream');
/**
 * 创建一个walk流
 * @param {object} options 
 * @param {AbortSignal} signal 
 * @returns 
 */
const createWalkStream = (cwd, filter, signal, res, maxCount = 10000, walkController,chunData) => {
    let count = 0
    let preMatchCount = 0
    //因为遍历速度非常快,所以需要另行创建一个控制器避免提前结束响应
    //当signal触发中止时,walkController也中止
    signal.addEventListener('abort', () => {
        walkController.abort()
    })
    if (signal.aborted) {
        walkController.abort()
    }
    const walkSignal = walkController.signal
    walkSignal.walkController=walkController
    const Transform = require('stream').Transform
    let filterFun
    if (filter) {
        console.log(filter)
        filterFun = (entry) => {
            if (filter) {
                if (walkController.aborted) {
                    return false
                }
                return filter.test(entry)
            }
        }
    } else {
        filterFun = undefined
    }

    return new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            walkAsyncWithFdir(cwd, filterFun, {
                ifFile: (statProxy) => {
                    
                    this.push(statProxy);
                    if (signal.aborted) {
                        this.push(null)
                        walkController.abort()
                        return
                    }
                },
                end: () => {

                  //  this.push(null);
                }
            }, true, walkSignal, maxCount, 
            );
            callback();
        }
    });
};


const diffColorCache=new Map
export const globStream = (req, res) => {
    const { Transform } = require('stream')
    let scheme = {}
    if(req.query&&req.query){
        scheme=JSON.parse(req.query.setting)
    }
    
    const _filter = scheme.query && JSON.stringify(scheme.query) !== '{}' ? new Query(scheme.query) : null
    const walkController = new AbortController()
    const controller = new AbortController();
    let filter
    if (_filter) {
        filter = {
            test: (statProxy) => {
                if (signal.aborted) {
                    walkController.abort()
                    return false
                }
                if (walkController.signal.aborted) {
                    return false
                }

                return statProxy.type !== 'file' || _filter.test(statProxy)
            }
        }
    } else {
        filter = _filter
    }
    if(scheme.queryPro){
        if(_filter){
            filter.test = async(statProxy)=>{
                if (signal.aborted) {
                    walkController.abort()
                    return false
                }
                if( _filter.test(statProxy)){
                    if(diffColorCache.has(JSON.stringify([statProxy.path,scheme.queryPro.color]))){
                        return diffColorCache.get(JSON.stringify([statProxy.path,scheme.queryPro.color]))
                    }
                    let simiColor = await genThumbnailColor(statProxy.path)
                    return simiColor.find(item=>{
                        return diffColor(item.color,scheme.queryPro.color)
                    })
                }
                return false
            }
        }else{
            filter = {
                test: async(statProxy)=>{
                    if (signal.aborted) {
                        walkController.abort()
                        return false
                    }
                    if(diffColorCache.has(JSON.stringify([statProxy.path,scheme.queryPro.color]))){
                        return diffColorCache.get(JSON.stringify([statProxy.path,scheme.queryPro.color]))
                    }
                    let simiColor = await genThumbnailColor(statProxy.path)
                    return simiColor.find(item=>{
                        return diffColor(item.color,scheme.queryPro.color)
                    })
                }
            }
        }
    }
    console.log(filter)
    const maxCount = scheme.maxCount
    const cwd = scheme.cwd
    //设置响应头
    res.writeHead(200, {
        "Content-Type": "text/plain;charset=utf-8",
    });
    res.flushHeaders()
    res.write('')

    const { signal } = controller;
    let chunData = {
        data: '',
        count: 0
    }

    const walkStream = createWalkStream(cwd, filter, signal, res, maxCount, walkController, chunData)
    //前端请求关闭时,触发中止信号
    //使用底层的链接关闭事件,因为nodejs的请求关闭事件在请求关闭时不会触发
    res.on('close', () => {
        console.log('close')
        controller.abort();
      !transformStream.destroyed?  transformStream.destroy():null
       !walkStream.destroyed? walkStream.destroy():null

    });
    const transformStream = new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            let that = this
            if (!signal.aborted) {
                setImmediate(() => {
                    try {
                        if (signal.aborted) {
                            callback()
                            return
                        }
                        const { name, path, type, size, mtime, mtimems, error } = chunk;
                        const data = JSON.stringify({ name, path, id: `localEntrie_${path}`, type: 'local', size, mtime, mtimems, error }) + '\n';
                        chunData.data += data
                        console.log(chunData.data)
                        callback()
                       准备缩略图(path)
                    } catch (err) {
                        console.warn(err, chunk);
                    }
                })
                this.push(chunData.data)
                res.flush()
                chunData.data = ''
            } else {
                res.flush()
                res.end()
                callback()
                return
            }
        }
    });
    walkStream.pipe(transformStream).pipe(res)
    walkStream.write({});  // 触发walk开始
};
export const fileListStream = async (req, res) => {
    const controller = new AbortController();
    let scheme = {}
    if(req.query&&req.query.setting){
        scheme=JSON.parse(req.query.setting)
    }
    console.log(scheme)
    // 当请求关闭时，触发中止信号
    req.on('close', () => {
        controller.abort();
    });
    // 创建一个转换流，用于解析请求体中的JSON数据
    let buffer = '';
    const _filter = scheme.query && JSON.stringify(scheme.query) !== '{}' ? new Query(scheme.query) : null
    const jsonParserStream = new (require('stream')).Transform({
        objectMode: true,
        transform(chunk, encoding, callback){
            buffer += chunk.toString();
            const lines = buffer.split('\n').filter(
                item=>item
            )
            for (const line of lines) {
                try {
                    const statProxy = buildStatProxyByPath(line)
                    this.push(statProxy);
                } catch (err) {
                    console.warn('Invalid JSON:', line,err);
                }
            }
            callback();
        },
    });
    // 创建转换流，处理文件信息
    const transformStream = new (require('stream')).Transform({
        objectMode: true,
        transform(chunk,encoding,callback){
            if(_filter){
                if(!_filter.test(chunk)){
                    callback()
                    return
                }
            }
            const { name, path, type, size, mtime, mtimems, error } = chunk;
            const data = JSON.stringify({ name, path, id: `localEntrie_${path}`, type: 'local', size, mtime, mtimems, error }) + '\n';
            console.log(data)
            this.push(data)
            res.flush()
            callback()
        }
    });
    pipeline(
        req,
        jsonParserStream,
        transformStream,
        res,
        (err) => {
            if (err) {
                console.error('Streaming error:', err);
                res.destroy(err);
            } else {
                console.log('Streaming completed');
            }
        }
    );
}