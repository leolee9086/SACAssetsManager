import { MinHeap } from '../../../utils/array/minHeap.js'
import { reportHeartbeat } from '../../utils/heartBeat.js'

let globalTaskQueue = new MinHeap(
    (a, b) => {
        const priorityA = a.priority !== undefined ? a.priority : Infinity;
        const priorityB = b.priority !== undefined ? b.priority : Infinity;
        
        // 当一正一负时，优先选择0和正数
        if ((priorityA >= 0 && priorityB < 0) || (priorityA < 0 && priorityB >= 0)) {
            return priorityB - priorityA; // 反转顺序，使得非负数优先
        }
        
        // 其他情况下，数值更小的优先
        return priorityA - priorityB;
    }
)

globalThis[Symbol.for('taskQueue')]=globalThis[Symbol.for('taskQueue')]||globalTaskQueue
globalTaskQueue=globalThis[Symbol.for('taskQueue')]
globalTaskQueue.priority=(fn,num)=>{
    fn.priority=num
    return fn
}
globalTaskQueue.pause=()=>{
    globalTaskQueue.paused=true
}
globalTaskQueue.start= function($timeout=0,force){
    console.log('恢复后台任务',"执行间隔:"+$timeout,force?"强制开始:":'')
    if(this.started){
        this.processNext($timeout,force)
        return
    }
    this.ended=()=>{
        return this.size()===0
    }
    let index = 0
    let timeout = 0
    let isProcessing = false
    let log = false
    let lastTimeOut

    this.processNext=function($timeout,force){
        reportHeartbeat()
        if($timeout){
            timeout = $timeout
        }
        if($timeout===0){
            console.log($timeout)
            lastTimeOut=timeout||lastTimeOut

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
            if (index % 100 == 0||globalTaskQueue.length<100) {
               console.log('processNext', index, globalTaskQueue.size(), timeout)
                log = true
            }
            index++;
            let start = performance.now();
            (globalTaskQueue.pop())().then(stat => {
                let end =performance.now()
                timeout=Math.max(timeout/10,end-start,(lastTimeOut/10||0))
                if(log){
                    console.log('processFile', stat.path,index,globalTaskQueue.size(), end-start)
                    log = false
                }
                if(stat&&stat.error){
                    console.log('processFileError', stat.path,stat.error,index, globalTaskQueue.size(), end-start)
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
            timeout = Math.max(timeout / 10, 10)
            isProcessing = false

        } else if(!jump) {
            if (!globalTaskQueue.ended()) {
                if (index % 100 == 0||globalTaskQueue.size()<100) {
                    console.log('processNextLater', index, globalTaskQueue.size(),  timeout)
                }
                timeout = Math.min(Math.max(timeout * 2,timeout+100), 1000)
                setTimeout(
                    globalTaskQueue.processNext // 递归调用以处理下一个Promise
                    , timeout)
            }
            isProcessing = false
        }
        else{
            setTimeout(
                globalTaskQueue.processNext // 递归调用以处理下一个Promise
                , timeout)

        }
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