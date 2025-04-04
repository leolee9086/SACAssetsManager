import {反向柯里化}from '../../../functions/currying.js'
/**
 * 图像变换模块 - 处理图像的几何和空间变换
 */

/**
 * 创建一个预设参数的图像缩放函数
 * @param {Object} 缩放选项 - 预设的缩放参数，如 fit、position、background 等
 * @returns {Function} 返回一个已预设参数的图像缩放函数
 * @example
 * const 缩放预设 = 预设缩放选项({ fit: 'cover', background: '#ffffff' })
 * const 处理后图像 = 缩放预设(原始图像, [800, 600])
 */
export const 预设缩放选项 = (缩放选项)=>{
    return 反向柯里化(调整大小)(缩放选项)
}

/**
 * 创建一个预设尺寸的图像缩放函数
 * @param {number[]} 目标尺寸 - 预设的目标尺寸 [宽度, 高度]
 * @returns {Function} 返回一个已预设尺寸的图像缩放函数
 * @example
 * const 固定尺寸 = 预设缩放尺寸([800, 600])
 * const 处理后图像 = 固定尺寸(原始图像, { fit: 'cover' })
 */
export const 预设缩放尺寸 = (目标尺寸) => {
    return (img, 选项 = {}) => 调整大小(img, 目标尺寸, 选项)
}

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
    // 中英文选项映射
    const optionsMap = {
        '适应': 'fit',
        '位置': 'position',
        '背景': 'background',
        '禁止放大': 'withoutEnlargement',
        '禁止缩小': 'withoutReduction',
        '算法': 'kernel'
    };

    // 处理选项，将中文键转换为英文键
    const processedOptions = Object.keys(选项).reduce((acc, key) => {
        const mappedKey = optionsMap[key] || key;
        acc[mappedKey] = 选项[key];
        return acc;
    }, {});

    return img.resize(size[0], size[1], {
        fit: processedOptions.fit || 'contain',
        position: processedOptions.position || 'center',
        background: processedOptions.background || { r: 255, g: 255, b: 255, alpha: 1 },
        withoutEnlargement: processedOptions.withoutEnlargement || false,
        withoutReduction: processedOptions.withoutReduction || false,
        kernel: processedOptions.kernel || 'lanczos3'
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

/**
 * 创建图像变换预设
 * @param {Object} 预设参数 - 可以包含任意组合的预设参数
 * @param {number[]} [预设参数.尺寸] - 预设的目标尺寸 [宽度, 高度]
 * @param {Object} [预设参数.选项] - 预设的缩放选项
 * @returns {Function} 返回一个预设函数，接受剩余参数
 * @example
 * // 预设全部参数
 * const 固定预设 = 创建变换预设({ 尺寸: [800, 600], 选项: { fit: 'cover' } })
 * const 结果1 = 固定预设(图像)
 * 
 * // 只预设尺寸
 * const 固定尺寸 = 创建变换预设({ 尺寸: [800, 600] })
 * const 结果2 = 固定尺寸(图像, { fit: 'cover' })
 * 
 * // 只预设选项
 * const 固定选项 = 创建变换预设({ 选项: { fit: 'cover' } })
 * const 结果3 = 固定选项(图像, [800, 600])
 */
export const 创建变换预设 = ({ 尺寸, 选项 } = {}) => {
    return (img, 动态尺寸, 动态选项) => {
        const 最终尺寸 = 动态尺寸 || 尺寸
        const 最终选项 = { ...选项, ...动态选项 }
        
        if (!最终尺寸) {
            throw new Error('必须提供尺寸参数，可以在创建预设时提供或在调用时提供')
        }
        
        return 调整大小(img, 最终尺寸, 最终选项)
    }
}

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
