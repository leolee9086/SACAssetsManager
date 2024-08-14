const fs = require('fs')
const path = require('path')
/**
 * 每个函数单独实现,避免多功能函数
 * 以保证简单性和功能单一
 * @param {*} root 
 * @returns 
 */
const cache={}
const statWithCatch=(path)=>{
    try{
        return fs.statSync(path)
    }catch(e){
        return {
            name:path,
            isDirectory:()=>false,
            isFile:()=>false,
            isSymbolicLink:()=>false,
            error:e,
            mode:0,
            size:0,
            atime:new Date(),
            mtime:new Date(),
            birthtime:new Date()
        }
    }
}
export function walk(root,glob,filter) {
    const files = [];
    function readDir(dir) {
        let entries = []
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch (error) {
        }
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i]
            const isDir = entry.isDirectory()
            if (isDir) {
                /**
                 * 这里不要使用pah.join,因为join会自动将路径中的'/'转换为'\\'
                 * 而且性能较差
                 */
                readDir(dir.replace(/\\/g, '/') + '/' + entry.name)
            } else {
                if(glob&&!entry.name.match(glob))continue
                files.push(
                    // 一个代理对象,只有获取value时才会懒执行,节约性能
                    // 使用缓存,避免重复读取
                    new Proxy({},{
                        get(target,prop){
                            if(prop==='name'){
                                return dir.replace(/\\/g, '/') + '/' + entry.name
                            }
                            const stats=cache[dir.replace(/\\/g, '/') + '/' + entry.name]||statWithCatch(dir.replace(/\\/g, '/') + '/' + entry.name)
                            if(prop==='toString'){
                                return JSON.stringify(stats)
                            }
                            cache[dir.replace(/\\/g, '/') + '/' + entry.name]=stats
                            return stats[prop]
                        }
                    })
                )
            }
        }
    }
    readDir(root);
    return  files;
}
console.time('walk')
console.log(walk('D:/'))
console.timeEnd('walk')
/**
 * 从头自己实现可能更好,fdir库目前看起来短期内不会提供流式接口以及对遍历过程的控制
 * 作为参考使用就可以了
 */

//const { fdir } = require('D:/思源主库/data/plugins/SACAssetsManager/source/server/utils/fdir/dist/index.js')
//const dir = new fdir().withStats().crawl('D:/')
//console.time('walk')
//let stream = dir.sync()
//console.timeEnd('walk')
//console.log(stream)
/**
 * 进行一次搜索,找到c开头的所有结果
 
console.time('search')

const search = result.filter(item => item.split('\\').pop().startsWith('c'))
console.log(search,search.length)
console.timeEnd('search')
*/
