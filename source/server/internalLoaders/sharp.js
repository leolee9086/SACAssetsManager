/**
 * 使用sharp生成缩略图
 * 需要返回一个png文件对象
 * 
 */
export class SharpLoader {
    /**
     * 主要函数，用于生成缩略图数据
     * 需要返回一个png文件对象
     * @param {*} imagePath 
     * @param {*} thumbnailPath 
     * @param {*} width 
     * @param {*} height 
     * @returns 
     */
    generateThumbnail(imagePath, thumbnailPath, width=512, height=512) {
        const sharp = require('sharp');
        const file = sharp(imagePath).resize(width, height).toFile(thumbnailPath);
        return file;
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