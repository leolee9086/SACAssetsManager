import MinHeap from '../array/minHeap'
/**
 * 优先级队列
 */
function compareFn(a,b){
    if(a.priority>b.priority){
        return 1
    }else if(a.priority<b.priority){
        return -1
    }else{
        if(a.time<b.time){
            return 1
        }else if(a.time>b.time){
            return -1
        }else{
            return 0
        }
    }
}

/**
 * 闲时回调promise,不保证执行顺序，也不保证执行
 */
export function idleCallbackPromise(fn,options={deadline:15}){
    return new Promise((resolve,reject)=>{
        const boxedFn =async () => {
            try{
                const result = await fn()
                resolve(result)
            }catch(e){
                reject(e)
            }
        }
        requestIdleCallback(boxedFn,options)
    })
}

export class TaskQueue {
    constructor(compareFn=(a,b)=>a-b) {
        this.compareFn = compareFn
        this.heap = new MinHeap(compareFn)
    }
    push(task){
        this.heap.push(task)
    }
    pop(){
        return this.heap.pop()
    }
}