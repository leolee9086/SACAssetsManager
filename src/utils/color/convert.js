export function rgba数组转字符串(rgba) {
    return `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3]})`
}
export function rgb数组转字符串(rgb) {
    return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
}

import {hexToRgb, rgbToHex,rgbToHsl,hslToRgb,rgbToRyb,rybToRgb,rgbToCmy,cmyToRgb } from "./colorSpace.js"
export {hexToRgb, rgbToHex,rgbToHsl,hslToRgb,rgbToRyb,rybToRgb,rgbToCmy,cmyToRgb}


// 混合两种颜料颜色
export function mixPigments(color1, color2, ratio = 0.5) {
    const hsl1 = rgbToHsl(color1.r, color1.g, color1.b);
    const hsl2 = rgbToHsl(color2.r, color2.g, color2.b);

    let h1 = hsl1.h * 360;
    let h2 = hsl2.h * 360;

    if (Math.abs(h1 - h2) > 180) {
        if (h1 > h2) h2 += 360;
        else h1 += 360;
    }

    const hue = ((h1 * (1 - ratio) + h2 * ratio) % 360) / 360;
    const sat = Math.pow(
        Math.pow(hsl1.s, 2) * (1 - ratio) + Math.pow(hsl2.s, 2) * ratio,
        0.5
    );
    const light = Math.min(1,
        Math.pow(hsl1.l * (1 - ratio) + hsl2.l * ratio, 0.8)
    );

    const rgb = hslToRgb(hue, sat, light);

    return {
        r: Math.round(rgb.r),
        g: Math.round(rgb.g),
        b: Math.round(rgb.b)
    };
}


