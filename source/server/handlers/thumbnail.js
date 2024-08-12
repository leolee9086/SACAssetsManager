import { SharpLoader } from '../internalLoaders/sharp.js';
import { SystemThumbnailLoader } from '../internalLoaders/systermThumbnail.js';
import { SvgLoader } from '../internalLoaders/svg.js';
const fs=require('fs')
export async function handlerImageFile(ctx,next) {
    let {req,res,缓存对象}=ctx
    let {源文件地址, 缓存键}= ctx.stats
    if (!源文件地址.match(/\.(jpg|jpeg|png|gif|svg)$/i)) {
        // Handle non-image files
        const systemThumbnailLoader = new SystemThumbnailLoader()
        const resultBuffer = await systemThumbnailLoader.generateThumbnail(源文件地址)
        if(!resultBuffer){
            res.status(500).send('Error processing image: ' + err.message);
            return
        }else{
            res.type('png').send(resultBuffer);
            return
        }
    } else {
        if (源文件地址.toLowerCase().endsWith('.svg')) {
            const svgLoader = new SvgLoader()
            try{
                const result = await svgLoader.generateThumbnail(源文件地址)
                const type =result.type||'png'
                if(type){
                    res.type(type).send(result.data)
                }else{
                    res.type('png').send(result)
                }
            }catch(e){
                res.status(500).send('Error processing image: ' + e.message);
            }
            return
        }
        /***
         * 对于普通图片，使用sharp进行处理生成缩略图
         */
        new SharpLoader().generateThumbnail(源文件地址, 512, 512)
            .then(buffer => {
                缓存对象[缓存键] = buffer;
                res.type('png').send(buffer);
            })
            .catch(err => {
                res.status(500).send('Error processing image: ' + err.message);
            });
        return
    }
}

