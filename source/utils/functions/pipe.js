/**
 * 顺序流水线,错误不进行特殊处理直接抛出
 * @param {*} 函数数组 
 * @param  {...any} args 
 * @returns 
 */
export function 顺序流水线(函数数组,自动数组化输出=false, ...args) {
    return ()=>{
        const 中间结果 = {value:args}
        for(let i=0;i<函数数组.length;i++){
            const result = 函数数组[i](...中间结果.value)
            if(Array.isArray(result)){
                中间结果.value = result
            }else if(自动数组化输出){
                中间结果.value = [result]
            }else{
                throw new Error('管道函数输出错误,中间结果必须为数组')
            }
        }
    }
}

/**
 * 异步流水线,错误不进行特殊处理直接抛出
 * @param {*} 函数数组 
 * @param  {...any} args 
 * @returns 
 */
export function 异步流水线(函数数组,自动数组化输出=false, ...args) {
    return async ()=>{
        const 中间结果 = {value:args}
        for(let i=0;i<函数数组.length;i++){
            const result = await 函数数组[i](...中间结果.value)
            if(Array.isArray(result)){
                中间结果.value = result
            }else if(自动数组化输出){
                中间结果.value = [result]
            }else{
                throw new Error('管道函数输出错误,中间结果必须为数组')
            }
        }
    }
}

/**
 * 顺序不可变流水线,错误不进行特殊处理直接抛出
 * 每一步的输入输出是上一部输出结果的深拷贝
 * @param {*} 函数数组 
 * @param  {...any} args 
 * @returns 
 */
export function 顺序不可变流水线(函数数组,自动数组化输出=false, ...args) {
    return ()=>{
        const 中间结果 = {value:deepClone(args)}
        for(let i=0;i<函数数组.length;i++){
            const result = 函数数组[i](...中间结果.value)
            if(Array.isArray(result)){
                中间结果.value = deepClone(result)
            }else if(自动数组化输出){
                中间结果.value = [deepClone(result)]
            }else{
                throw new Error('管道函数输出错误,中间结果必须为数组')
            }
        }
    }
}   

/**
 * 异步不可变流水线,错误不进行特殊处理直接抛出
 * 每一步的输入输出是上一部输出结果的深拷贝
 * @param {*} 函数数组 
 * @param  {...any} args 
 * @returns 
 */
export function 异步不可变流水线(函数数组,自动数组化输出=false, ...args) {
    return async ()=>{
        const 中间结果 = {value:deepClone(args)}
        for(let i=0;i<函数数组.length;i++){
            const result = await 函数数组[i](...中间结果.value)
            if(Array.isArray(result)){
                中间结果.value = deepClone(result)
            }else if(自动数组化输出){
                中间结果.value = [deepClone(result)]
            }else{
                throw new Error('管道函数输出错误,中间结果必须为数组')
            }
        }
    }
}

