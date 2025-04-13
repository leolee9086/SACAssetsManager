/**
 * 批量全景导出组件 - 颜色工具函数
 */

/**
 * 将十六进制颜色转换为RGBA格式
 * @param {string} hex - 十六进制颜色 (#RRGGBB 或 #RRGGBBAA)
 * @param {number} opacity - 不透明度，范围0-1
 * @returns {string} rgba格式的颜色
 */
export function hexToRgba(hex, opacity = 1) {
  // 去除#号
  hex = hex.replace('#', '');
  
  // 解析R,G,B值
  let r, g, b;
  if (hex.length === 3) {
    // 短格式 #RGB
    r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
    g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
    b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
  } else {
    // 长格式 #RRGGBB
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  
  // 如果传入的hex包含透明度 #RRGGBBAA
  let a = opacity;
  if (hex.length === 8) {
    a = parseInt(hex.substring(6, 8), 16) / 255;
  }
  
  // 返回rgba格式
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * 将RGBA格式颜色转换为十六进制
 * @param {string} rgba - rgba格式的颜色
 * @returns {{hex: string, opacity: number}} 十六进制颜色和不透明度
 */
export function rgbaToHex(rgba) {
  // 解析RGBA格式: rgba(r,g,b,a)
  const parts = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d*\.?\d+))?\)/);
  if (!parts) {
    return { hex: '#000000', opacity: 1 };
  }
  
  const r = parseInt(parts[1]);
  const g = parseInt(parts[2]);
  const b = parseInt(parts[3]);
  const a = parts[4] ? parseFloat(parts[4]) : 1;
  
  // 将RGB转为十六进制
  const toHex = c => {
    const hex = c.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  // 返回十六进制和透明度
  return {
    hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
    opacity: a
  };
} 