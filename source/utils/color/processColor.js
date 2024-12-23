// ... existing code ...

// 计算颜色的亮度
function 计算hex颜色亮度(hex) {
    // 移除 # 号
    hex = hex.replace('#', '');
    
    // 将颜色转换为 RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // 使用 YIQ 公式计算亮度
    return (r * 299 + g * 587 + b * 114) / 1000;
}

// 获取反差色
export function 根据背景色获取黑白前景色(hex格式背景色) {
    const 亮度阈值 = 128; // 0-255之间的阈值
    const 亮度 = 计算hex颜色亮度(hex格式背景色);
    
    return 亮度 >= 亮度阈值 ? '#000000' : '#ffffff';
}

