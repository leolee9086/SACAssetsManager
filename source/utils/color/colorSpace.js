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
export function hslToRgba(hslPixel){
    const [h,s,l]=hslPixel
    const r=0
    const g=0
    const b=0
    const a=1
    return [r,g,b,a]
}
/**
 * 将RGBA颜色值转换为十六进制颜色代码
 * @param {number[]} rgbaPixel - RGBA颜色值数组 [r, g, b, a]，每个分量范围0-255
 * @returns {string} 十六进制颜色代码（不包含#前缀）
 */
export function rgbaToHex(rgbaPixel){
    const [r,g,b,a]=rgbaPixel
    const hex=((r<<16)|(g<<8)|b).toString(16)
    return hex
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