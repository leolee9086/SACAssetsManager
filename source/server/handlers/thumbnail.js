import { getLoader } from '../processors/thumbnail/loader.js '
export async function genThumbnail(ctx, next) {
    let { req, res, 缓存对象 } = ctx
    let { 源文件地址, 缓存键 } = ctx.stats
    if (!源文件地址) {
        res.status(400).send('Invalid request: missing source file address');
        return
    }
    let result = null
    let type = null
    /**
     * 参数中可以指定loaderID
     */
    let loaderID = ctx.query.loaderID
    try {
        let loader = await getLoader(源文件地址,loaderID)
        let generateThumbnail =(...args)=> loader.generateThumbnail(...args)
        result = await generateThumbnail(源文件地址, 512, 512)
        if (result) {
            type = result.type
            if (type) {
                res.type(type).send(result.data)
            } else {
                res.type('png').send(result)
            }
        }
        return
    } catch (e) {
        console.warn(e)
        res.status(500).send('Error processing image: ' + e.message);
        return
    }
}
