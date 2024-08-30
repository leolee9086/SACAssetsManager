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
const fs = require('fs')
export async function 根据路径查找并加载颜色索引(path){
    const { cachePath, root } = getCachePath(path, 'colorIndex.json')
    console.error(cachePath,root)
     从路径加载颜色索引(cachePath,root)
}
export async function 从路径加载颜色索引(cachePath,root){
    if (fs.existsSync(cachePath) && !loaded[cachePath]) {
        console.log('从', cachePath, '加载缓存')
        loaded[cachePath] = true
        const cached = JSON.parse( await fs.promises.readFile(cachePath))
         for(let i=0;i<cached.length;i++){
            let item = cached[i]
            item.assets = item.assets.map(asset => {
                    if (asset.path.startsWith(root)) {
                        return asset
                    }
                    return { ...asset, path: require('path').join(root, asset.path) }
                })
                colorIndex.push(item)
            
        }
        清理颜色索引(colorIndex)
    }
}
export async function 添加到颜色索引(colorItem, assets) {
    const { cachePath, root } = getCachePath(assets, 'colorIndex.json')
    await 从路径加载颜色索引(cachePath,root)
    let colorFormated = colorItem.color.map(num => Math.floor(num))
    // @todo:如果颜色索引中存在非常接近的颜色，则合并颜色
    let find = colorIndex.find(item => item.color.every((num, index) => num === colorFormated[index]))
    let asstItem = {
        count: colorItem.count,
        percent: colorItem.percent,
        path: assets
    }
    if (find) {
        find.assets.push(asstItem)
    } else {
        colorIndex.push({ color: colorFormated, assets: [asstItem] })
    }
    await 保存颜色索引(cachePath, item => {
        return {
            color: item.color,
            assets: item.assets
        }
    })
}
/**
 * 保存颜色索引,允许先映射再保存
 * @param {string} targetPath 
 * @param {function} mapper 
 */
let transactionwsCount = 0
async function 保存颜色索引(targetPath, mapper) {
    transactionwsCount++
    if (transactionwsCount < 100) {
        return
    }
    const root = targetPath.replace('\\.sac\\colorIndex.json', '').replace('\\.sac\\colorIndex.json', '')
    const fs = require('fs')
    清理颜色索引(colorIndex)
    const colorIndexMapped = colorIndex.filter(
        colorItem => {
            return colorItem.assets.find(asset => asset.path.startsWith(root.trim()))
        }
    ).map(mapper).map(item => {
        item.assets = item.assets.filter(asset => asset.path.startsWith(root.trim())).map(asset => { return { ...asset, path: asset.path.replace(root.trim(), '') } })
        return item
    })
    fs.writeFile(targetPath, JSON.stringify(colorIndexMapped), (err) => {
        if (err) {
            console.error(err)
        }
    })
    transactionwsCount = 0
}
export async function 根据颜色查找内容(color, cutout = 0.6) {
    let find = colorIndex.filter(
        item => diffColor(item.color, color, cutout)
    )
    let result = []
    for await (let colorItem of find) {
        //这里不需要返回,直接校验
        await 校验颜色索引文件条目(colorItem)
        result = result.concat(colorItem.assets)

    }
    return Array.from(new Set(result.map(item => item.path)))
}
export async function 找到文件颜色(path) {
    let finded = []
    for (let i = 0; i < colorIndex.length; i++) {
        let item = colorIndex[i]
        let exist = finded.find(
            item2 => item2.color.every((num, index) => { return num === item.color[index] })
        )
        if (exist) {
            continue
        }

        let find = item.assets.find(assetItem => assetItem.path === path)
        if (find) {
            finded.push({
                color: item.color,
                count: find.count,
                percent: find.percent
            })
        }
    }
    if (finded.length > 0) {
        return finded
    }
    return null
}
async function 清理颜色索引(颜色索引) {
    let 清理后索引 = new Map()
    console.log('清理颜色索引', 颜色索引.length)
    const start = performance.now()
    for (let i = 0; i < 颜色索引.length; i++) {
        let 颜色项目 = 颜色索引[i]
        let 颜色值 = 颜色项目.color.join(',')
        let 已存在索引 = 清理后索引.get(颜色值)
        if (!已存在索引) {
            清理后索引.set(颜色值, 颜色项目)
        }
        else {
            已存在索引.assets = 颜色项目.assets.concat(已存在索引.assets)
        }
    }
    //所有的值
    colorIndex = Array.from(清理后索引.values());
    const end = performance.now()
    console.log('索引清理耗时', end - start)
}
export async function 根据颜色查找并校验颜色索引文件条目(颜色) {
    let 颜色值 = 颜色.join(',')
    let 颜色索引条目 = colorIndex.find(item => item.color.join(',') === 颜色值)
    if (!颜色索引条目) {
        return null
    }
    return await 校验颜色索引文件条目(颜色索引条目)
}
export async function 校验颜色索引文件条目(颜色索引条目) {
    const 路径存在Promises = []
    for (let asset of 颜色索引条目.assets) {
        路径存在Promises.push(
            new Promise((resolve, reject) => {
                fs.exists(asset.path, (exists) => {
                    if (!exists) {
                        颜色索引条目.assets.splice(颜色索引条目.assets.indexOf(asset), 1)
                    }
                    resolve(exists)
                })
            })
        )
    }
    const 路径存在结果 = await Promise.all(路径存在Promises)
    return 路径存在结果.every(Boolean)
}