export function rgba数组转字符串(rgba){
    return `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3]})`
}
export function rgb数组转字符串(rgb){
    return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
}

export  function hexToRgb(hex) {
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
