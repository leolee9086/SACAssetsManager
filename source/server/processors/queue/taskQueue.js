import { MinHeap } from '../../../utils/array/minHeap.js'
import { buildCache } from '../cache/cache.js'
const 遍历缓存 = buildCache('walk')
const statCache = buildCache('statCache')

let globalTaskQueue=new MinHeap(
    (a, b) => {
        // 获取优先级，如果不存在则默认为最大值
        const priorityA = a.priority !== undefined ? a.priority : Infinity;
        const priorityB = b.priority !== undefined ? b.priority : Infinity;
        
        // 按照优先级进行排序，数值越小优先级越高
        return priorityA - priorityB;
    }
)

globalThis[Symbol.for('taskQueue')]=globalThis[Symbol.for('taskQueue')]||globalTaskQueue
globalTaskQueue=globalThis[Symbol.for('taskQueue')]
globalTaskQueue.start= function($timeout,force){
    if(this.started){
        this.processNext($timeout,force)
        return
    }
    this.ended=()=>{
        return this.length===0
    }
    let index = 0
    let timeout = 100
    let isProcessing = false
    let log = false
    this.processNext=function($timeout,force){
        if($timeout){
            timeout = timeout
        }
        if($timeout===0){
            timeout = 0
        }
        if(force){
            globalTaskQueue.paused=false
        }

        let jump = false
        if (isProcessing) {
            jump = true
        }
        isProcessing = true

        if (globalTaskQueue.peek() && !globalTaskQueue.paused && !jump) {
            if (index % 10000 == 0||globalTaskQueue.length<100) {
               console.log('processNext', index, statCache.size,遍历缓存.size, globalTaskQueue.size(), timeout)
                log = true
            }
            index++;
            let start = performance.now();
            (globalTaskQueue.pop())().then(stat => {
                let end =performance.now()
                timeout=Math.max(timeout,end-start)
                if(log){
                    console.log('processFile', stat.path,index,statCache.size,遍历缓存.size,globalTaskQueue.size(), end-start)
                    log = false
                }
                if(stat&&stat.error){
                    console.log('processFileError', stat.path,stat.error,index, statCache.size,遍历缓存.size, globalTaskQueue.size(), end-start)
                }
                setTimeout(
                    globalTaskQueue.processNext // 递归调用以处理下一个Promise
                    , timeout)
            }).catch(e=>{
                console.error(e)
                timeout = Math.min(timeout * 2, 10000)
                setTimeout(
                    globalTaskQueue.processNext // 递归调用以处理下一个Promise
                    , timeout)
            })
            // 处理stat
            timeout = Math.max(timeout / 1.1, 10)
        } else {
            if (!globalTaskQueue.ended()) {
                if (index % 10000 == 0||globalTaskQueue.size()<100) {
                    console.log('processNextLater', index,statCache.size,遍历缓存.size, globalTaskQueue.size(),  timeout)
                }
                timeout = Math.min(Math.max(timeout * 2,timeout+100), 1000)
                setTimeout(
                    globalTaskQueue.processNext // 递归调用以处理下一个Promise
                    , timeout)
            }
        }
        isProcessing = false
    }
    this.processNext()
    this.started = true
}.bind(globalTaskQueue)
export {globalTaskQueue}

export function 暂停文件系统解析队列(){
    globalTaskQueue.paused = true
}
export function 恢复文件系统解析队列(){
    globalTaskQueue.paused = false
    globalTaskQueue.start()
}
export function 添加文件系统解析任务(task){
    //任务必须是一个函数，并且返回一个Promise
    if(typeof task !== 'function'){
        throw new Error('任务必须是一个函数，并且返回一个Promise')
    }
    globalTaskQueue.push(task)
}