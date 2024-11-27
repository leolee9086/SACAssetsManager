export function rgba数组转字符串(rgba) {
    return `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3]})`
}
export function rgb数组转字符串(rgb) {
    return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
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