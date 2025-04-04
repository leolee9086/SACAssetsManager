export async function awaitForEach(array, callback) {
    for (let i = 0; i < array.length; i++) {
        await callback(array[i], i, array)
    }
}
export  function shiftWithFilter(source, filter) {
    return () => {
        let target
        for (let i = 0;  source()[i]; i++) {
            if (filter(source()[i])) {
                
                target= source().splice(i, 1)[0]; // 移除并返回第一个满足条件的元素
            }else{
                console.log(source(),source()[i+1],i)
            }
        }
        return target; // 如果没有元素满足条件，返回 undefined
    }
}
