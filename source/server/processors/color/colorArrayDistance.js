//颜色数组距离计算
//使用CIEDE2000算法计算颜色之间的距离
// 将RGBA颜色转换为LAB颜色
import { RGBA2LAB } from "./colorSpace.js";
export function CIEDE2000RGBA(pix1, pix2) {
    const lab1 = RGBA2LAB(pix1[0], pix1[1], pix1[2], pix1[3]);
    const lab2 = RGBA2LAB(pix2[0], pix2[1], pix2[2], pix2[3]);
    return CIEDE2000(lab1, lab2);
}
/**
 * 
 * @param {*} lab1 
 * @param {*} lab2 
 */
export function CIEDE2000(lab1, lab2) {
    const kL = 1, kC = 1, kH = 1; // 权重因子，可以根据需要调整

    const L1 = lab1.L, a1 = lab1.a, b1 = lab1.b;
    const L2 = lab2.L, a2 = lab2.a, b2 = lab2.b;

    let C1 = Math.sqrt(a1 * a1 + b1 * b1);
    let C2 = Math.sqrt(a2 * a2 + b2 * b2);
    let h1 = Math.atan2(b1, a1) * (180 / Math.PI);
    let h2 = Math.atan2(b2, a2) * (180 / Math.PI);

    // 色相差的处理，确保在0-360度范围内
    let dH = Math.abs(h1 - h2);
    let DH = 2 * Math.sqrt(C1 * C2) * Math.sin(dH / 2);

    // 明度、彩度、色相的加权因子
    let SL = 1 + (0.015 * Math.pow((L1 + L2) / 2 - 50, 2)) / Math.sqrt(20 + Math.pow((L1 + L2) / 2 - 50, 2));
    let SC = 1 + 0.045 * (C1 + C2) / 2;
    let SH = 1 + 0.015 * (C1 + C2) / 2 * (1 - Math.cos(Math.PI * (h1 - h2) / 180));

    // 色相角平均值和旋转角度T的计算
    let hMean = (h1 + h2 + 360 * (h1 + h2 < 360)) / 2;
    let hDelta = (h2 - h1 + 360) % 360;
    let T = 1 - 0.17 * Math.cos(Math.PI * (hMean - 30) / 180) +
              0.24 * Math.cos(2 * Math.PI * hMean / 180) +
              0.32 * Math.cos(3 * Math.PI * (hMean + 6) / 180) -
              0.2 * Math.cos(4 * Math.PI * (hMean - 63) / 180);

    // 计算最终的色差
    let RT = -Math.sin(2 * Math.PI * 30 * Math.exp(-Math.pow((hMean - 275) / 25, 2))) * 2 * Math.sqrt((C1 + C2) / 2) / (C1 + C2 + 25);
    let deltaE = Math.sqrt(
        Math.pow((L1 - L2) / (SL * kL), 2) +
        Math.pow((C1 - C2) / (SC * kC), 2) +
        Math.pow(DH / (SH * kH), 2) +
        RT * (C1 - C2) / (SC * kC) * DH / (SH * kH)
    );

    return deltaE;
}

