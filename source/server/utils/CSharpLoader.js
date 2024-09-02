import { setupDllPaths } from './dllFix/fixPathErrorUnicode.js';
setupDllPaths()
const cpu = require('os').cpus().length
const processMap = new Map()
const edge = require('electron-edge-js');
const callBackPromise = (fun) => {
    return (...args) => {
        return new Promise((resolve, reject) => {
            try {
                fun(...args, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            } catch (e) {
                reject(e)
            }
        });
    }
}
export function loadCsharpFunc(string) {
    const key = string

    const funcs = []
    if (processMap.has(key)) {
        funcs = processMap.get(key)
    } else {
        const func = edge.func(string+'\n//process:0')
        funcs.push({ func, busy: false })
        processMap.set(key, funcs)
    }
    return async (...args) => {
        const func = funcs.find(item => !item.busy)
        if (func) {
            func.busy = true
            let result = await callBackPromise(func.func)(...args)
            func.busy = false
            return result
        } else {
            if (funcs.length >= cpu) {
                funcs[0].busy = true
                let result = await callBackPromise(funcs[0].func)(...args)
                funcs[0].busy = false
                return result
            } else {
                const func = edge.func(string+'\n//process:'+funcs.length)

                funcs.push({ func, busy: false })
                return await callBackPromise(func)(...args)
            }
        }
    }
}
export function loadCsharpFile(path) {
    let string = require('fs').readFileSync(path, 'utf-8')
    return edge.func(string)
}
