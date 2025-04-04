import { rgbToHsl, hslToRgb } from './colorSpace';

/**
 * 生成互补色
 * @param {{r: number, g: number, b: number}} rgb - 原始RGB颜色值对象
 * @returns {{r: number, g: number, b: number}} 互补色的RGB颜色值对象
 */
export function getComplementaryColor(rgb) {
    // 转换为HSL
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    
    // 计算互补色的色相 (在色环上旋转180度)
    const complementaryHue = (hsl.h + 0.5) % 1;
    
    // 转换回RGB
    return hslToRgb(complementaryHue, hsl.s, hsl.l);
}

/**
 * 生成分裂互补色方案
 * @param {{r: number, g: number, b: number}} rgb - 原始RGB颜色值对象
 * @param {number} [angle=30] - 分裂角度（默认30度）
 * @returns {Array<{r: number, g: number, b: number}>} 包含三个颜色的数组：原色和两个分裂互补色
 */
export function getSplitComplementaryColors(rgb, angle = 30) {
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const complementaryHue = (hsl.h + 0.5) % 1;
    
    // 计算两个分裂互补色的色相
    const angleInHue = angle / 360;
    const split1 = (complementaryHue + angleInHue) % 1;
    const split2 = (complementaryHue - angleInHue + 1) % 1;
    
    return [
        rgb,
        hslToRgb(split1, hsl.s, hsl.l),
        hslToRgb(split2, hsl.s, hsl.l)
    ];
}

/**
 * 生成三角形配色方案
 * @param {{r: number, g: number, b: number}} rgb - 原始RGB颜色值对象
 * @returns {Array<{r: number, g: number, b: number}>} 包含三个颜色的数组
 */
export function getTriadicColors(rgb) {
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    
    // 在色环上相隔120度
    const triad1 = (hsl.h + 1/3) % 1;
    const triad2 = (hsl.h + 2/3) % 1;
    
    return [
        rgb,
        hslToRgb(triad1, hsl.s, hsl.l),
        hslToRgb(triad2, hsl.s, hsl.l)
    ];
}

/**
 * 生成四角形配色方案
 * @param {{r: number, g: number, b: number}} rgb - 原始RGB颜色值对象
 * @returns {Array<{r: number, g: number, b: number}>} 包含四个颜色的数组
 */
export function getTetradicColors(rgb) {
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    
    // 在色环上相隔90度
    const tetrad1 = (hsl.h + 0.25) % 1;
    const tetrad2 = (hsl.h + 0.5) % 1;
    const tetrad3 = (hsl.h + 0.75) % 1;
    
    return [
        rgb,
        hslToRgb(tetrad1, hsl.s, hsl.l),
        hslToRgb(tetrad2, hsl.s, hsl.l),
        hslToRgb(tetrad3, hsl.s, hsl.l)
    ];
}

/**
 * 生成类比色方案
 * @param {{r: number, g: number, b: number}} rgb - 原始RGB颜色值对象
 * @param {number} [angle=30] - 角度间隔（默认30度）
 * @returns {Array<{r: number, g: number, b: number}>} 包含三个颜色的数组
 */
export function getAnalogousColors(rgb, angle = 30) {
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const angleInHue = angle / 360;
    
    // 计算相邻的两个色相
    const analogous1 = (hsl.h + angleInHue) % 1;
    const analogous2 = (hsl.h - angleInHue + 1) % 1;
    
    return [
        rgb,
        hslToRgb(analogous1, hsl.s, hsl.l),
        hslToRgb(analogous2, hsl.s, hsl.l)
    ];
} 