import {buildStepCallback} from './stat.js'
const fs = require('fs')
const path = require('path')
/**
 * 每个函数单独实现,避免多功能函数
 * 以保证简单性和功能单一
 * @param {*} root 
 * @returns 
 */
const cache = {}
const statWithCatch = (path) => {
    try {

        return fs.statSync(path)
    } catch (e) {
        return {
            path,
            isDirectory: () => false,
            isFile: () => false,
            isSymbolicLink: () => false,
            error: e,
            mode: 0,
            size: 0,
            atime: new Date(),
            mtime: new Date(),
            birthtime: new Date()
        }
    }
}

/**
 * 创建一个代理对象,只有获取value时才会懒执行,节约性能
 * 使用缓存,避免重复读取
 */

const buildStatProxy = (entry, dir,useProxy) => {

    return new Proxy({}, {
        get(target, prop) {
            if (prop === 'name') {
                return dir.replace(/\\/g, '/') + '/' + entry.name
            }
            if (prop === 'isDirectory') {
                return entry.isDirectory()
            }
            if (prop === 'isFile') {
                return entry.isFile()
            }
            if (prop === 'isSymbolicLink') {
                return entry.isSymbolicLink()
            }
            const stats = cache[dir.replace(/\\/g, '/') + '/' + entry.name] || statWithCatch(dir.replace(/\\/g, '/') + '/' + entry.name)
            if (prop === 'toString') {
                const {path,id,type,size,mtime,mtimems,error}=stats
                return JSON.stringify({path,id,type,size,mtime,mtimems,error})
            }
  
            if(prop==='type'){
                //type是文件类型,dir表示目录,file表示文件,link表示符号链接
                if(entry.isDirectory()){
                    return 'dir'
                }
                if(entry.isFile()){
                    return 'file'
                }
                if(entry.isSymbolicLink()){
                    return 'link'
                }
            }
            if(prop==='path'){
                return dir.replace(/\\/g, '/') + '/' + entry.name
            }
            cache[dir.replace(/\\/g, '/') + '/' + entry.name] = stats
            return stats[prop]
        }
    })
}
/**
 * 
 * @param {string} root 
 * @param {string} glob 
 * @param {function} filter 
 * @param {function|object{ifFile:function,ifDir:function,ifLink:function}} stepCallback 
 * @returns 
 */
export  function walk(root, glob, filter, _stepCallback,useProxy=true) {
    const files = [];

    const stepCallback = buildStepCallback(_stepCallback)
     function readDir(dir) {
        let entries = []
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch (error) {
        }
         for  (let entry of entries) {
            const isDir = entry.isDirectory()
            if (isDir) {
                /**
                 * 这里不要使用pah.join,因为join会自动将路径中的'/'转换为'\\'
                 * 而且性能较差
                 */
                stepCallback && stepCallback(buildStatProxy(entry,dir,useProxy))
                 readDir(dir.replace(/\\/g, '/') + '/' + entry.name)
            } else {
                if (glob && !entry.name.match(glob)) continue
                const statProxy=buildStatProxy(entry,dir,useProxy)
                files.push(statProxy)
                stepCallback&&stepCallback(statProxy)
            }
        }
    }
     readDir(root);
    stepCallback&&stepCallback.end()
    return files;
}
/*
const _stream = require('stream')
const stream =new _stream.Readable({
    objectMode:true,
    read(){
    
    }
})
const stepCallback={
    ifFile:(statProxy)=>{
            stream.push(statProxy.name)
    }
}
let chunk=[]
stream.on('data',(data)=>{
    chunk.push(data)
    if(chunk.length>100){
        console.log(chunk)
        chunk=[]
    }
})
console.time('walk')
console.log(walk('D:/', /.*\.md$/,null,stepCallback))
console.timeEnd('walk')
*/