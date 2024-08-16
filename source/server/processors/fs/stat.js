/**
 * 如果stepCallback是一个函数,直接使用它
 * 如果stepCallback是一个对象,使用它的两个回调函数分别构建
 * @param {*} stepCallback 
 * @returns 
 */
export const buildStepCallback = (stepCallback) => {
    if(!stepCallback)return
    if(typeof stepCallback === 'function'){
        let callback =  (statProxy) => {
            try {
                 stepCallback(statProxy)
            } catch (e) {
                console.error(e)
            }
        }
        callback.end = () => {
            stepCallback.end && stepCallback.end()
        }
        return callback
    }
    let callback =  (statProxy) => {
        try {
            if(statProxy.isDirectory){
                stepCallback.ifDir &&  stepCallback.ifDir(statProxy)
            }
            if(statProxy.isFile){
                stepCallback.ifFile &&  stepCallback.ifFile(statProxy)
            }
            if(statProxy.isSymbolicLink){
                stepCallback.ifSymbolicLink &&  stepCallback.ifSymbolicLink(statProxy)
            }
        } catch (e) {
            console.warn(e)
        }
    }
    callback.end = () => {
        stepCallback.end && stepCallback.end()
    }
    return callback
}




/**
 * 
 * @param {*} filePath 
 * @param {*} encoding 
 * @param {*} callback 
 */
export function buidStatFun(cwd) {
    const fs = require('fs')
    cwd && (cwd = cwd.replace(/\\/g, '/').replace(/\/\//g, '/'));
    return async function statWithCatch(filePath, encoding, callback,) {
        cwd && (filePath = cwd + filePath);
        if (statCache.has(filePath)) {
            const stats = statCache.get(filePath);
            callback(null, JSON.stringify(stats) + '\n');
            return;
        }
        try {
            const stats = await fs.promises.stat(filePath);
            const fileInfo = {
                path: filePath,
                id: `localEntrie_${filePath}`,
                type: 'local',
                size: stats.size,
                mtime: stats.mtime,
                mtimems: stats.mtime.getTime(),
            };
            try {
                watchFileStat(filePath);
                statCache.set(filePath, fileInfo);
            } catch (err) {
                statCache.delete(filePath);
                console.warn(err, filePath)
            }
            callback(null, JSON.stringify(fileInfo) + '\n');
        } catch (err) {
            const fileInfo = {
                path: filePath,
                id: `localEntrie_${filePath}`,
                type: 'local',
                size: null,
                mtime: '',
                mtimems: '',
                error: err
            };
            callback(null, JSON.stringify(fileInfo) + '\n');
        }
    }
}
