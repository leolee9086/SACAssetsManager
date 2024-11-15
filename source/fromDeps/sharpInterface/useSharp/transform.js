/**
 * 图像变换模块 - 处理图像的几何和空间变换
 */

/**
 * 调整图像大小
 * @param {Sharp} img - Sharp图像对象
 * @param {number[]} size - [宽度, 高度]
 * @param {Object} [选项] - 调整选项
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 调整大小(图像, [800, 600], { fit: 'cover' })
 */
export const 调整大小 = (img, size, 选项 = {}) => {
    return img.resize(size[0], size[1], {
        fit: 选项.fit || 'contain',
        position: 选项.position || 'center',
        background: 选项.background || { r: 255, g: 255, b: 255, alpha: 1 },
        withoutEnlargement: 选项.禁止放大 || false,
        withoutReduction: 选项.禁止缩小 || false,
        kernel: 选项.kernel || 'lanczos3'
    });
};

/**
 * 裁剪图像
 * @param {Sharp} img - Sharp图像对象
 * @param {number[]} 区域 - [左, 上, 宽, 高]
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 裁剪(图像, [100, 100, 500, 500])
 */
export const 裁剪 = (img, 区域) => {
    return img.extract({
        left: 区域[0],
        top: 区域[1],
        width: 区域[2],
        height: 区域[3]
    });
};

/**
 * 智能裁剪
 * @param {Sharp} img - Sharp图像对象
 * @param {number[]} size - [目标宽度, 目标高度]
 * @param {Object} [选项] - 裁剪选项
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 智能裁剪(图像, [800, 600], { 注意力: 'entropy' })
 */
export const 智能裁剪 = (img, size, 选项 = {}) => {
    return img.resize(size[0], size[1], {
        fit: 'cover',
        position: 选项.注意力 || 'attention'
    });
};

/**
 * 旋转图像
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 角度 - 旋转角度
 * @param {Object} [选项] - 旋转选项
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 旋转(图像, 45, { 背景色: '#ffffff' })
 */
export const 旋转 = (img, 角度, 选项 = {}) => {
    return img.rotate(角度, {
        background: 选项.背景色 || { r: 255, g: 255, b: 255, alpha: 1 }
    });
};

/**
 * 翻转图像
 * @param {Sharp} img - Sharp图像对象
 * @param {boolean[]} 方向 - [水平翻转, 垂直翻转]
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 翻转(图像, [true, false]) // 水平翻转
 */
export const 翻转 = (img, 方向) => {
    return img.flip(方向[0]).flop(方向[1]);
};

/**
 * 扩展边缘
 * @param {Sharp} img - Sharp图像对象
 * @param {number[]} 边距 - [上, 右, 下, 左]
 * @param {Object} [选项] - 扩展选项
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 扩展边缘(图像, [10, 10, 10, 10], { 背景色: '#000000' })
 */
export const 扩展边缘 = (img, 边距, 选项 = {}) => {
    return img.extend({
        top: 边距[0],
        right: 边距[1],
        bottom: 边距[2],
        left: 边距[3],
        background: 选项.背景色 || { r: 255, g: 255, b: 255, alpha: 1 }
    });
};

/**
 * 倾斜变换
 * @param {Sharp} img - Sharp图像对象
 * @param {number[]} 角度 - [水平倾斜角度, 垂直倾斜角度]
 * @param {Object} [选项] - 倾斜选项
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 倾斜变换(图像, [15, 0], { 背景色: '#ffffff' })
 */
export const 倾斜变换 = (img, 角度, 选项 = {}) => {
    const radX = (角度[0] * Math.PI) / 180;
    const radY = (角度[1] * Math.PI) / 180;
    
    return img.affine([
        1, Math.tan(radX),
        Math.tan(radY), 1
    ], {
        background: 选项.背景色 || { r: 255, g: 255, b: 255, alpha: 1 }
    });
};

/**
 * 透视变换
 * @param {Sharp} img - Sharp图像对象
 * @param {number[][]} 点位 - 四个角点的新位置 [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 透视变换(图像, [[0,0], [100,0], [100,100], [0,100]])
 */
export const 透视变换 = (img, 点位) => {
    return img.affine([
        [点位[0][0], 点位[0][1]],
        [点位[1][0], 点位[1][1]],
        [点位[2][0], 点位[2][1]],
        [点位[3][0], 点位[3][1]]
    ]);
};

/**
 * 创建缩略图
 * @param {Sharp} img - Sharp图像对象
 * @param {number[]} size - [宽度, 高度]
 * @param {Object} [选项] - 缩略图选项
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 创建缩略图(图像, [200, 200], { 质量: 80 })
 */
export const 创建缩略图 = (img, size, 选项 = {}) => {
    return img
        .resize(size[0], size[1], {
            fit: 'inside',
            withoutEnlargement: true
        })
        .jpeg({
            quality: 选项.质量 || 80,
            progressive: true
        });
};

/**
 * 调整纵横比
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 比例 - 目标纵横比
 * @param {Object} [选项] - 调整选项
 * @returns {Sharp} 处理后的Sharp对象
 * @example
 * 调整纵横比(图像, 16/9, { 填充: true })
 */
export const 调整纵横比 = (img, 比例, 选项 = {}) => {
    return img.metadata()
        .then(metadata => {
            const 当前比例 = metadata.width / metadata.height;
            const 新高度 = metadata.width / 比例;
            
            if (选项.填充) {
                return img.resize(metadata.width, 新高度, {
                    fit: 'contain',
                    background: 选项.背景色 || { r: 255, g: 255, b: 255, alpha: 1 }
                });
            } else {
                return img.resize(metadata.width, 新高度, {
                    fit: 'cover'
                });
            }
        });
};

// 导出所有变换函数
export default {
    调整大小,
    裁剪,
    智能裁剪,
    旋转,
    翻转,
    扩展边缘,
    倾斜变换,
    透视变换,
    创建缩略图,
    调整纵横比
};
