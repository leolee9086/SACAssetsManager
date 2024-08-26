import { diffColor } from "./Kmeans.js"

let colorIndex = []
globalThis.colorIndex = globalThis.colorIndex || colorIndex
colorIndex = globalThis.colorIndex
/**
 * 添加到颜色索引,这个索引的结构是倒排的
 * @param {*} color 
 * @param {*} assets 
 */
export async function 添加到颜色索引(color, assets) {
    let colorFormated = color.map(num => Math.floor(num))
    // @todo:如果颜色索引中存在非常接近的颜色，则合并颜色
    let find = colorIndex.find(item => item.color.every((num, index) => num === colorFormated[index]))
    if (find) {
        find.assets.push(assets)
    } else {
        colorIndex.push({ color: colorFormated, assets: [assets] })
    }
}
/**
 * 保存颜色索引,允许先映射再保存
 * @param {string} targetPath 
 * @param {function} mapper 
 */
async function 保存颜色索引(targetPath,mapper) {
    const fs = require('fs')
    const colorIndexMapped=colorIndex.map(mapper)
    fs.writeFileSync(targetPath, JSON.stringify(colorIndexMapped))
}
/**
 * 加载颜色索引
 * @param {*} targetPath 
 */
async function 加载颜色索引(targetPath,mapper) {
    const fs = require('fs')
    const result = JSON.parse(fs.readFileSync(targetPath))
    /**
     * 进行合并
     */
    const mappedResult=result.map(mapper)
    mappedResult.forEach(item=>{
        let find=colorIndex.find(item=>item.color.every((num,index)=>num===item.color[index]))
        if(find){
            find.assets.push(item.assets)
        }else{
            colorIndex.push(item)
        }
    })
}
export async function 根据颜色查找内容(color) {
    let find = colorIndex.filter(
        item => diffColor(item.color, color)
    )
    return find.reduce((acc, item) => {
        item.assets.forEach(
            asset => {
                if (!acc.includes(asset)) {
                    acc.push(asset)
                }

            }
        )
        return acc
    }, [])
}