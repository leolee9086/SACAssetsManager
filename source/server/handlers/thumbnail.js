import { getBase64Thumbnail, getLargeIcon } from '../internalLoaders/systermThumbnail.js';
import { generateCacheKey } from '../cache/index.js';
const sharp =require('sharp')
const fs=require('fs')
export async function handlerImageFile(ctx,next) {
    let {req,res,缓存对象}=ctx
    let {源文件地址, 缓存键}= ctx.stats
    if (!源文件地址.match(/\.(jpg|jpeg|png|gif|svg)$/i)) {
        // Handle non-image files
        const encodedPath = Buffer.from(源文件地址).toString('base64');
        let fn = (callback, force) => {
            return (error, result) => {
                try {
                    if (error) {
                        force && res.status(500).send('Error extracting icon: ' + error.message);
                        callback && callback()
                        return;
                    }
                    try {
                        const iconBuffer = Buffer.from(result, 'base64');
                        缓存对象[缓存键]=iconBuffer
                        res.type('png').send(iconBuffer);
                    } catch (error) {
                        force && res.status(500).send('Error extracting icon: ' + error.message);
                        callback && callback()
                        return
                    }
                } catch (e) {
                    console.warn(e)
                    return
                }
            }
        }
        getBase64Thumbnail(encodedPath, fn(() => getLargeIcon(encodedPath, fn('', true))));
    } else {
        // Existing image handling code
        fs.readFile(源文件地址, (err, data) => {
            if (err) {
                res.status(404).send(`File not found ${req.query.path}`);
                return;
            }
            sharp(data)
                .resize(512, 512, {
                    fit: 'inside',
                    withoutEnlargement: true // 防止放大图像
                })
                .toBuffer()
                .then(buffer => {
                    缓存对象[缓存键]=buffer
                    res.type('jpeg').send(buffer);
                })
                .catch(err => {
                    res.status(500).send('Error processing image: ' + err.message);
                });
        });
    }
}

