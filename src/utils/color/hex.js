
// 计算颜色的亮度
export function 计算hex颜色亮度(hex) {
    // 移除 # 号
    hex = hex.replace('#', '');
    
    // 将颜色转换为 RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // 使用 YIQ 公式计算亮度
    return (r * 299 + g * 587 + b * 114) / 1000;
}