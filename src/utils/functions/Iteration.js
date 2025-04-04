export async function 定长迭代(可迭代对象,迭代函数,阈值,忽略空值=false,忽略错误=false){
    let count = 0
    for await (let item of 可迭代对象){
        if(忽略空值&&!item){
            continue
        }
        try{
            await 迭代函数(item)
        }catch(e){
            if(!忽略错误){
                throw e
            }
        }
        count++
        if(count>=阈值){
            break
        }
    }
}


/**
 * 定长执行,直到阈值,无限循环时,会弹出确认框,是否继续
 * @param function 生成函数 
 * @param function 迭代函数 
 * @param number 阈值 
 * @param boolean 忽略空值 
 * @param boolean 忽略迭代错误 
 * @param boolean 忽略执行错误 
 */
export async function 定长执行(生成函数,迭代函数,阈值,忽略空值=false,忽略迭代错误=false,忽略执行错误=false){
    //一个非常大的数值,超过这个数值,则认为可能无限循环,跳出提示
    let 内建阈值=1000000
    let 内建计数=0
    for (let i=0;i<阈值;i++){
        内建计数++
        if(内建计数>内建阈值){
            let 是否继续 = confirm("可能无限循环,是否继续?")
            if(!是否继续){
                console.warn("可能无限循环,退出",new Error().stack)
                break
            }else{
                内建计数=0
            }
        }
        let item
        try{
            item = await 生成函数()
            if(!item){
                if(忽略空值){
                    i--
                    continue
                }
            }
        }catch(e){
            if(!忽略执行错误){
                throw e
            }
        }
        try{
            await 迭代函数(item)
        }catch(e){
            if(!忽略迭代错误){
                throw e
            }
        }
    }
}


/**
 * 正向遍历.调用方式是:
 * 正向遍历(可迭代对象,迭代函数,忽略错误,忽略空值).直到(判定函数)
 * @param {*} 可迭代对象 
 * @param {*} 迭代函数 
 * @param {*} 忽略错误 
 * @param {*} 忽略空值 
 * @returns 
 */
export const 正向遍历 = (可迭代对象,迭代函数,忽略错误=false,忽略空值=false)=>{
    const 遍历函数 =async(判定函数)=>{
         for await (let item of 可迭代对象){
            if(判定函数(item)){
                break
            }
            if(忽略空值&&!item){
                continue
            }
            try{
                await 迭代函数(item)
            }catch(e){
                if(!忽略错误){
                    throw e
                }
            }
        }
    }
    return {
        直到:(判定函数)=>{
            return 遍历函数(判定函数)
        }
    }
}

/**
 * 反向遍历.调用方式是:
 * 反向遍历(可迭代对象,迭代函数,忽略错误,忽略空值).直到(判定函数)
 * @param {*} 可迭代对象 
 * @param {*} 迭代函数 
 * @param {*} 忽略错误 
 * @param {*} 忽略空值 
 * @returns 
 */
export const 反向遍历 = (可迭代对象,迭代函数,忽略错误=false,忽略空值=false)=>{
    let 反向可迭代对象 = 可迭代对象.reverse()
    const 遍历函数 =async(判定函数)=>{
        for await (let item of 反向可迭代对象){
            if(判定函数(item)){
                break
            }
            if(忽略空值&&!item){
                continue
            }
            try{
                await 迭代函数(item)
            }catch(e){
                if(!忽略错误){
                    throw e
                }
            }
        }
    }
    return {
        直到:(判定函数)=>{
            return 遍历函数(判定函数)
        }
    }
}