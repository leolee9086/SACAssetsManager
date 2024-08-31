import { buildCache } from "../../../processors/cache/cache";
/**
 * 用于在res上添加sendFileWithCache方法
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
export function addSendFileWithMemoryCache(req,res,next) {
    //传入缓存以及是否忽略错误
    function sendFileWithCache(filePath,cache,ignoreError=false) {
        //如果cache是一个字符串,使用它创建缓存
        const cacheObject = typeof cache === 'string'?buildCache(cache):cache
        
        return new Promise((resolve,reject)=>{
            try{
                if(cacheObject.get(filePath)){
                    res.send(cache.get(filePath))
                    resolve(true)
                    return
                }else{
                    resolve(false)
                }
            }catch(e){
                if(!ignoreError){
                    reject(e)
                }else{
                    resolve(false)
                }
            }
        })
    }
    res.sendFileWithCache = sendFileWithCache
    next&&next()
}

