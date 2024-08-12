import { getLoader } from '../internalLoaders/loader.js '
export async function handlerImageFile(ctx, next) {
    let { req, res, 缓存对象 } = ctx
    let { 源文件地址, 缓存键 } = ctx.stats
    if (!源文件地址) {
        res.status(400).send('Invalid request: missing source file address');
        return
    }
    try {
        let loader = await getLoader(源文件地址)
        let generateThumbnail = loader.generateThumbnail
        let result = await generateThumbnail(源文件地址,512,512)
        const type = result.type 
        console.log(type,result)
        if (type) {
            res.type(type).send(result.data)
        } else {
            res.type('png').send(result)
        }
        return
    }catch(e){
        console.warn(e)
        res.status(500).send('Error processing image: ' + e.message);
        return
    }    
}

