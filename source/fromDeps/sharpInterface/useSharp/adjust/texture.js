

/**
 * 调整纹理
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 值 - 纹理调整值，范围[-1,1]，0为原始纹理，正值增强纹理，负值弱化纹理
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 调整纹理(图像, 0.6)  // 增强纹理
 * 调整纹理(图像, -0.4) // 弱化纹理
 */
export const 调整纹理 = (img, 值) => {
    if (值 > 0) {
        return img
            .sharpen({
                sigma: 0.5,
                m1: 值 * 3,
                m2: 值 * 2
            })
            .modulate({
                brightness: 1 + 值 * 0.05
            });
    } else {
        return img
            .blur(-值 * 0.5)
            .modulate({
                brightness: 1 - 值 * 0.05
            });
    }
};

/**
 * 调整噪点
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 值 - 噪点调整值，范围[-1,1]，0为原始噪点，正值增加噪点，负值减少噪点
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 调整噪点(图像, 0.3)  // 增加噪点
 * 调整噪点(图像, -0.5) // 减少噪点
 */
export const 调整噪点 = (img, 值) => {
    if (值 > 0) {
        return img.linear(1 + 值 * 0.2, -(值 * 20));
    } else {
        return img.median(Math.round(-值 * 3));
    }
};






/**
 * 调整边缘锐度
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 值 - 边缘锐度调整值，范围[-1,1]，0为原始锐度
 */
export const 调整边缘锐度 = (img, 值) => {
    if (值 > 0) {
        return img.sharpen({
            sigma: 0.5,
            m1: 值 * 2,
            m2: 值,
            x1: 2,
            y2: 10
        });
    } else {
        return img.blur(-值);
    }
};

