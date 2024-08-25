import { diffColor } from "./Kmeans.js"

let colorIndex = []
globalThis.colorIndex = globalThis.colorIndex || colorIndex
colorIndex = globalThis.colorIndex
export async function 添加到颜色索引(color,assets){
    let colorFormated = color.map(num=>Math.floor(num))
    // @todo:如果颜色索引中存在非常接近的颜色，则合并颜色
    
    let find = colorIndex.find(item=>item.color.every((num,index)=>num===colorFormated[index]))
    if(find){
        find.assets.push(assets)
    }else{
        colorIndex.push({color:colorFormated,assets:[assets]})
    }
}


export async function 根据颜色查找内容(color){
    let find = colorIndex.filter(
        item => diffColor(item.color,color)
    )
    return find.reduce((acc,item)=>{
        item.assets.forEach(
            asset=>{
                if(!acc.includes(asset)){
                    acc.push(asset)
                }
        
            }
        )
        return acc
    },[])
}