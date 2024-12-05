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
 * 将HSL颜色值转换为RGBA颜色空间
 * @param {number[]} hslPixel - HSL颜色值数组 [h, s, l]
 * h: 色相(0-360度)
 * s: 饱和度(0-1)
 * l: 亮度(0-1)
 * @returns {number[]} RGBA颜色值数组 [r, g, b, a]，每个分量范围0-255
 */
export function hslToRgba(hslPixel) {
    const [h, s, l] = hslPixel
    
    // 如果饱和度为0，则为灰度颜色
    if (s === 0) {
        const rgb = Math.round(l * 255)
        return [rgb, rgb, rgb, 1]
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    const h1 = h / 360 // 将色相角度转换为0-1范围
    // 计算RGB分量
    const r = Math.round(hue2rgb(p, q, h1 + 1/3) * 255)
    const g = Math.round(hue2rgb(p, q, h1) * 255)
    const b = Math.round(hue2rgb(p, q, h1 - 1/3) * 255)
    return [r, g, b, 1]
}

// 辅助函数：计算色相对应的RGB值
export const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
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
export const rgbaArrayToHexString = (colorArray) => {
    return `#${colorArray.map(c => c.toString(16).padStart(2, '0')).join('')}`;
}
/**
 * 将RGBA颜色值转换为LAB颜色空间
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

export function hexToRgb(hex) {
    // 确保颜色值以#开头
    const validHex = hex.startsWith('#') ? hex : `#${hex}`;

    // 支持 3 位和 6 位十六进制
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const processedHex = validHex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(processedHex);
    if (!result) {
        console.warn('无效的颜色值:', hex);
        return { r: 0, g: 0, b: 0 }; // 返回默认黑色而不是 null
    }
    return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    };
}
// 新增：RGB转十六进制的辅助函数
export function rgbToHex(rgb) {
    const toHex = (n) => {
        const hex = Math.round(n).toString(16)
        return hex.length === 1 ? '0' + hex : hex
    }
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
}


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
// HSL 转 RGB 颜色空间转换
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


// RGB 转 RYB
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

// RYB 转 RGB
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

  // 将 RGB 转换为 CMY (青色、品红、黄色)
export function  rgbToCmy(rgb) {
    return {
        c: 1 - (rgb.r / 255),
        m: 1 - (rgb.g / 255),
        y: 1 - (rgb.b / 255)
    }
}

// 将 CMY 转换回 RGB 
export function cmyToRgb(cmy) {
    return {
        r: Math.round((1 - cmy.c) * 255),
        g: Math.round((1 - cmy.m) * 255),
        b: Math.round((1 - cmy.y) * 255)
    }
}