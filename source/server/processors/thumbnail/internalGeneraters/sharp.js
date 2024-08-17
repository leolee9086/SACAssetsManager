/**
 * 使用sharp生成缩略图
 * 需要返回一个png文件对象
 * 
 */
const sharp = require('sharp')

const fs = require('fs')
export default class SharpLoader {
    /**
     * 主要函数，用于生成缩略图数据
     * 需要返回一个png文件对象
     * @param {*} imagePath 
     * @param {*} thumbnailPath 
     * @param {*} width 
     * @param {*} height 
     * @returns 
     */
    generateThumbnail(源文件地址, width = 512, height = 512) {
        return new Promise((resolve, reject) => {
            fs.readFile(源文件地址, (err, data) => {
                if (err) {
                    res.status(404).send(`File not found ${req.query.path}`);
                    return;
                }

                sharp(data)
                    .resize(width, height, {
                        fit: 'inside',
                        withoutEnlargement: true // 防止放大图像
                    })
                    .toBuffer()
                    .then(buffer => {
                        resolve(buffer)
                    })
                    .catch(err => {
                        reject(err)
                    });
         

            });

        })
    }
    /**
     * 匹配图片格式
     * 当有多个loader时，需要根据图片格式选择不同的loader
     * 匹配列表更短的loader优先级更高
     * 返回一个正则表达式
     * 这个loader处理sharp能够处理的所有图片格式
     * 例如：.png .jpg .jpeg .bmp .tiff .webp .gif等等
     * @param {*} imagePath 
     * @returns 
     */
    match(imagePath) {
        return /\.png$|\.jpg$|\.jpeg$|\.bmp$|\.tiff$|\.webp$|\.gif$/;
    }
}