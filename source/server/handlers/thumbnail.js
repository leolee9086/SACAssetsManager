import { getLoader, listLoaders as listThumbnailLoaders } from '../processors/thumbnail/loader.js '
let cacheLoader = (ctx) => {
    let { 缓存对象, 缓存键, 缓存时间 } = ctx
    let result = 缓存对象.get[缓存键]
    if (result) {
        return result
    }
}
export async function genThumbnail(ctx, next) {
    let { req, res, 缓存对象 } = ctx
    let { 源文件地址, 缓存键 } = ctx.stats
    if (!源文件地址) {
        res.status(400).send('Invalid request: missing source file address');
        return
    }
    let result = null
    let type = null
    let cacheResult = cacheLoader(ctx)
    if (cacheResult) {
        result = cacheResult
    }
    /**
     * 参数中可以指定loaderID
     */
    let loaderID = ctx.query.loaderID
    try {
        let loader = await getLoader(源文件地址, loaderID)
        let generateThumbnail = (...args) => loader.generateThumbnail(...args)
        result = await generateThumbnail(源文件地址, 512, 512)
    } catch (e) {
        console.warn(e)
        res.status(500).send('Error processing image: ' + e.message);
        return
    }

    try {
        if (result) {
            type = result.type
            缓存对象.set(缓存键,result)
            if (type) {
                res.type(type).send(result.data)
            } else {
                res.type('png').send(result)
            }
        } else {
            res.status(404).send('Image not found');
        }
    } catch (e) {
        console.warn(e)
        res.status(500).send('Error processing image: ' + e.message);
    }
    return
}
export function listLoaders(req, res) {
    res.json(listThumbnailLoaders())
}