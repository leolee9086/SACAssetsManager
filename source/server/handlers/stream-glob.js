
import { walk, walkAsync } from '../processors/fs/walk.js'
import { buidStatFun } from '../processors/fs/stat.js'
import { Query } from '../../../static/mingo.js';
const { pipeline } = require('stream');
/**
 * 创建一个walk流
 * @param {object} options 
 * @param {AbortSignal} signal 
 * @returns 
 */
const createWalkStream = (cwd, filter,signal,controller) => {
    let count = 0

    const Transform = require('stream').Transform
    const filterFun=(entry)=>{
        if(filter){
           return filter.test(entry)
        }
    }
    return new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            walkAsync(cwd, filterFun, {
                ifFile: (statProxy) => { 
                    if(count>10000){
                        controller.abort()
                    }
                    this.push(statProxy);
                    count++
                },
                filter:(entry)=>{
                    if(filter){
                        return filter.test(entry)
                    }
                },
                end: () => {
                    this.push(null);
                }
            }, false, signal);
            callback();
        }
    });
};
export const globStream = async (req, res) => {
    const { pipeline, Transform } = require('stream')
    const scheme = JSON.parse(req.query.setting)
    console.log(scheme)
    const filter=scheme.query?new Query(scheme.query):null
    console.log(filter)
    const cwd=scheme.cwd
    res.writeHead(200, { 'Content-Type': 'application/text;charset=utf-8' });
    const controller = new AbortController();
    const { signal } = controller;
    const walkStream = createWalkStream(cwd,filter,signal,controller)

    //前端请求关闭时,触发中止信号
    req.on('close', () => {
        controller.abort();
    });
    const transformStream = new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            try {
                    const { name, path, type, size, mtime, mtimems, error } = chunk;
                    const data = JSON.stringify({ name, path, id: `localEntrie_${path}`, type: 'local', size, mtime, mtimems, error }) + '\n';
                    this.push(data); 
            } catch (err) {
                console.warn(err, chunk);
            }
            callback();
        }
    });
    pipeline(
        walkStream,
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
    walkStream.write({});  // 触发walk开始
};
export const fileListStream = async (req, res) => {
    // 当请求关闭时，触发中止信号
    req.on('close', () => {
        controller.abort();
    });
    // 创建一个转换流，用于解析请求体中的JSON数据
    let buffer = '';
    const jsonParserStream = new (require('stream')).Transform({
        readableObjectMode: true,
        transform(chunk, encoding, callback) {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            for (const line of lines) {
                try {
                    const file = line
                    this.push(file);
                } catch (err) {
                    console.warn('Invalid JSON:', line);
                }
            }
            callback();
        },
    });
    // 创建转换流，处理文件信息
    const transformStream = new (require('stream')).Transform({
        objectMode: true,
        transform: buidStatFun(scheme.options.cwd)
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