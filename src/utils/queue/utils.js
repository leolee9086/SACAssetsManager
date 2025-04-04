/**
 * 设法返回当前CPU负载
 * @returns {user,system} 返回当前CPU负载,user为当前用户态CPU时间,system为当前内核态CPU时间
 */
export const runFunctionWithCpuTime = async (fn) => {
    const cpuLoad = performance.now()
    const result = await fn()
    const cpuLoad2 = performance.now()
    fn.$cpuTime = cpuLoad2 - cpuLoad
    fn.$runCount = fn.$runCount ? fn.$runCount + 1 : 1
    fn.$performance = fn.$cpuTime / fn.$runCount
    return { result, cpuLoad, cpuLoad2, $cpuTime: fn.$cpuTime, $runCount: fn.$runCount, $performance: fn.$performance }
}

/**
 * 合并任务函数,不可暂停
 * @param {function[]} functions 
 * @returns {function[]} 返回合并后的任务函数
 */
export const mergeTaskFunctions = async (functions) => {
    //一个事件循环的时间片
    const timeSlice = 0
    const currentTaskSlice = []
    const teskSlicies = []
    for (const fn of functions) {
        //每个任务的性能，未知性能的视为性能很差
        const $performance = fn.$performance || 10
        timeSlice += $performance
        if (timeSlice < 10) {
            currentTaskSlice.push(fn)
        } else {
            teskSlicies.push(currentTaskSlice)
            currentTaskSlice = []
            currentTaskSlice.push(fn)
        }
    } 
}
export const runTaskSlice = async (taskSlice) => {
     for(let i = 0; i < taskSlice.length; i++){
        await runFunctionWithCpuTime(taskSlice[i])
     }
}
export const buildTaskSlice = (functions) => {
    const mergedFunctions = mergeTaskFunctions(functions)
    const controller = new AbortController()
    let signal ={value:controller.signal}
    
    return {
        run: () => {
            runTaskSlice(functions)
            mergedFunctions = mergeTaskFunctions(functions)
        },
        pause: () => {
            controller.abort()
            signal = {value:new AbortController().signal}
        }
    }

}
/**
 * 运行任务切片,可以暂停
 * @param {*} taskSlicies 
 * @param {*} pauseSignal 
 */
export const runTaskSliciesPauseAble = async (taskSlicies,pauseSignal,pop=true) => {
    for (let i = 0; i < taskSlicies.length; i++) {
        if(pauseSignal.aborted){
            break
        }
        try{
            // 运行任务切片
            // 后进先出
            await runTaskSlice(taskSlicies.pop())
        }catch(e){
            console.error(e)
            break
        }
    }
}

/**
 * 测试一下，需要注意，task都必须是无副作用的，否则会影响测试结果
 */
import { fdir } from '../fs/fdirModified/index.js'
const stat = require('fs').statSync
const test = async () => {
    const files = new fdir().withFullPaths().withMaxFiles(10000).cawl("C:\\")
    console.log(files)
    const tesks = files.map(file => {
        return () => {
            return new Promise((resolve,reject) => {
                stat(file, (err, data) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(data)
                    }
                })
            })
        }
    })
    for(let i = 0; i < 100; i++){
        await runTaskSlice(tesks)
    }
}





