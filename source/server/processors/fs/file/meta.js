/**
 * 
 * @param {*} path 
 * @returns 
 */
function 生成文件指纹(stat){
    const {size,mtime,atime,ctime,birthtime,path} = stat
    //根据文件大小进行随机采样,从指定偏移开始读取少量数据计算哈希
    //固定大小文件生成的偏移值也固定
    const seed = getSeed(size)
}
function  根据文件大小进行伪随机采样(size){
    //保证同样大小的文件生成的采样点相同
    const mod = size%1000
    //这里不能使用随机值,否则会导致相同大小文件生成的采样点不同

    return offset
}