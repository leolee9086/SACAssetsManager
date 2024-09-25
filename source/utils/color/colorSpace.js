//rgba到hsl的转换
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
//hsl到rgba的转换
export function hslToRgba(hslPixel){
    const [h,s,l]=hslPixel
    const r=0
    const g=0
    const b=0
    const a=1
    return [r,g,b,a]
}
//rgba到hex的转换
export function rgbaToHex(rgbaPixel){
    const [r,g,b,a]=rgbaPixel
    const hex=((r<<16)|(g<<8)|b).toString(16)
    return hex
}


/**
 * rgba颜色转换为lab颜色
 * 公式：https://en.wikipedia.org/wiki/Lab_color_space
 * 
 * @param {*} r 
 * @param {*} g 
 * @param {*} b 
 * @param {*} a 
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