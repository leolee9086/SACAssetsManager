/**
 * 让函数按照时间分片进行执行,分片如果没有耗尽,设法等待到分片耗尽才会返回
 * 用于避免过快的遍历造成的流背压等,仅仅在这种特殊情况下使用
 * @param {*} 原始函数 
 * @param {*} 时间分片 
 */
const  按时间分片执行=(原始函数,时间分片)=>{
    if(typeof 时间分片 !== "number"){
        throw new Error("时间分片必须是数字")
    }else if(时间分片<=0){
        throw new Error("时间分片必须大于0")
    }else if(typeof 原始函数 !== "function"){
        throw new Error("原始函数必须是函数")
    }
    return async(...args)=>{
        const 开始执行时间 = performance.now()
        await 原始函数(...args)
        let 时间分片结束
        while(!时间分片结束){
            时间分片结束 = performance.now() - 开始执行时间 >= 时间分片
        }
        return new Promise(resolve=>setTimeout(resolve,0))
    }
}