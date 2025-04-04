/**
 * LAB颜色空间转换工具集
 * 
 * 当前文件组织方式：
 * 1. 采用完全独立的函数实现，每个函数都包含完整的转换逻辑
 * 2. 不依赖内部其他函数，避免隐式耦合
 * 3. 所有函数都遵循相同的返回格式：{ L, a, b }
 * 
 * 包含的颜色空间转换类型：
 * - 标准色彩空间：RGB/HEX/HSL/HSV/CMYK
 * - 视频色彩空间：YUV/YCbCr
 * - 专业色彩空间：AdobeRGB/ProPhotoRGB
 * - 其他格式：灰度/LCH/HWB
 * 
 * 优化计划：
 * 1. 性能优化：
 *    - 预计算常用常量值
 *    - 添加SIMD优化版本
 *    - 实现Web Worker并行计算
 * 
 * 2. 功能扩展：
 *    - 添加颜色差异计算(ΔE)
 *    - 支持更多专业色彩空间
 *    - 添加颜色范围校验
 * 
 * 3. 工程优化：
 *    - 按色彩空间类型拆分模块
 *    - 添加单元测试覆盖率
 *    - 生成API文档
 * 
 * 4. 算法改进：
 *    - 支持不同白点参数
 *    - 添加色域映射功能
 *    - 支持不同RGB工作空间
 * 
 * 注意：所有转换算法基于CIE 1931标准，所有转换结果仅供参考。
 */
/**
 * 注意：所有转换算法基于CIE 1931标准(2°标准观察者)，使用D65标准光源作为白点参考。
 * 实际应用时需注意：
 * 1. 显示器/打印机等设备的实际色域可能与理论计算存在差异
 * 2. 人眼感知受环境光照条件影响(建议在5000K色温环境下评估)
 * 3. 高色域空间(如ProPhoto RGB)包含不可见光谱，转换时可能产生理论值超出可见范围
 * 4. 视频色彩空间(YUV/YCbCr)转换基于BT.709标准色度坐标
 * 
 * 专业应用建议：
 * - 关键色彩决策前进行硬件校准
 * - 使用ICC色彩特性文件补偿设备差异
 * - 考虑使用CIEDE2000公式计算色差
 */

/**
 * 将RGBA颜色值数字转换为LAB颜色空间
 * @param {number} r - 红色分量，范围0-255
 * @param {number} g - 绿色分量，范围0-255
 * @param {number} b - 蓝色分量，范围0-255
 * @param {number} [a=1] - 透明度，范围0-1
 * @returns {{L: number, a: number, b: number}} LAB颜色值对象
 * L: 亮度，范围0-100
 * a: 红绿对立色，负值偏绿，正值偏红
 * b: 蓝黄对立色，负值偏蓝，正值偏黄
 */
export function RGBA2LAB(r, g, b, a=1) {
    const X = 0.412453 * r + 0.357580 * g + 0.180423 * b;
    const Y = 0.212671 * r + 0.715160 * g + 0.072169 * b;
    const Z = 0.019334 * r + 0.119193 * g + 0.950227 * b;
    const xn = 0.95047, yn = 1.0, zn = 1.08883;
    const fx = X / xn;
    const fy = Y / yn;
    const fz = Z / zn;
    const fx3 = fx * fx * fx;
    const fy3 = fy * fy * fy;
    const fz3 = fz * fz * fz;
    const L = 116 * fy3 - 16;
    const _a = 500 * (fx3 - fy3);
    const _b = 200 * (fy3 - fz3);
    return { L, a: _a, b: _b };
}

/**
 * 直接优化版HSV到LAB转换
 * @param {number} h - 色相，范围0-360
 * @param {number} s - 饱和度，范围0-1
 * @param {number} v - 明度，范围0-1
 * @returns {{L: number, a: number, b: number}} LAB颜色值对象
 */
export function HSV2LAB(h, s, v) {
    // 计算HSV到XYZ的直接转换
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    
    let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    
    r = (r + m) * 255;
    g = (g + m) * 255;
    b = (b + m) * 255;
    
    // 直接计算LAB
    const X = 0.412453 * r + 0.357580 * g + 0.180423 * b;
    const Y = 0.212671 * r + 0.715160 * g + 0.072169 * b;
    const Z = 0.019334 * r + 0.119193 * g + 0.950227 * b;
    
    const xn = 0.95047, yn = 1.0, zn = 1.08883;
    const fx = X / xn;
    const fy = Y / yn;
    const fz = Z / zn;
    
    const fx3 = fx > 0.008856 ? Math.pow(fx, 1/3) : (7.787 * fx + 16/116);
    const fy3 = fy > 0.008856 ? Math.pow(fy, 1/3) : (7.787 * fy + 16/116);
    const fz3 = fz > 0.008856 ? Math.pow(fz, 1/3) : (7.787 * fz + 16/116);
    
    return {
        L: 116 * fy3 - 16,
        a: 500 * (fx3 - fy3),
        b: 200 * (fy3 - fz3)
    };
}

/**
 * 直接优化版HSL到LAB转换
 * @param {number} h - 色相，范围0-360
 * @param {number} s - 饱和度，范围0-1
 * @param {number} l - 亮度，范围0-1
 * @returns {{L: number, a: number, b: number}} LAB颜色值对象
 */
export function HSL2LAB(h, s, l) {
    // 计算HSL到XYZ的直接转换
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    
    let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    
    r = (r + m) * 255;
    g = (g + m) * 255;
    b = (b + m) * 255;
    
    // 直接计算LAB
    const X = 0.412453 * r + 0.357580 * g + 0.180423 * b;
    const Y = 0.212671 * r + 0.715160 * g + 0.072169 * b;
    const Z = 0.019334 * r + 0.119193 * g + 0.950227 * b;
    
    const xn = 0.95047, yn = 1.0, zn = 1.08883;
    const fx = X / xn;
    const fy = Y / yn;
    const fz = Z / zn;
    
    const fx3 = fx > 0.008856 ? Math.pow(fx, 1/3) : (7.787 * fx + 16/116);
    const fy3 = fy > 0.008856 ? Math.pow(fy, 1/3) : (7.787 * fy + 16/116);
    const fz3 = fz > 0.008856 ? Math.pow(fz, 1/3) : (7.787 * fz + 16/116);
    
    return {
        L: 116 * fy3 - 16,
        a: 500 * (fx3 - fy3),
        b: 200 * (fy3 - fz3)
    };
}

/**
 * 直接优化版CMYK到LAB转换
 * @param {number} c - 青色，范围0-1
 * @param {number} m - 品红色，范围0-1
 * @param {number} y - 黄色，范围0-1
 * @param {number} k - 黑色，范围0-1
 * @returns {{L: number, a: number, b: number}} LAB颜色值对象
 */
export function CMYK2LAB(c, m, y, k) {
    // 直接计算CMYK到XYZ的转换
    const r = 255 * (1 - c) * (1 - k);
    const g = 255 * (1 - m) * (1 - k);
    const b = 255 * (1 - y) * (1 - k);
    
    // 直接计算LAB
    const X = 0.412453 * r + 0.357580 * g + 0.180423 * b;
    const Y = 0.212671 * r + 0.715160 * g + 0.072169 * b;
    const Z = 0.019334 * r + 0.119193 * g + 0.950227 * b;
    
    const xn = 0.95047, yn = 1.0, zn = 1.08883;
    const fx = X / xn;
    const fy = Y / yn;
    const fz = Z / zn;
    
    const fx3 = fx > 0.008856 ? Math.pow(fx, 1/3) : (7.787 * fx + 16/116);
    const fy3 = fy > 0.008856 ? Math.pow(fy, 1/3) : (7.787 * fy + 16/116);
    const fz3 = fz > 0.008856 ? Math.pow(fz, 1/3) : (7.787 * fz + 16/116);
    
    return {
        L: 116 * fy3 - 16,
        a: 500 * (fx3 - fy3),
        b: 200 * (fy3 - fz3)
    };
}

/**
 * 将十六进制颜色字符串转换为LAB颜色空间
 * @param {string} hex - 十六进制颜色字符串，如"#RRGGBB"或"#RGB"
 * @returns {{L: number, a: number, b: number}} LAB颜色值对象
 */
export function HEX2LAB(hex) {
    // 去除#号并解析为RGB
    hex = hex.replace(/^#/, '');
    let r, g, b;
    
    if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
    } else {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
    }
    
    // 直接计算LAB而不调用RGBA2LAB
    const X = 0.412453 * r + 0.357580 * g + 0.180423 * b;
    const Y = 0.212671 * r + 0.715160 * g + 0.072169 * b;
    const Z = 0.019334 * r + 0.119193 * g + 0.950227 * b;
    
    const xn = 0.95047, yn = 1.0, zn = 1.08883;
    const fx = X / xn;
    const fy = Y / yn;
    const fz = Z / zn;
    
    const fx3 = fx > 0.008856 ? Math.pow(fx, 1/3) : (7.787 * fx + 16/116);
    const fy3 = fy > 0.008856 ? Math.pow(fy, 1/3) : (7.787 * fy + 16/116);
    const fz3 = fz > 0.008856 ? Math.pow(fz, 1/3) : (7.787 * fz + 16/116);
    
    return {
        L: 116 * fy3 - 16,
        a: 500 * (fx3 - fy3),
        b: 200 * (fy3 - fz3)
    };
}


/**
 * 将XYZ颜色值转换为LAB颜色空间
 * @param {number} x - X分量
 * @param {number} y - Y分量
 * @param {number} z - Z分量
 * @returns {{L: number, a: number, b: number}} LAB颜色值对象
 */
export function XYZ2LAB(x, y, z) {
    const xn = 0.95047, yn = 1.0, zn = 1.08883;
    const fx = x / xn;
    const fy = y / yn;
    const fz = z / zn;
    
    const fx3 = fx > 0.008856 ? Math.pow(fx, 1/3) : (7.787 * fx + 16/116);
    const fy3 = fy > 0.008856 ? Math.pow(fy, 1/3) : (7.787 * fy + 16/116);
    const fz3 = fz > 0.008856 ? Math.pow(fz, 1/3) : (7.787 * fz + 16/116);
    
    const L = 116 * fy3 - 16;
    const a = 500 * (fx3 - fy3);
    const b = 200 * (fy3 - fz3);
    
    return { L, a, b };
}

/**
 * 将YCbCr颜色值转换为LAB颜色空间
 * @param {number} y - 亮度分量，范围0-1
 * @param {number} cb - 蓝色色度分量，范围-0.5-0.5
 * @param {number} cr - 红色色度分量，范围-0.5-0.5
 * @returns {{L: number, a: number, b: number}} LAB颜色值对象
 */
export function YCbCr2LAB(y, cb, cr) {
    // 转换为RGB
    const r = y + 1.402 * cr;
    const g = y - 0.344136 * cb - 0.714136 * cr;
    const b = y + 1.772 * cb;
    
    // 直接计算LAB而不调用RGBA2LAB
    const r255 = Math.round(r * 255);
    const g255 = Math.round(g * 255);
    const b255 = Math.round(b * 255);
    
    const X = 0.412453 * r255 + 0.357580 * g255 + 0.180423 * b255;
    const Y = 0.212671 * r255 + 0.715160 * g255 + 0.072169 * b255;
    const Z = 0.019334 * r255 + 0.119193 * g255 + 0.950227 * b255;
    
    const xn = 0.95047, yn = 1.0, zn = 1.08883;
    const fx = X / xn;
    const fy = Y / yn;
    const fz = Z / zn;
    
    const fx3 = fx > 0.008856 ? Math.pow(fx, 1/3) : (7.787 * fx + 16/116);
    const fy3 = fy > 0.008856 ? Math.pow(fy, 1/3) : (7.787 * fy + 16/116);
    const fz3 = fz > 0.008856 ? Math.pow(fz, 1/3) : (7.787 * fz + 16/116);
    
    return {
        L: 116 * fy3 - 16,
        a: 500 * (fx3 - fy3),
        b: 200 * (fy3 - fz3)
    };
}

/**
 * 将灰度值转换为LAB颜色空间
 * @param {number} gray - 灰度值，范围0-255
 * @returns {{L: number, a: number, b: number}} LAB颜色值对象
 */
export function Gray2LAB(gray) {
    // 直接计算LAB而不调用RGBA2LAB
    const X = 0.412453 * gray + 0.357580 * gray + 0.180423 * gray;
    const Y = 0.212671 * gray + 0.715160 * gray + 0.072169 * gray;
    const Z = 0.019334 * gray + 0.119193 * gray + 0.950227 * gray;
    
    const xn = 0.95047, yn = 1.0, zn = 1.08883;
    const fx = X / xn;
    const fy = Y / yn;
    const fz = Z / zn;
    
    const fx3 = fx > 0.008856 ? Math.pow(fx, 1/3) : (7.787 * fx + 16/116);
    const fy3 = fy > 0.008856 ? Math.pow(fy, 1/3) : (7.787 * fy + 16/116);
    const fz3 = fz > 0.008856 ? Math.pow(fz, 1/3) : (7.787 * fz + 16/116);
    
    return {
        L: 116 * fy3 - 16,
        a: 500 * (fx3 - fy3),
        b: 200 * (fy3 - fz3)
    };
}

/**
 * 将LCH颜色值转换为LAB颜色空间
 * @param {number} L - 亮度，范围0-100
 * @param {number} C - 色度
 * @param {number} H - 色相，范围0-360
 * @returns {{L: number, a: number, b: number}} LAB颜色值对象
 */
export function LCH2LAB(L, C, H) {
    const H_rad = H * Math.PI / 180;
    return {
        L: L,
        a: C * Math.cos(H_rad),
        b: C * Math.sin(H_rad)
    };
}

/**
 * 将YUV颜色值转换为LAB颜色空间
 * @param {number} y - 亮度分量，范围0-1
 * @param {number} u - 色度分量U，范围-0.5-0.5
 * @param {number} v - 色度分量V，范围-0.5-0.5
 * @returns {{L: number, a: number, b: number}} LAB颜色值对象
 */
export function YUV2LAB(y, u, v) {
    // 转换为RGB
    const r = y + 1.13983 * v;
    const g = y - 0.39465 * u - 0.58060 * v;
    const b = y + 2.03211 * u;
    
    // 直接计算LAB而不调用RGBA2LAB
    const r255 = Math.round(r * 255);
    const g255 = Math.round(g * 255);
    const b255 = Math.round(b * 255);
    
    const X = 0.412453 * r255 + 0.357580 * g255 + 0.180423 * b255;
    const Y = 0.212671 * r255 + 0.715160 * g255 + 0.072169 * b255;
    const Z = 0.019334 * r255 + 0.119193 * g255 + 0.950227 * b255;
    
    const xn = 0.95047, yn = 1.0, zn = 1.08883;
    const fx = X / xn;
    const fy = Y / yn;
    const fz = Z / zn;
    
    const fx3 = fx > 0.008856 ? Math.pow(fx, 1/3) : (7.787 * fx + 16/116);
    const fy3 = fy > 0.008856 ? Math.pow(fy, 1/3) : (7.787 * fy + 16/116);
    const fz3 = fz > 0.008856 ? Math.pow(fz, 1/3) : (7.787 * fz + 16/116);
    
    return {
        L: 116 * fy3 - 16,
        a: 500 * (fx3 - fy3),
        b: 200 * (fy3 - fz3)
    };
}

/**
 * 将CIE xyY颜色值转换为LAB颜色空间
 * @param {number} x - x色度坐标
 * @param {number} y - y色度坐标
 * @param {number} Y - 亮度，范围0-1
 * @returns {{L: number, a: number, b: number}} LAB颜色值对象
 */
export function xyY2LAB(x, y, Y) {
    // 转换为XYZ
    const X = (Y / y) * x;
    const Z = (Y / y) * (1 - x - y);
    
    // 调用现有的XYZ2LAB函数
    return XYZ2LAB(X, Y, Z);
}

/**
 * 将Adobe RGB(1998)颜色值转换为LAB颜色空间
 * @param {number} r - 红色分量，范围0-255
 * @param {number} g - 绿色分量，范围0-255
 * @param {number} b - 蓝色分量，范围0-255
 * @returns {{L: number, a: number, b: number}} LAB颜色值对象
 */
export function AdobeRGB2LAB(r, g, b) {
    // Adobe RGB到XYZ的转换矩阵
    const X = 0.5767309 * r + 0.1855540 * g + 0.1881852 * b;
    const Y = 0.2973769 * r + 0.6273491 * g + 0.0752741 * b;
    const Z = 0.0270343 * r + 0.0706872 * g + 0.9911085 * b;
    
    // 直接计算LAB而不调用XYZ2LAB
    const xn = 0.95047, yn = 1.0, zn = 1.08883;
    const fx = X / xn;
    const fy = Y / yn;
    const fz = Z / zn;
    
    const fx3 = fx > 0.008856 ? Math.pow(fx, 1/3) : (7.787 * fx + 16/116);
    const fy3 = fy > 0.008856 ? Math.pow(fy, 1/3) : (7.787 * fy + 16/116);
    const fz3 = fz > 0.008856 ? Math.pow(fz, 1/3) : (7.787 * fz + 16/116);
    
    return {
        L: 116 * fy3 - 16,
        a: 500 * (fx3 - fy3),
        b: 200 * (fy3 - fz3)
    };
}

/**
 * 将ProPhoto RGB颜色值转换为LAB颜色空间
 * @param {number} r - 红色分量，范围0-255
 * @param {number} g - 绿色分量，范围0-255
 * @param {number} b - 蓝色分量，范围0-255
 * @returns {{L: number, a: number, b: number}} LAB颜色值对象
 */
export function ProPhotoRGB2LAB(r, g, b) {
    // ProPhoto RGB到XYZ的转换矩阵
    const X = 0.7976749 * r + 0.1351917 * g + 0.0313534 * b;
    const Y = 0.2880402 * r + 0.7118741 * g + 0.0000857 * b;
    const Z = 0.0000000 * r + 0.0000000 * g + 0.8252100 * b;
    
    // 调用现有的XYZ2LAB函数
    return XYZ2LAB(X, Y, Z);
}

/**
 * 将Hunter Lab颜色值转换为CIE LAB颜色空间
 * @param {number} L - Hunter L值
 * @param {number} a - Hunter a值
 * @param {number} b - Hunter b值
 * @returns {{L: number, a: number, b: number}} CIE LAB颜色值对象
 */
export function HunterLab2LAB(L, a, b) {
    // Hunter Lab到CIE LAB的近似转换
    return {
        L: L * 1.0,
        a: a * 1.18,
        b: b * 0.85
    };
}

/**
 * 将sRGB颜色值转换为LAB颜色空间
 * @param {number} r - 红色分量，范围0-255
 * @param {number} g - 绿色分量，范围0-255
 * @param {number} b - 蓝色分量，范围0-255
 * @returns {{L: number, a: number, b: number}} LAB颜色值对象
 */
export function sRGB2LAB(r, g, b) {
    // sRGB到XYZ的转换矩阵
    const X = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
    const Y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
    const Z = 0.0193339 * r + 0.1191920 * g + 0.9503041 * b;
    
    return XYZ2LAB(X, Y, Z);
}

/**
 * 将Display P3颜色值转换为LAB颜色空间
 * @param {number} r - 红色分量，范围0-255
 * @param {number} g - 绿色分量，范围0-255
 * @param {number} b - 蓝色分量，范围0-255
 * @returns {{L: number, a: number, b: number}} LAB颜色值对象
 */
export function DisplayP32LAB(r, g, b) {
    // Display P3到XYZ的转换矩阵
    const X = 0.4865709 * r + 0.2656677 * g + 0.1982173 * b;
    const Y = 0.2289746 * r + 0.6917385 * g + 0.0792869 * b;
    const Z = 0.0000000 * r + 0.0451134 * g + 1.0439444 * b;
    
    return XYZ2LAB(X, Y, Z);
}

/**
 * 将Rec.2020颜色值转换为LAB颜色空间
 * @param {number} r - 红色分量，范围0-255
 * @param {number} g - 绿色分量，范围0-255
 * @param {number} b - 蓝色分量，范围0-255
 * @returns {{L: number, a: number, b: number}} LAB颜色值对象
 */
export function Rec20202LAB(r, g, b) {
    // Rec.2020到XYZ的转换矩阵
    const X = 0.636958 * r + 0.144617 * g + 0.168881 * b;
    const Y = 0.262700 * r + 0.677998 * g + 0.059302 * b;
    const Z = 0.000000 * r + 0.028073 * g + 1.060985 * b;
    
    return XYZ2LAB(X, Y, Z);
}

/**
 * 将HWB颜色值转换为LAB颜色空间
 * @param {number} h - 色相，范围0-360
 * @param {number} w - 白度，范围0-1
 * @param {number} b - 黑度，范围0-1
 * @returns {{L: number, a: number, b: number}} LAB颜色值对象
 */
export function HWB2LAB(h, w, b) {
    // 转换为HSV
    const v = 1 - b;
    const s = v === 0 ? 0 : 1 - (w / v);
    
    // 调用现有的HSV2LAB函数
    return HSV2LAB(h, s, v);
}

