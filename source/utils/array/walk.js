export async function awaitForEach(array,callback){
    for(let i=0;i<array.length;i++){
        await callback(array[i],i,array)
    }
}