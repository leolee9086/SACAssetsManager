import { diffColor } from "./Kmeans.js"
import { getCachePath } from '../fs/cached/fs.js'
let colorIndex = []
let loaded = {}
globalThis.colorIndex = globalThis.colorIndex || colorIndex
colorIndex = globalThis.colorIndex
/**
 * 添加到颜色索引,这个索引的结构是倒排的
 * @param {*} color 
 * @param {*} assets 
 */
const fs=require('fs')
export async function 添加到颜色索引(colorItem, assets) {
    const {cachePath} = getCachePath(assets,'colorIndex.json')
    if(fs.existsSync(cachePath)&&!loaded[cachePath]){
        console.log('从',cachePath,'加载缓存')

        loaded[cachePath]=true
        const cached =JSON.parse(fs.readFileSync(cachePath))
        cached.forEach(
            item=>{
                colorIndex.push(item)
            }
        )
    }
    let colorFormated = colorItem.color.map(num => Math.floor(num))
    // @todo:如果颜色索引中存在非常接近的颜色，则合并颜色
    let find = colorIndex.find(item => item.color.every((num, index) => num === colorFormated[index]))
    let asstItem = {
        count:colorItem.count,
        percent:colorItem.percent,
        path:assets
    }
    if (find) {
        find.assets.push(asstItem)
    } else {
        colorIndex.push({ color: colorFormated, assets: [asstItem] })
    }
    await 保存颜色索引(cachePath,item=>{
        return {
            color:item.color,
            assets:item.assets
        }
    })
}
/**
 * 保存颜色索引,允许先映射再保存
 * @param {string} targetPath 
 * @param {function} mapper 
 */
let trasactionwsCount=0
async function 保存颜色索引(targetPath,mapper) {
    trasactionwsCount++
    if(trasactionwsCount<100){
        return
    }
    const fs = require('fs')
    const colorIndexMapped=colorIndex.map(mapper)
    fs.writeFileSync(targetPath, JSON.stringify(colorIndexMapped))
    trasactionwsCount=0
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
export async function 找到文件颜色(path){
   let finded =[]
   for(let i =0;i<colorIndex.length;i++){
    let item=colorIndex[i]
    let find=item.assets.find(assetItem=>assetItem.path===path)
    if(find){
        finded.push({
            color:item.color,
            count:find.count,
            percent:find.percent
        })
    }
   }
   if(finded.length>0){
    return finded
   }
   return null
}