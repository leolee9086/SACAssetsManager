import {RGBA2LAB} from "../../../src/toolBox/feature/forColors/forColorSpace/toLab.js"
import {hslToRgba,hue2rgb,hexToRgb} from "../../../src/toolBox/feature/forColors/forColorSpace/toRGBA.js"
export {RGBA2LAB,hslToRgba,hue2rgb,hexToRgb}
/**
 * 将RGBA颜色值转换为HSL颜色空间
 * @param {number[]} ragaPixel - RGBA颜色值数组 [r, g, b, a]，每个分量范围0-255
 * @returns {number[]} HSL颜色值数组 [h, s, l]
 * h: 色相(0-360度)
 * s: 饱和度(0-1)
 * l: 亮度(0-1)
 */
export function rgbaToHsl(ragaPixel){
    const [r,g,b,a]=ragaPixel
    const max=Math.max(r,g,b)
    const min=Math.min(r,g,b)
    const l=(max+min)/2
    const d=max-min
    const s=d/(1-Math.abs(2*l-1))
    const h=0
    return [h,s,l]
}





/**
 * 将RGBA颜色值转换为十六进制颜色代码
 * @param {number[]} rgbaPixel - RGBA颜色值数组 [r, g, b, a]，每个分量范围0-255
 * @returns {string} 十六进制颜色代码（不包含#前缀）
 */
export function rgbaToHex(rgbaPixel) {
    const [r, g, b, a] = rgbaPixel
    // 确保每个颜色分量都是两位数的十六进制
    const toHex = n => n.toString(16).padStart(2, '0')
    // 组合RGB值
    const hex = `${toHex(r)}${toHex(g)}${toHex(b)}`
    // 如果透明度不是1或255，则添加透明度值
    if (a !== undefined && a !== 1 && a !== 255) {
        const alpha = a <= 1 ? Math.round(a * 255) : a
        return hex + toHex(alpha)
    }
    return hex
}
/**
 * 将 RGBA 数组转换为十六进制颜色字符串（带#前缀）
 * @param {number[]} colorArray - RGBA颜色值数组 [r, g, b, a]，每个分量范围0-255
 * @returns {string} 十六进制颜色代码（包含#前缀）
 */
export const rgbaArrayToHexString = (colorArray) => {
    return `#${colorArray.map(c => c.toString(16).padStart(2, '0')).join('')}`;
}


/**
 * 将RGB对象转换为十六进制颜色代码
 * @param {{r: number, g: number, b: number}} rgb - RGB颜色值对象，每个分量范围0-255
 * @returns {string} 十六进制颜色代码（包含#前缀）
 */
export function rgbToHex(rgb) {
    const toHex = (n) => {
        const hex = Math.round(n).toString(16)
        return hex.length === 1 ? '0' + hex : hex
    }
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
}

/**
 * 将RGB颜色值转换为HSL颜色空间
 * @param {number} r - 红色分量，范围0-255
 * @param {number} g - 绿色分量，范围0-255
 * @param {number} b - 蓝色分量，范围0-255
 * @returns {{h: number, s: number, l: number}} HSL颜色值对象
 * h: 色相(0-1)
 * s: 饱和度(0-1)
 * l: 亮度(0-1)
 */
export function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h, s, l };
}
/**
 * 将HSL颜色值转换为RGB颜色空间
 * @param {number} h - 色相，范围0-1
 * @param {number} s - 饱和度，范围0-1
 * @param {number} l - 亮度，范围0-1
 * @returns {{r: number, g: number, b: number}} RGB颜色值对象，每个分量范围0-255
 */
export function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

/**
 * 将RGB颜色值转换为RYB颜色空间
 * @param {number} r - 红色分量，范围0-255
 * @param {number} g - 绿色分量，范围0-255
 * @param {number} b - 蓝色分量，范围0-255
 * @returns {{r: number, y: number, b: number}} RYB颜色值对象
 */
export function rgbToRyb(r, g, b) {
    // 移除RGB中的白色
    let w = Math.min(r, g, b)
    r -= w
    g -= w
    b -= w

    let mg = Math.max(r, g, b)

    // 获取黄色
    let y = Math.min(r, g)
    r -= y
    g -= y

    // 如果蓝色和绿色都存在，将绿色的一半转换为黄色
    if (b && g) {
        b /= 2
        g /= 2
    }

    // 重新分配绿色
    y += g
    b += g

    // 归一化到最大值
    let my = Math.max(r, y, b)
    if (my) {
        let n = mg / my
        r *= n
        y *= n
        b *= n
    }

    return { r, y, b }
}

/**
 * 将RYB颜色值转换为RGB颜色空间
 * @param {number} r - 红色分量
 * @param {number} y - 黄色分量
 * @param {number} b - 蓝色分量
 * @returns {{r: number, g: number, b: number}} RGB颜色值对象，每个分量范围0-255
 */
export function rybToRgb(r, y, b) {
    // 获取绿色
    let g = y

    // 如果黄色和蓝色都存在，产生绿色
    if (y && b) {
        g = b
        b *= 2
    }

    // 如果红色和黄色都存在，产生橙色
    if (r && y) {
        r = Math.max(r, y)
    }

    return {
        r: Math.min(255, Math.round(r)),
        g: Math.min(255, Math.round(g)),
        b: Math.min(255, Math.round(b))
    }
}

/**
 * 将RGB颜色值转换为CMY颜色空间
 * @param {{r: number, g: number, b: number}} rgb - RGB颜色值对象，每个分量范围0-255
 * @returns {{c: number, m: number, y: number}} CMY颜色值对象，每个分量范围0-1
 */
export function rgbToCmy(rgb) {
    return {
        c: 1 - (rgb.r / 255),
        m: 1 - (rgb.g / 255),
        y: 1 - (rgb.b / 255)
    }
}

/**
 * 将CMY颜色值转换为RGB颜色空间
 * @param {{c: number, m: number, y: number}} cmy - CMY颜色值对象，每个分量范围0-1
 * @returns {{r: number, g: number, b: number}} RGB颜色值对象，每个分量范围0-255
 */
export function cmyToRgb(cmy) {
    return {
        r: Math.round((1 - cmy.c) * 255),
        g: Math.round((1 - cmy.m) * 255),
        b: Math.round((1 - cmy.y) * 255)
    }
}

/**
 * RGB转CMYK
 * @param {{r: number, g: number, b: number}} rgb - RGB颜色值对象
 * @returns {{c: number, m: number, y: number, k: number}} CMYK颜色值对象 (0-1)
 */
export function rgbToCmyk(rgb) {
    const c = 1 - (rgb.r / 255);
    const m = 1 - (rgb.g / 255);
    const y = 1 - (rgb.b / 255);
    const k = Math.min(c, m, y);
    
    return {
        c: (c - k) / (1 - k) || 0,
        m: (m - k) / (1 - k) || 0,
        y: (y - k) / (1 - k) || 0,
        k: k
    };
}

/**
 * RGB转HSV
 * @param {{r: number, g: number, b: number}} rgb - RGB颜色值对象
 * @returns {{h: number, s: number, v: number}} HSV颜色值对象
 * h: 色相 (0-360)
 * s: 饱和度 (0-1)
 * v: 明度 (0-1)
 */
export function rgbToHsv(rgb) {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    
    let h;
    const s = max === 0 ? 0 : d / max;
    const v = max;

    if (max === min) {
        h = 0;
    } else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h *= 60;
    }
    
    return { h, s, v };
}

/**
 * RGB转XYZ
 * @param {{r: number, g: number, b: number}} rgb - RGB颜色值对象
 * @returns {{x: number, y: number, z: number}} XYZ颜色值对象
 */
export function rgbToXyz(rgb) {
    let r = rgb.r / 255;
    let g = rgb.g / 255;
    let b = rgb.b / 255;

    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    return {
        x: r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
        y: r * 0.2126729 + g * 0.7151522 + b * 0.0721750,
        z: r * 0.0193339 + g * 0.1191920 + b * 0.9503041
    };
}

/**
 * 将sRGB颜色值转换为线性空间
 * @param {number} value - sRGB颜色值（0-1）
 * @returns {number} 线性空间颜色值
 */
export function sRGBToLinear(value) {
    return value <= 0.04045 
        ? value / 12.92 
        : Math.pow((value + 0.055) / 1.055, 2.4);
}

/**
 * 将线性空间颜色值转换为sRGB
 * @param {number} value - 线性空间颜色值
 * @returns {number} sRGB颜色值（0-1）
 */
export function linearToSRGB(value) {
    return value <= 0.0031308 
        ? value * 12.92 
        : 1.055 * Math.pow(value, 1/2.4) - 0.055;
}

/**
 * 人眼感知亮度计算工具
 */
export const PerceivedBrightness = {
    /**
     * Rec. 709 标准亮度计算
     * @param {number} r - 红色分量
     * @param {number} g - 绿色分量
     * @param {number} b - 蓝色分量
     * @returns {number} 亮度值
     */
    rec709Luminance(r, g, b) {
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    },

    /**
     * Rec. 2020 标准亮度计算
     * @param {number} r - 红色分量
     * @param {number} g - 绿色分量
     * @param {number} b - 蓝色分量
     * @returns {number} 亮度值
     */
    rec2020Luminance(r, g, b) {
        return 0.2627 * r + 0.6780 * g + 0.0593 * b;
    },

    /**
     * CIE 标准亮度计算
     * @param {number} r - 红色分量
     * @param {number} g - 绿色分量
     * @param {number} b - 蓝色分量
     * @returns {number} 亮度值
     */
    cieLuminance(r, g, b) {
        return 0.299 * r + 0.587 * g + 0.114 * b;
    },

    /**
     * HSP 亮度计算
     * @param {number} r - 红色分量
     * @param {number} g - 绿色分量
     * @param {number} b - 蓝色分量
     * @returns {number} 亮度值
     */
    hspLuminance(r, g, b) {
        return Math.sqrt(
            0.299 * (r * r) + 
            0.587 * (g * g) + 
            0.114 * (b * b)
        );
    },

    /**
     * 标准化亮度值
     * @param {number} value - 亮度值
     * @returns {number} 标准化后的亮度值
     */
    normalize(value) {
        return Math.min(1, Math.max(0, value));
    }
};