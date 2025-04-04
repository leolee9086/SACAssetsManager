import { rgbToCmy,cmyToRgb,rgbToHsl,hslToRgb } from "./convert.js"
export const  简易减色混合 =(color1, color2, ratio = 0.5)=>{
    // 转换为 CMY
    const cmy1 = rgbToCmy(color1)
    const cmy2 = rgbToCmy(color2)

    // 在 CMY 空间中混合（减色混合）
    const mixedCmy = {
        c: cmy1.c + (cmy2.c * ratio),
        m: cmy1.m + (cmy2.m * ratio),
        y: cmy1.y + (cmy2.y * ratio)
    }

    // 确保值不超过1
    mixedCmy.c = Math.min(1, mixedCmy.c)
    mixedCmy.m = Math.min(1, mixedCmy.m)
    mixedCmy.y = Math.min(1, mixedCmy.y)

    // 转换回 RGB
    return cmyToRgb(mixedCmy)
}

export const 基于色相的颜料混色 = (color1, color2, ratio = 0.5)=>{
    // 转换为 HSL 空间进行混合
    const hsl1 = rgbToHsl(color1.r, color1.g, color1.b);
    const hsl2 = rgbToHsl(color2.r, color2.g, color2.b);

    // 智能色相混合
    let h1 = hsl1.h * 360;
    let h2 = hsl2.h * 360;

    // 调整色相差值，确保走最短路径
    if (Math.abs(h1 - h2) > 180) {
        if (h1 > h2) h2 += 360;
        else h1 += 360;
    }
    // 混合色相
    const hue = ((h1 * (1 - ratio) + h2 * ratio) % 360) / 360;
    // 饱和度和亮度使用非线性混合
    const sat = Math.pow(
        Math.pow(hsl1.s, 2) * (1 - ratio) + Math.pow(hsl2.s, 2) * ratio,
        0.5
    );
    // 提高亮度以增加鲜艳度
    const light = Math.min(1,
        Math.pow(hsl1.l * (1 - ratio) + hsl2.l * ratio, 0.8)
    );
    // 转换回 RGB
    const rgb = hslToRgb(hue, sat, light);
    return {
        r: Math.round(rgb.r),
        g: Math.round(rgb.g),
        b: Math.round(rgb.b)
    };
}