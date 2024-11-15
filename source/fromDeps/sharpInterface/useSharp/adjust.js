/**
 * 图像调整模块 - 处理基础参数调整
 */




/**
 * 调整伽马
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 值 - 伽马值，范围[0.1,3]，1为原始伽马值，小于1变亮，大于1变暗
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 调整伽马(图像, 0.6)  // 增加亮度
 * 调整伽马(图像, 1.4)  // 增加暗度
 */
export const 调整伽马 = (img, 值) => {
    return img.gamma(值);
};

/**
 * 调整透明度
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 值 - 透明度值，范围[0,1]，0为完全透明，1为完全不透明
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 调整透明度(图像, 0.5) // 设置50%透明度
 */
export const 调整透明度 = (img, 值) => {
    return img.ensureAlpha(值);
};

