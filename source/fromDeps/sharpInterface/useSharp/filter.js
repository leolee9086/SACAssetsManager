/**
 * 滤镜效果模块 - 扩展版
 */

/**
 * 经典黑白胶片滤镜 - 模拟传统黑白胶片的丰富层次感
 */
export const 黑白胶片滤镜 = (img, 强度 = 1) => {
    return img
        .grayscale()
        .modulate({
            brightness: 1 + (强度 * 0.1),
            contrast: 1 + (强度 * 0.3)
        })
        .gamma(0.9 + (强度 * 0.2));
};

/**
 * 高调黑白滤镜 - 创造明亮通透的黑白效果
 */
export const 高调黑白滤镜 = (img, 强度 = 1) => {
    return img
        .grayscale()
        .modulate({
            brightness: 1.3 + (强度 * 0.2),
            contrast: 0.8 + (强度 * 0.1)
        })
        .gamma(1.2);
};

/**
 * 低调黑白滤镜 - 创造富有戏剧性的暗调效果
 */
export const 低调黑白滤镜 = (img, 强度 = 1) => {
    return img
        .grayscale()
        .modulate({
            brightness: 0.8 - (强度 * 0.1),
            contrast: 1.4 + (强度 * 0.3)
        })
        .gamma(0.8);
};

/**
 * 柯达彩色滤镜 - 模拟经典柯达胶片色彩
 */
export const 柯达彩色滤镜 = (img, 强度 = 1) => {
    return img
        .modulate({
            saturation: 1.2 + (强度 * 0.2),
            brightness: 1.1
        })
        .tint({ 
            r: 255, 
            g: 230 + (强度 * 10), 
            b: 210 + (强度 * 15) 
        })
        .gamma(0.9);
};

/**
 * 富士滤镜 - 模拟富士胶片的清新色调
 */
export const 富士滤镜 = (img, 强度 = 1) => {
    return img
        .modulate({
            saturation: 1.1 + (强度 * 0.1),
            brightness: 1.05,
            hue: -5 * 强度
        })
        .tint({ 
            r: 240 + (强度 * 10), 
            g: 255, 
            b: 245 + (强度 * 5) 
        });
};


/* HDR滤镜
 * @param {Sharp} img - Sharp图像对象
 * @param {Object} [选项] - 滤镜选项
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * HDR滤镜(图像, { 强度: 1.5, 范围: 50 })
 */
export const HDR滤镜 = (img, 强度 = 1) => {
    return img
        .modulate({ 
            brightness: 1.1 + (强度 * 0.2), 
            saturation: 1.2 + (强度 * 0.2)
        })
        .clahe({ 
            width: 50, 
            height: 50, 
            maxSlope: 1.2 + (强度 * 0.5)
        });
};

/**
 * 梦幻滤镜
 * @param {Sharp} img - Sharp图像对象
 * @param {Object} [选项] - 滤镜选项
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 梦幻滤镜(图像, { 强度: 0.5 })
 */
export const 梦幻滤镜 = (img, 强度 = 1) => {
    return img
        .modulate({ 
            brightness: 1 + 强度 * 0.2,
            saturation: 1 - 强度 * 0.3
        })
        .blur(强度 * 5)
        .gamma(1 - 强度 * 0.2);
};

/**
 * 好莱坞滤镜 - 现代电影色彩风格，偏暖色调高对比度
 */
export const 好莱坞滤镜 = (img, 强度 = 1) => {
    return img
        .modulate({ 
            saturation: 1.1 + (强度 * 0.2),
            brightness: 1.05,
            contrast: 1.2 + (强度 * 0.2)
        })
        .tint({ 
            r: 255, 
            g: 235 + (强度 * 5), 
            b: 220 + (强度 * 5) 
        })
        .gamma(0.95);
};

/**
 * 新黑色电影滤镜 - 现代黑色电影风格，高对比度暗调
 */
export const 新黑色电影滤镜 = (img, 强度 = 1) => {
    return img
        .modulate({ 
            brightness: 0.9 - (强度 * 0.1),
            contrast: 1.3 + (强度 * 0.3),
            saturation: 0.9
        })
        .tint({ r: 230, g: 230, b: 240 })
        .gamma(1.1 + (强度 * 0.1));
};

/**
 * 欧洲电影滤镜 - 偏冷色调写实风格
 */
export const 欧洲电影滤镜 = (img, 强度 = 1) => {
    return img
        .modulate({ 
            saturation: 0.9 - (强度 * 0.1),
            brightness: 1.05,
            hue: 5
        })
        .tint({ 
            r: 240, 
            g: 245, 
            b: 255 
        })
        .gamma(1.05);
};

/**
 * 复古电影滤镜 - 模拟老式胶片电影效果
 */
export const 复古电影滤镜 = (img, 强度 = 1) => {
    return img
        .modulate({ 
            saturation: 0.7 - (强度 * 0.1),
            brightness: 1.1,
            contrast: 1.1 + (强度 * 0.1)
        })
        .tint({ 
            r: 240 + (强度 * 10), 
            g: 230 + (强度 * 5), 
            b: 200 
        })
        .gamma(0.9)
        .linear(0.1 + (强度 * 0.1), 0);
};

/**
 * 交叉处理滤镜
 * @param {Sharp} img - Sharp图像对象
 * @param {Object} [选项] - 滤镜选项
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 交叉处理滤镜(图像, { 强度: 0.7 })
 */
export const 交叉处理滤镜 = (img, 强度 = 1) => {
    return img
        .modulate({
            brightness: 1.1,
            saturation: 1.5,
            hue: 15
        })
        .tint({ 
            r: 255, 
            g: 220 + (强度 * 20), 
            b: 180 + (强度 * 30) 
        });
};

/**
 * 褪色滤镜
 * @param {Sharp} img - Sharp图像对象
 * @param {Object} [选项] - 滤镜选项
 * @example
 * 褪色滤镜(图像, { 程度: 0.5 })
 */
export const 褪色滤镜 = (img, 程度 = 1) => {
    return img
        .modulate({
            saturation: 1 - 程度 * 0.6,
            brightness: 1 + 程度 * 0.1
        })
        .tint({ r: 255, g: 250, b: 240 })
        .gamma(0.9);
};

/**
 * 冷色调滤镜
 * @param {Sharp} img - Sharp图像对象
 * @param {Object} [选项] - 滤镜选项
 * @example
 * 冷色调滤镜(图像, { 强度: 0.8 })
 */
export const 冷色调滤镜 = (img, 强度 = 1) => {
    return img
        .tint({ r: 200, g: 220, b: 255 })
        .modulate({
            brightness: 1.05,
            saturation: 1 - 强度 * 0.2,
            hue: 180
        });
};

/**
 * 暖色调滤镜
 * @param {Sharp} img - Sharp图像对象
 * @param {Object} [选项] - 滤镜选项
 * @example
 * 暖色调滤镜(图像, { 强度: 0.6 })
 */
export const 暖色调滤镜 = (img, 强度 = 1) => {
    return img
        .tint({ r: 255, g: 220, b: 180 })
        .modulate({
            brightness: 1.05,
            saturation: 1 + 强度 * 0.1,
            hue: -15
        });
};

/**
 * 日落滤镜
 * @param {Sharp} img - Sharp图像对象
 * @param {Object} [选项] - 滤镜选项
 * @example
 * 日落滤镜(图像, { 强度: 0.8 })
 */
export const 日落滤镜 = (img, 强度 = 1) => {
    return img
        .modulate({
            brightness: 1.1,
            saturation: 1.3,
            hue: -20
        })
        .tint({ 
            r: 255, 
            g: 200 + (强度 * 20), 
            b: 150 
        })
        .gamma(0.9);
};

/**
 * 高动态滤镜
 * @param {Sharp} img - Sharp图像对象
 * @param {Object} [选项] - 滤镜选项
 * @example
 * 高动态滤镜(图像, { 强度: 1.4 })
 */
export const 高动态滤镜 = (img, 强度 = 1) => {
    return img
        .modulate({
            brightness: 1.1,
            saturation: 1.3 + (强度 * 0.3)
        })
        .clahe({
            width: 100,
            height: 100,
            maxSlope: 1.2 + (强度 * 0.4)
        });
};

/**
 * 经典胶片滤镜
 * @param {Sharp} img - Sharp图像对象
 * @param {Object} [选项] - 滤镜选项
 * @example
 * 经典胶片滤镜(图像, { 强度: 0.3 })
 */
export const 经典胶片滤镜 = (img, 强度 = 1) => {
    return img
        .modulate({
            brightness: 1.05,
            saturation: 0.9 + (强度 * 0.1)
        })
        .tint({ r: 243, g: 235, b: 220 })
        .gamma(1.1)
        .linear(0.2 + (强度 * 0.2), -(0.1 + 强度 * 0.1));
};

/**
 * 霓虹滤镜
 * @param {Sharp} img - Sharp图像对象
 * @param {Object} [选项] - 滤镜选项
 * @example
 * 霓虹滤镜(图像, { 强度: 0.7, 发光: 5 })
 */
export const 霓虹滤镜 = (img, 强度 = 1) => {
    return img
        .modulate({
            brightness: 1.1 + (强度 * 0.2),
            saturation: 1.3 + (强度 * 0.4)
        })
        .blur(3 + (强度 * 3))
        .sharpen(8 + (强度 * 4))
        .gamma(0.9);
};

/**
 * 水彩滤镜
 * @param {Sharp} img - Sharp图像对象
 * @param {Object} [选项] - 滤镜选项
 * @example
 * 水彩滤镜(图像, { 强度: 0.6, 平滑: 3 })
 */
export const 水彩滤镜 = (img, 强度 = 1) => {
    return img
        .median(2 + Math.floor(强度 * 2))
        .modulate({
            saturation: 1.1 + (强度 * 0.2),
            brightness: 1.05
        })
        .sharpen(3 + (强度 * 4));
};

/**
 * 素描滤镜
 * @param {Sharp} img - Sharp图像对象
 * @param {Object} [选项] - 滤镜选项
 * @example
 * 素描滤镜(图像, { 强度: 0.8 })
 */
export const 素描滤镜 = (img, 强度 = 1) => {
    return img
        .grayscale()
        .negate()
        .blur(0.5)
        .threshold(强度 * 128)
        .negate();
};


