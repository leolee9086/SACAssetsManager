/**
 * 特效处理模块 - 提供各种图像特效
 */
import { requirePluginDeps } from "../../../module/requireDeps.js";
const sharp = requirePluginDeps('sharp')

/**
 * 添加水印
 * @param {Sharp} img - Sharp图像对象
 * @param {Buffer|String} 水印图片 - 水印图片buffer或路径
 * @param {Object} [选项] - 水印选项
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 添加水印(图像, 水印, { 位置: 'southeast', 透明度: 0.8 })
 */
export const 添加水印 = (img, 水印图片, 选项 = {}) => {
    return img.composite([{
        input: 水印图片,
        gravity: 选项.位置 || 'southeast',
        blend: 选项.混合模式 || 'over',
        opacity: 选项.透明度 || 1,
        top: 选项.上边距,
        left: 选项.左边距,
        tile: 选项.平铺
    }]);
};

/**
 * 添加边框
 * @param {Sharp} img - Sharp图像对象
 * @param {number|number[]} 宽度 - 边框宽度[上,右,下,左]或统一宽度
 * @param {Object|String} 颜色 - 边框颜色
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 添加边框(图像, [20,20,20,20], '#ffffff')
 */
export const 添加边框 = (img, 宽度, 颜色) => {
    const [上, 右, 下, 左] = Array.isArray(宽度) ? 宽度 : [宽度, 宽度, 宽度, 宽度];
    return img.extend({
        top: 上,
        right: 右,
        bottom: 下,
        left: 左,
        background: 颜色
    });
};

/**
 * 添加阴影
 * @param {Sharp} img - Sharp图像对象
 * @param {Object} [选项] - 阴影选项
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 添加阴影(图像, { 模糊: 10, 偏移: [5,5], 颜色: '#000000' })
 */
export const 添加阴影 = (img, 选项 = {}) => {
    return img.metadata()
        .then(metadata => {
            const 阴影 = Sharp({
                create: {
                    width: metadata.width + 40,
                    height: metadata.height + 40,
                    channels: 4,
                    background: 选项.颜色 || { r: 0, g: 0, b: 0, alpha: 0.3 }
                }
            }).blur(选项.模糊 || 10);

            return img.composite([{
                input: 阴影,
                left: 选项.偏移?.[0] || 5,
                top: 选项.偏移?.[1] || 5
            }]);
        });
};

/**
 * 添加渐变边缘
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 宽度 - 渐变宽度
 * @param {Object} [选项] - 渐变选项
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 添加渐变边缘(图像, 20, { 方向: 'horizontal' })
 */
export const 添加渐变边缘 = (img, 宽度, 选项 = {}) => {
    return img.metadata()
        .then(metadata => {
            const 是水平 = 选项.方向 === 'horizontal';
            const 渐变 = Sharp({
                create: {
                    width: metadata.width,
                    height: metadata.height,
                    channels: 4,
                    background: { r: 255, g: 255, b: 255, alpha: 0 }
                }
            }).linear(
                是水平 ? [0, 宽度] : [宽度, 0],
                [0, 1]
            );

            return img.composite([{
                input: 渐变,
                blend: 'multiply'
            }]);
        });
};

/**
 * 添加镜像反射
 * @param {Sharp} img - Sharp图像对象
 * @param {Object} [选项] - 反射选项
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 添加镜像反射(图像, { 高度: 0.3, 透明度: 0.5 })
 */
export const 添加镜像反射 = (img, 选项 = {}) => {
    return img.metadata()
        .then(metadata => {
            const 反射高度 = Math.round(metadata.height * (选项.高度 || 0.3));
            return img.extend({
                bottom: 反射高度,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            }).composite([{
                input: img.flip().blur(2),
                top: metadata.height,
                opacity: 选项.透明度 || 0.5
            }]);
        });
};

/**
 * 添加光晕效果
 * @param {Sharp} img - Sharp图像对象
 * @param {Object} [选项] - 光晕选项
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 添加光晕效果(图像, { 强度: 0.5, 颜色: '#ffffff' })
 */
export const 添加光晕效果 = (img, 选项 = {}) => {
    return img.metadata()
        .then(metadata => {
            const 光晕 = Sharp({
                create: {
                    width: metadata.width,
                    height: metadata.height,
                    channels: 4,
                    background: 选项.颜色 || { r: 255, g: 255, b: 255, alpha: 1 }
                }
            }).blur(30);

            return img.composite([{
                input: 光晕,
                blend: 'screen',
                opacity: 选项.强度 || 0.5
            }]);
        });
};

/**
 * 添加边角效果
 * @param {Sharp} img - Sharp图像对象
 * @param {string} 类型 - 边角类型
 * @param {Object} [选项] - 边角选项
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 添加边角效果(图像, 'rounded', { 半径: 20 })
 */
export const 添加边角效果 = (img, 类型, 选项 = {}) => {
    const 效果映射 = {
        'rounded': () => img.composite([{
            input: Buffer.from(`<svg><rect width="100%" height="100%" rx="${选项.半径 || 10}" ry="${选项.半径 || 10}"/></svg>`),
            blend: 'dest-in'
        }]),
        'diagonal': () => img.composite([{
            input: Buffer.from(`<svg><polygon points="0,0 100%,0 100%,100%"/></svg>`),
            blend: 'dest-in'
        }])
    };

    return (效果映射[类型] || (() => img))();
};

// 导出所有效果函数
export default {
    添加水印,
    添加边框,
    添加阴影,
    添加渐变边缘,
    添加镜像反射,
    添加光晕效果,
    添加边角效果
};



// 辅助方法
export const 添加水彩效果 = async (alphaChannel, opacity, options) => {
    return alphaChannel
        .raw()
        .toBuffer()
        .then(buffer => {
            const newBuffer = Buffer.alloc(buffer.length * 3)
            for (let i = 0; i < buffer.length; i++) {
                const alpha = buffer[i]
                const noise = Math.floor(Math.random() * 41) - 20
                newBuffer[i] = Math.max(0, Math.min(255,
                    Math.floor((alpha + noise) * opacity)
                ))
            }
            return sharp(newBuffer, {
                raw: {
                    width: options.width,
                    height: options.height,
                    channels: 1
                }
            }).png()
        })
}

export const 创建纯色图片=async(rgb, alphaChannel, options) =>{
    const rgbImage = await sharp({
        create: {
            width: options.width,
            height: options.height,
            channels: 3,
            background: rgb
        }
    }).raw().toBuffer()
    let buffer = await sharp(rgbImage, {
        raw: {
            width: options.width,
            height: options.height,
            channels: 3
        }
    })
        .joinChannel(await alphaChannel.toBuffer())
        .png()
        .toBuffer()
    return buffer
}
