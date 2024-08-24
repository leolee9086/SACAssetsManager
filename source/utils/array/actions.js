/**
 * 删除数组中指定位置的元素
 * @param {*} array 
 * @param {*} start 
 * @param {*} end 
 * @returns 
 */
export function sliceDelete(array,start,end){
    return array.slice(0,start).concat(array.slice(end))
}
