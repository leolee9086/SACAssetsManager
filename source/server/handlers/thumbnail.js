import { SystemThumbnailLoader, SvgLoader, SharpLoader } from '../internalLoaders/loader.js '
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

    



    const svgLoader = new SvgLoader()
    if (源文件地址.match(svgLoader.match(源文件地址))) {
        try {
            const result = await svgLoader.generateThumbnail(源文件地址)
            const type = result.type || 'png'
            if (type) {
                res.type(type).send(result.data)
            } else {
                res.type('png').send(result)
            }
        } catch (e) {
            res.status(500).send('Error processing image: ' + e.message);
        }
        return
    }
    const sharpLoader = new SharpLoader()
    if (源文件地址.match(sharpLoader.match(源文件地址))) {
        /***
               * 对于普通图片，使用sharp进行处理生成缩略图
               */
        sharpLoader.generateThumbnail(源文件地址, 512, 512)
            .then(buffer => {
                缓存对象[缓存键] = buffer;
                res.type('png').send(buffer);
            })
            .catch(err => {
                res.status(500).send('Error processing image: ' + err.message);
            });
        return
    }
    // 普通文件,使用系统缩略图生成器兜底
    const systemThumbnailLoader = new SystemThumbnailLoader()
    const resultBuffer = await systemThumbnailLoader.generateThumbnail(源文件地址)
    if (!resultBuffer) {
        res.status(500).send('Error processing image: ' + err.message);
        return
    } else {
        res.type('png').send(resultBuffer);
        return
    }

}

