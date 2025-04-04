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

/**
 * 辅助函数：将色相转换为RGB分量
 * @param {number} p - 色相计算中的p值
 * @param {number} q - 色相计算中的q值
 * @param {number} t - 色相值（0-1范围内）
 * @returns {number} RGB分量值（0-1范围内）
 */
export const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
}


/**
 * 将十六进制颜色代码转换为RGB对象
 * @param {string} hex - 十六进制颜色代码（可以带#也可以不带）
 * @returns {{r: number, g: number, b: number}} RGB颜色值对象，每个分量范围0-255
 */
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