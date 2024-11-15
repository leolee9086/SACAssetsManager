/**
 * Sharp图像处理工具集
 * @module useSharp
 */

// 导入子模块
import * as transform from './transform';
import * as color from './color';

// 基础图像处理函数
/**
 * 调整图像格式
 * @param {Sharp} img - Sharp图像对象
 * @param {string} 格式 - 目标格式 ('jpeg', 'png', 'webp' 等)
 * @param {Object} [选项] - 格式选项
 * @returns {Sharp} 处理后的Sharp对象
 */
export const 转换格式 = (img, 格式, 选项 = {}) => {
    return img.toFormat(格式, 选项);
};

/**
 * 调整图像质量
 * @param {Sharp} img - Sharp图像对象
 * @param {number} 质量 - 压缩质量(0-100)
 * @returns {Sharp} 处理后的Sharp对象
 */
export const 调整质量 = (img, 质量) => {
    return img.jpeg({ quality: 质量 })
              .png({ quality: 质量 })
              .webp({ quality: 质量 });
};

/**
 * 应用滤镜效果
 * @param {Sharp} img - Sharp图像对象
 * @param {string} 滤镜 - 滤镜名称
 * @param {Object} [选项] - 滤镜选项
 * @returns {Sharp} 处理后的Sharp对象
 */
export const 应用滤镜 = (img, 滤镜, 选项 = {}) => {
    const 滤镜映射 = {
        '黑白': () => img.grayscale(),
        '复古': () => img.modulate({ saturation: 0.5, brightness: 1.1 }).sepia(),
        '锐化': () => img.sharpen(选项.强度 || 1),
        '模糊': () => img.blur(选项.半径 || 3),
        '反相': () => img.negate(),
        '降噪': () => img.median(选项.半径 || 3)
    };

    const 处理函数 = 滤镜映射[滤镜];
    return 处理函数 ? 处理函数() : img;
};

/**
 * 图像元数据处理
 * @param {Sharp} img - Sharp图像对象
 * @param {Object} 选项 - 元数据选项
 * @returns {Sharp} 处理后的Sharp对象
 */
export const 处理元数据 = (img, 选项 = {}) => {
    return img
        .withMetadata({
            orientation: 选项.方向,
            density: 选项.密度,
            ...选项
        });
};

// 导出变换模块函数
export const {
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
} = transform;

// 导出颜色模块函数
export const {
    调整色调,
    应用颜色矩阵,
    调整通道,
    色彩平衡,
    色彩分离,
    色调分离,
    色彩替换,
    渐变映射,
    调整色温,
    色彩溢出,
    双色调,
    色彩阈值,
    色彩渗透,
    色彩分层,
    色彩扭曲
} = color;

// 导出命名空间
export const 变换 = transform;
export const 颜色 = color;

// 工具函数
/**
 * 创建处理管道
 * @param {...Function} 处理函数 - 图像处理函数列表
 * @returns {Function} 组合后的处理函数
 */
export const 创建管道 = (...处理函数) => {
    return img => 处理函数.reduce((处理后图像, 当前函数) => 当前函数(处理后图像), img);
};

/**
 * 批量处理
 * @param {Sharp[]} 图像列表 - Sharp图像对象数组
 * @param {Function} 处理函数 - 处理函数
 * @returns {Promise<Sharp[]>} 处理后的图像数组
 */
export const 批量处理 = async (图像列表, 处理函数) => {
    return Promise.all(图像列表.map(处理函数));
};

// 默认导出
export default {
    // 基础功能
    转换格式,
    调整质量,
    应用滤镜,
    处理元数据,
    
    // 变换功能
    ...transform,
    
    // 颜色功能
    ...color,
    
    // 命名空间
    变换,
    颜色,
    
    // 工具函数
    创建管道,
    批量处理
};

