/**
 * 调整亮度
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 值 - 亮度调整值，范围[-1,1]，0为原始亮度，正值增加亮度，负值降低亮度
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 调整亮度(图像, 0.2)  // 增加20%亮度
 * 调整亮度(图像, -0.3) // 降低30%亮度
 */
export const 调整亮度 = (img, 值) => {
    return img.modulate({
        brightness: 1 + 值
    });
};

/**
 * 调整对比度
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 值 - 对比度调整值，范围[-1,1]，0为原始对比度，正值增加对比度，负值降低对比度
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 调整对比度(图像, 0.5)  // 增加50%对比度
 * 调整对比度(图像, -0.2) // 降低20%对比度
 */
export const 调整对比度 = (img, 值) => {
    return img.linear(1 + 值, -(值 * 128));
};
/**
 * 调整阴影
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 值 - 阴影调整值，范围[-1,1]，0为原始阴影，正值增加阴影细节，负值减少阴影细节
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 调整阴影(图像, 0.3)  // 增加阴影细节
 * 调整阴影(图像, -0.2) // 减少阴影细节
 */
export const 调整阴影 = (img, 值) => {
    return img.linear(
        值 > 0 ? 1 : 1 + 值,
        值 > 0 ? 0 : 值 * 50
    );
};

/**
 * 调整高光
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 值 - 高光调整值，范围[-1,1]，0为原始高光，正值增加高光细节，负值减少高光细节
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 调整高光(图像, 0.4)  // 增加高光细节
 * 调整高光(图像, -0.3) // 减少高光细节
 */
export const 调整高光 = (img, 值) => {
    return img.linear(
        值 > 0 ? 1 + 值 : 1,
        值 > 0 ? 值 * 50 : 0
    );
};
/**
 * 图像调整模块 - 扩展版
 */

/**
 * 调整曝光度
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 值 - 曝光度调整值，范围[-1,1]，0为原始曝光，正值增加曝光，负值减少曝光
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 调整曝光度(图像, 0.3)  // 增加曝光
 */
export const 调整曝光度 = (img, 值) => {
    return img.linear(1 + 值, 值 * 30);
};

/**
 * 调整局部对比度
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 值 - 局部对比度调整值，范围[-1,1]，0为原始对比度
 */
export const 调整局部对比度 = (img, 值) => {
    return img.clahe({
        width: 50,
        height: 50,
        maxSlope: 1 + 值
    });
};
/**
 * 调整动态范围
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 值 - 动态范围调整值，范围[-1,1]，0为原始范围，正值扩大范围，负值压缩范围
 */
export const 调整动态范围 = (img, 值) => {
    if (值 > 0) {
        return img.linear(1 + 值, -值 * 50);
    } else {
        return img.linear(1 / (1 - 值), 值 * 20);
    }
};

/**
 * 调整黑场
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 值 - 黑场调整值，范围[-1,1]，0为原始黑场，正值提升黑场，负值降低黑场
 */
export const 调整黑场 = (img, 值) => {
    return img.linear(1, 值 * 50);
};

/**
 * 调整白场
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 值 - 白场调整值，范围[-1,1]，0为原始白场，正值提升白场，负值降低白场
 */
export const 调整白场 = (img, 值) => {
    return img.linear(1 + 值 * 0.5, 0);

}
    /**
 * 调整中间调
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 值 - 中间调调整值，范围[-1,1]，0为原始中间调，正值提亮中间调，负值压暗中间调
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 调整中间调(图像, 0.2)  // 提亮中间调
 * 调整中间调(图像, -0.2) // 压暗中间调
 */
export const 调整中间调 = (img, 值) => {
    return img.linear(1, 值 * 30);
}


