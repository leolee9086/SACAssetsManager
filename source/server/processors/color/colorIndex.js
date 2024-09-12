import { diffColor } from "./Kmeans.js"
import { getCachePath } from '../fs/cached/fs.js'
import { 修正路径分隔符号为反斜杠, 修正路径分隔符号为正斜杠 } from "../../../utils/fs/fixPath.js"
let colorIndex = []
let loaded = {}
globalThis.colorIndex = globalThis.colorIndex || colorIndex
colorIndex = globalThis.colorIndex
let transactionwsCountStatu = { chunkSize: 10 }
globalThis.colorIndexTransactionwsCountStatu = globalThis.colorIndexTransactionwsCountStatu || transactionwsCountStatu
transactionwsCountStatu = globalThis.colorIndexTransactionwsCountStatu
for (let i = 0; i < 10; i++) {
    transactionwsCountStatu[i] = transactionwsCountStatu[i] || 0
}
/**
 * 添加到颜色索引,这个索引的结构是倒排的
 * @param {*} color 
 * @param {*} assets 
 */
const fs = require('fs')
export async function 获取索引中所有颜色() {
    return colorIndex.map(item => item.color)
}
export async function 根据路径查找并加载颜色索引(path) {
    const { cachePath, root } = await getCachePath(path, 'colorIndex')
    console.error(cachePath, root)
    从路径加载颜色索引(cachePath, root)
}
export async function 从路径加载颜色索引(cachePath, root) {
    const path = require('path')

    try {
        if (loaded[cachePath]) {
            return
        }
        const dirPath = path.dirname(cachePath) + '\\';
        const files = await fs.promises.readdir(dirPath);
        const indexFiles = files.filter(file => {

            return file.startsWith("colorIndex") && file.endsWith('_chunk.json')
        });

        if (indexFiles.length === 0) {
            console.log('没有找到索引文件', cachePath);
            loaded[cachePath] = true;
            return;
        }
        for (const file of indexFiles) {
            const filePath = path.join(dirPath, file);
            if (!loaded[filePath]) {
                if (fs.existsSync(filePath)) {
                    console.log('从', filePath, '加载缓存');
                    loaded[filePath] = true;

                    const data = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
                    // 创建备份文件
                    const today = new Date().toISOString().split('T')[0];
                    const backupPath = filePath.replace('.json', `-${today}.json`);
                    await fs.promises.writeFile(backupPath, JSON.stringify(data));
                    for (let item of data) {
                        item.assets = item.assets && item.assets.map(asset => {
                            if (asset.path.startsWith(root)) {
                                return asset;
                            }
                            return { ...asset, path: path.join(root, asset.path) };
                        });
                        if (item.assets) {
                            colorIndex.push(item);
                        }
                    }
                } else {
                    loaded[filePath] = true;
                }
            }
        }
        loaded[cachePath] = true;

        await 清理颜色索引(colorIndex);
    } catch (e) {
        console.error('从路径加载颜色索引失败', e, cachePath, root);
    }
}


export async function 添加到颜色索引(colorItem, assets) {
    const { cachePath, root } = await getCachePath(assets, 'colorIndex')
    await 从路径加载颜色索引(cachePath, root)

    let colorFormated = colorItem.color.map(num => Math.floor(num))
    const mod = (colorFormated[0] + colorFormated[1] + colorFormated[2]) % transactionwsCountStatu.chunkSize;

    let colorValue = colorFormated.join(',')
    // @todo:如果颜色索引中存在非常接近的颜色，则合并颜色
    let find = colorIndex.find(item => item.color.join(',') === colorValue)
    let asstItem = {
        count: colorItem.count,
        //保留两位小数
        percent: colorItem.percent.toFixed(2),
        path: assets
    }
    if (find) {
        if (find.assets && !find.assets.find(item => item.path === assets)) {
            find.assets.push(asstItem)
            transactionwsCountStatu[mod]++
        }
    } else {
        colorIndex.push({ color: colorFormated, assets: [asstItem] })
        transactionwsCountStatu[mod]++
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
let isSaving = false; // 用于锁定保存过程的变量
let lastSaveTime = 0; // 添加一个变量来记录上次保存的时间

async function 保存颜色索引(targetPath, mapper) {
    const currentTime = Date.now();
    if (currentTime - lastSaveTime < 10000) { // 检查是否距离上次保存不足10秒
        // console.log("距离上次保存不足10秒，跳过本次保存");
        return;
    }
    if (isSaving) {
        console.log("保存过程已在进行中，等待...");
        return;
    }
    isSaving = true; // 锁定保存过程
    let totalCtransaction = 0
    for (let i = 0; i < transactionwsCountStatu.chunkSize; i++) {
        totalCtransaction += transactionwsCountStatu[i]
    }
    if (totalCtransaction <= 1000) {
        console.log("变更少于1000...,跳过保存", transactionwsCountStatu, totalCtransaction);
        isSaving = false
        return
    }
    lastSaveTime = currentTime
    const root = targetPath.replace('\\.sac\\colorIndex', '');
    const fs = require('fs');
    await 清理颜色索引(colorIndex);
    const colorIndexMapped = colorIndex.filter(
        colorItem => {
            return colorItem.assets.some(asset => asset.path.startsWith(root.trim()));
        }
    ).map(mapper).map(item => {
        item.assets = item.assets.filter(asset => asset.path.startsWith(root.trim())).map(asset => {
            return { ...asset, path: asset.path.replace(root.trim(), '') };
        });
        return item;
    });

    if (!loaded[targetPath]) {
        console.error("索引未加载完成,不保存", targetPath);
        isSaving = false; // 解锁保存过程
        return;
    }
    try {
        const chunkSize = transactionwsCountStatu.chunkSize; // 每个分片的大小
        const chunksByMod = {};
        for (let i = 0; i < colorIndexMapped.length; i++) {
            const color = colorIndexMapped[i].color;
            const mod = (color[0] + color[1] + color[2]) % chunkSize;
            if (!chunksByMod[mod]) {
                chunksByMod[mod] = [];
            }
            chunksByMod[mod].push(colorIndexMapped[i]);
        }
        Object.keys(chunksByMod).forEach((mod, index) => {
            if (!transactionwsCountStatu[mod]) {
                console.log(`分片${mod}无变化,不需要保存`)
                return
            }
            const chunkData = JSON.stringify(chunksByMod[mod]);
            const chunkPath = `${targetPath}_${mod}_chunk.json`;
            fs.writeFileSync(chunkPath, chunkData);
            transactionwsCountStatu[mod] = 0
            console.log(`颜色索引分片(模${mod})已成功保存`);
        });
    } catch (e) {
        console.error("颜色索引保存错误", e);
    } finally {
        isSaving = false; // 解锁保存过程
    }
}
export async function 根据颜色查找内容(color, cutout = 0.6) {
    let result = [];
    for (let i = 0; i < colorIndex.length; i++) {
        let item = colorIndex[i];
        let diffResult = diffColor(item.color, color, cutout)
        if (diffResult) {
            // 这里不需要返回，直接校验
            // 校验颜色索引文件条目(item);
            result = result.concat(item.assets);
        }
    }
    return Array.from(new Set(result.map(item => item.path)));
}
export async function 流式根据颜色查找内容(color, cutout = 0.6, callback, endCallback) {
    let count = colorIndex.length
    return new Promise((resolve, reject) => {
        for (let i = 0; i < colorIndex.length; i++) {
            let item = colorIndex[i];
            let fn = async () => {
                let diffResult = diffColor(item.color, color, cutout)
                if (diffResult) {
                    let len = item.assets.length
                    item.assets.forEach(
                        data => {
                            count++
                            len--
                            callback(data.path, count)
                            len === 0 && count--
                        }
                    )
                }
            }
            setImmediate(
                fn
            )
        }
    })
}
export async function 找到文件颜色(path) {

    let finded = []
    for (let i = 0; i < colorIndex.length; i++) {
        let item = colorIndex[i]
 
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
export async function 删除文件颜色记录(path) {
    let fixedPath = 修正路径分隔符号为反斜杠(path);
    console.log('删除颜色记录', path, fixedPath);
    
    let 已删除计数 = 从颜色索引中删除路径(path);
    
    移除空的颜色记录();
    
    console.log(`已从颜色索引中删除 ${已删除计数} 条与路径 "${path}" 相关的记录`);
    
    if (fixedPath !== path) {
        删除文件颜色记录(fixedPath);
    }
}

function 从颜色索引中删除路径(path) {
    let 已删除计数 = 0;
    for (let item of colorIndex) {
        let 原始长度 = item.assets.length;
        item.assets = item.assets.filter(asset => asset.path !== path);
        已删除计数 += 原始长度 - item.assets.length;
    }
    return 已删除计数;
}

function 移除空的颜色记录() {
    colorIndex = colorIndex.filter(item => item.assets.length > 0);
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