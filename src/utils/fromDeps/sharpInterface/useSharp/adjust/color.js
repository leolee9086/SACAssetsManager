/**
 * 颜色处理模块 - 扩展版
 */

/**
 * 调整色相偏移
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 值 - 色相偏移角度 (-180到180)
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 调整色相偏移(图像, 30)  // 将色相顺时针偏移30度
 */
export const 调整色相偏移 = (img, 值) => {
    return img.modulate({ hue:parseInt(值) });
};

/**
 * 调整色彩鲜艳度
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 值 - 鲜艳度调整值 (-1到1)
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 调整色彩鲜艳度(图像, 0.5)  // 增加色彩鲜艳度
 */
export const 调整色彩鲜艳度 = (img, 值) => {
    return img.modulate({ 
        saturation: 1 + 值,
        brightness: 1 + 值 * 0.1 
    });
};

/**
 * 调整色彩倾向
 * @param {Sharp} img - Sharp图像对象
 * @param {string} 色调 - 目标色调 ('warm'|'cool'|'magenta'|'green')
 * @param {number} 强度 - 倾向强度 (0到1)
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 调整色彩倾向(图像, 'warm', 0.3)  // 添加暖色调
 */
export const 调整色彩倾向 = (img, 色调, 强度 = 0.5) => {
    const 色调映射 = {
        'warm': [[1 + 强度 * 0.2, 0, 0], [0, 1, 0], [0, 0, 1 - 强度 * 0.1]],
        'cool': [[1 - 强度 * 0.1, 0, 0], [0, 1, 0], [0, 0, 1 + 强度 * 0.2]],
        'magenta': [[1 + 强度 * 0.2, 0, 0], [0, 1 - 强度 * 0.1, 0], [0, 0, 1 + 强度 * 0.2]],
        'green': [[1 - 强度 * 0.1, 0, 0], [0, 1 + 强度 * 0.2, 0], [0, 0, 1 - 强度 * 0.1]]
    };
    return img.recomb(色调映射[色调]);
};

/**
 * 调整色彩平衡高光
 * @param {Sharp} img - Sharp图像对象
 * @param {number[]} 值 - [红,绿,蓝] 每个通道的调整值 (-1到1)
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 调整色彩平衡高光(图像, [0.2, 0, -0.1])  // 调整高光区域的色彩平衡
 */
export const 调整色彩平衡高光 = (img, 值) => {
    return img.recomb([
        [1 + 值[0], 0, 0],
        [0, 1 + 值[1], 0],
        [0, 0, 1 + 值[2]]
    ]).linear(1.2, 0);
};

/**
 * 调整色彩平衡阴影
 * @param {Sharp} img - Sharp图像对象
 * @param {number[]} 值 - [红,绿,蓝] 每个通道的调整值 (-1到1)
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 调整色彩平衡阴影(图像, [-0.1, 0, 0.2])  // 调整阴影区域的色彩平衡
 */
export const 调整色彩平衡阴影 = (img, 值) => {
    return img.recomb([
        [1 + 值[0], 0, 0],
        [0, 1 + 值[1], 0],
        [0, 0, 1 + 值[2]]
    ]).linear(0.8, 0);
};

/**
 * 调整色彩选择性
 * @param {Sharp} img - Sharp图像对象
 * @param {string} 目标色相 - 目标色相范围 ('red'|'yellow'|'green'|'cyan'|'blue'|'magenta')
 * @param {Object} 调整 - {饱和度, 亮度, 色相} 调整值 (-1到1)
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 调整色彩选择性(图像, 'red', { 饱和度: 0.3, 亮度: 0.1, 色相: 0 })
 */
export const 调整色彩选择性 = (img, 目标色相, 调整) => {
    const 色相范围 = {
        'red': [330, 30],
        'yellow': [30, 90],
        'green': [90, 150],
        'cyan': [150, 210],
        'blue': [210, 270],
        'magenta': [270, 330]
    };
    
    // 通过LCH色彩空间实现选择性调整
    return img.recomb([
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
    ]).modulate({
        saturation: 1 + 调整.饱和度,
        brightness: 1 + 调整.亮度,
        hue: 调整.色相 * 360
    });
};

/**
 * 调整色彩分离阈值
 * @param {Sharp} img - Sharp图像对象
 * @param {number[]} 阈值 - 每个通道的分离阈值 [r,g,b] (0到255)
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 调整色彩分离阈值(图像, [128, 128, 128])
 */
export const 调整色彩分离阈值 = (img, 阈值) => {
    return img.threshold(阈值[0])
              .recomb([
                [阈值[0]/255, 0, 0],
                [0, 阈值[1]/255, 0],
                [0, 0, 阈值[2]/255]
              ]);
};

/**
 * 调整色彩对比度
 * @param {Sharp} img - Sharp图像对象
 * @param {number[]} 值 - 每个通道的对比度调整值 [r,g,b] (-1到1)
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 调整色彩对比度(图像, [0.2, 0.2, 0.2])
 */
export const 调整色彩对比度 = (img, 值) => {
    return img.recomb([
        [1 + 值[0], 0, 0],
        [0, 1 + 值[1], 0],
        [0, 0, 1 + 值[2]]
    ]);
};


/**
 * 调整饱和度
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 值 - 饱和度调整值，范围[-1,1]，0为原始饱和度，正值增加饱和度，负值降低饱和度
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 调整饱和度(图像, 0.3)  // 增加30%饱和度
 * 调整饱和度(图像, -0.5) // 降低50%饱和度
 */
export const 调整饱和度 = (img, 值) => {
    return img.modulate({
        saturation: 1 + 值
    });
};