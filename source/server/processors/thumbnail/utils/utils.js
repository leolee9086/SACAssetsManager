/**
 * 用于从特定的模块中找到特定的类并初始化
 */
async function initLoaderFromEsmModule(modulePath,className,callback,errorCallback){
    try{
        const module = await import(modulePath)
        const target = module[className]
        await callback(target)
    }catch(error){
        await errorCallback(error)
    }
}

/**
 * 用于以字符串形式导入模块
 * 并返回模块
 * 并且在控制台中显示为特定来源url
 * @param {string} moduleString 
 * @param {string} sourceURL
 * @returns {Promise<object>}
 */
async function importEsmModuleFromString(moduleString,sourceURL){
    moduleString+=`\n\n//# sourceURL=${sourceURL}`
    const blob = new Blob([moduleString],{type:'text/javascript'})
    const url = URL.createObjectURL(blob)
    const module = await import(url)
    return module
}