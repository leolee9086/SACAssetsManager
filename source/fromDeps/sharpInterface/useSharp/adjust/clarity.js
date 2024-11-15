
/**
 * 调整锐度
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 值 - 锐度调整值，范围[-1,1]，0为原始锐度，正值增加锐度，负值降低锐度
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 调整锐度(图像, 0.6)  // 增加60%锐度
 * 调整锐度(图像, -0.3) // 降低30%锐度
 */
export const 调整锐度 = (img, 值) => {
    return img.sharpen({
        sigma: 1 + Math.abs(值),
        m1: 值 > 0 ? 1 : 0.5,
        m2: 值 > 0 ? 2 : 1
    });
};

/**
 * 调整平滑度
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 值 - 平滑度值，范围[0,20]，0为不平滑，值越大越平滑
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 调整平滑度(图像, 3)  // 适中的平滑效果
 * 调整平滑度(图像, 10) // 强烈的平滑效果
 */
export const 调整平滑度 = (img, 值) => {
    return img.median(Math.round(值));
};

/**
 * 调整清晰度
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 值 - 清晰度调整值，范围[-1,1]，0为原始清晰度，正值增加清晰度，负值减少清晰度
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 调整清晰度(图像, 0.5)  // 增加清晰度
 * 调整清晰度(图像, -0.3) // 减少清晰度
 */
export const 调整清晰度 = (img, 值) => {
    if (值 > 0) {
        return img
            .sharpen({
                sigma: 1,
                m1: 值 * 1.5,
                m2: 值
            })
            .modulate({
                brightness: 1 + 值 * 0.1
            });
    } else {
        return img
            .blur(-值)
            .modulate({
                brightness: 1 - 值 * 0.1
            });
    }
};



/**
 * 调整锐化半径
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 值 - 锐化半径值，范围[0.5,5]，值越大影响范围越大
 */
export const 调整锐化半径 = (img, 值) => {
    return img.sharpen({
        sigma: 值,
        m1: 1,
        m2: 0.5
    });
};

/**
 * 调整细节保护
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 值 - 细节保护值，范围[0,1]，值越大保护越多细节
 */
export const 调整细节保护 = (img, 值) => {
    return img
        .median(Math.round((1 - 值) * 2))
        .sharpen({
            sigma: 1,
            m1: 值,
            m2: 值 * 0.5
        });
};

/**
 * 调整细节
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 值 - 细节调整值，范围[-1,1]，0为原始细节，正值增加细节，负值模糊细节
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 调整细节(图像, 0.4)  // 增强40%细节
 * 调整细节(图像, -0.3) // 模糊30%细节
 */
export const 调整细节 = (img, 值) => {
    if (值 > 0) {
        return img.sharpen({
            sigma: 1,
            m1: 值 * 2,
            m2: 值
        });
    } else {
        return img.blur(-值 * 2);
    }
};

