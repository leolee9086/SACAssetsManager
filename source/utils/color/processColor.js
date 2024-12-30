import { 计算hex颜色亮度 } from "./hex.js";
// 获取反差色
export function 根据背景色获取黑白前景色(hex格式背景色) {
    const 亮度阈值 = 128; // 0-255之间的阈值
    const 亮度 = 计算hex颜色亮度(hex格式背景色);
    return 亮度 >= 亮度阈值 ? '#000000' : '#ffffff';
}

