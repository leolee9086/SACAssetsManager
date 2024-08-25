export function CIE76(color1,color2){
    // 将颜色值转换为整数
    let r1 = color1[0]
    let g1 = color1[1]
    let b1 = color1[2]
  
    let r2 = color2[0]
    let g2 = color2[1]
    let b2 = color2[2]
  
    // 计算CIE76色差公式
    let deltaR = r1 - r2;
    let deltaG = g1 - g2;
    let deltaB = b1 - b2;
    let deltaE = Math.sqrt(deltaR * deltaR + deltaG * deltaG + deltaB * deltaB);
  
    //返回色差值
    return deltaE 
}

//颜色数组距离计算
//使用CIEDE2000算法计算颜色之间的距离
// 将RGBA颜色转换为LAB颜色
import { RGBA2LAB } from "./colorSpace.js";
const cache = new Map();
export function CIEDE2000RGBA(pix1, pix2) {
    //转换为整数
    let 时间 =Math.random()

    pix1 = pix1.map(item=>Math.floor(item))
    pix2 = pix2.map(item=>Math.floor(item))
    const key1 = pix1.join(',');
    const key2 = pix2.join(',');
    const cacheKey = key1 < key2 ? key1 + '|' + key2 : key2 + '|' + key1;
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }
    const lab1 = RGBA2LAB(pix1[0], pix1[1], pix1[2], pix1[3] || 0);
    const lab2 = RGBA2LAB(pix2[0], pix2[1], pix2[2], pix2[3] || 0);
    const result = CIEDE2000(lab1, lab2);
    cache.set(cacheKey, result);
    return result;
}/**
 * 
 * @param {*} lab1 
 * @param {*} lab2 
 */
export function CIEDE2000(Lab_1, Lab_2) {
    const C_25_7 = 6103515625; // 25**7

    //const [L1, a1, b1] = Lab_1;
    //const [L2, a2, b2] = Lab_2;
    const L1 = Lab_1.L
    const a1 = Lab_1.a
    const b1 = Lab_1.b
    const L2 = Lab_2.L
    const a2 = Lab_2.a
    const b2 = Lab_2.b
    const C1 = Math.sqrt(a1 ** 2 + b1 ** 2);
    const C2 = Math.sqrt(a2 ** 2 + b2 ** 2);
    let C_ave = (C1 + C2) / 2;
    const G = 0.5 * (1 - Math.sqrt(C_ave ** 7 / (C_ave ** 7 + C_25_7)));

    const L1_ = L1, L2_ = L2;
    const a1_ = (1 + G) * a1, a2_ = (1 + G) * a2;
    const b1_ = b1, b2_ = b2;

    const C1_ = Math.sqrt(a1_ ** 2 + b1_ ** 2);
    const C2_ = Math.sqrt(a2_ ** 2 + b2_ ** 2);

    let h1_, h2_;
    if (b1_ === 0 && a1_ === 0) h1_ = 0;
    else if (a1_ >= 0) h1_ = Math.atan2(b1_, a1_);
    else h1_ = Math.atan2(b1_, a1_) + 2 * Math.PI;

    if (b2_ === 0 && a2_ === 0) h2_ = 0;
    else if (a2_ >= 0) h2_ = Math.atan2(b2_, a2_);
    else h2_ = Math.atan2(b2_, a2_) + 2 * Math.PI;

    const dL_ = L2_ - L1_;
    const dC_ = C2_ - C1_;
    let dh_ = h2_ - h1_;
    if (C1_ * C2_ === 0) dh_ = 0;
    else if (dh_ > Math.PI) dh_ -= 2 * Math.PI;
    else if (dh_ < -Math.PI) dh_ += 2 * Math.PI;
    const dH_ = 2 * Math.sqrt(C1_ * C2_) * Math.sin(dh_ / 2);

    const L_ave = (L1_ + L2_) / 2;
     C_ave = (C1_ + C2_) / 2;

    const _dh = Math.abs(h1_ - h2_);
    const _sh = h1_ + h2_;
    const C1C2 = C1_ * C2_;

    let h_ave;
    if (_dh <= Math.PI && C1C2 !== 0) h_ave = (h1_ + h2_) / 2;
    else if (_dh > Math.PI && _sh < 2 * Math.PI && C1C2 !== 0) h_ave = (h1_ + h2_) / 2 + Math.PI;
    else if (_dh > Math.PI && _sh >= 2 * Math.PI && C1C2 !== 0) h_ave = (h1_ + h2_) / 2 - Math.PI;
    else h_ave = h1_ + h2_;

    const T = 1 - 0.17 * Math.cos(h_ave - Math.PI / 6) + 0.24 * Math.cos(2 * h_ave) + 0.32 * Math.cos(3 * h_ave + Math.PI / 30) - 0.2 * Math.cos(4 * h_ave - 63 * Math.PI / 180);

    let h_ave_deg = h_ave * 180 / Math.PI;
    if (h_ave_deg < 0) h_ave_deg += 360;
    else if (h_ave_deg > 360) h_ave_deg -= 360;
    const dTheta = 30 * Math.exp(-(((h_ave_deg - 275) / 25) ** 2));

    const R_C = 2 * Math.sqrt(C_ave ** 7 / (C_ave ** 7 + C_25_7));
    const S_C = 1 + 0.045 * C_ave;
    const S_H = 1 + 0.015 * C_ave * T;

    const Lm50s = (L_ave - 50) ** 2;
    const S_L = 1 + 0.015 * Lm50s / Math.sqrt(20 + Lm50s);
    const R_T = -Math.sin(dTheta * Math.PI / 90) * R_C;

    const k_L = 1, k_C = 1, k_H = 1;

    const f_L = dL_ / k_L / S_L;
    const f_C = dC_ / k_C / S_C;
    const f_H = dH_ / k_H / S_H;

    const dE_00 = Math.sqrt(f_L ** 2 + f_C ** 2 + f_H ** 2 + R_T * f_C * f_H);
    return dE_00;
}
export  function $CIEDE2000(lab1, lab2) {
    const kL = 1, kC = 1, kH = 1;

    const L1 = lab1.L, a1 = lab1.a, b1 = lab1.b;
    const L2 = lab2.L, a2 = lab2.a, b2 = lab2.b;

    const C1 = Math.sqrt(a1 * a1 + b1 * b1);
    const C2 = Math.sqrt(a2 * a2 + b2 * b2);
    const Cb = (C1 + C2) / 2;

    const G = 0.5 * (1 - Math.sqrt(Math.pow(Cb, 7) / (Math.pow(Cb, 7) + Math.pow(25, 7))));
    const a1p = (1 + G) * a1;
    const a2p = (1 + G) * a2;

    const C1p = Math.sqrt(a1p * a1p + b1 * b1);
    const C2p = Math.sqrt(a2p * a2p + b2 * b2);

    const h1p = Math.atan2(b1, a1p) * (180 / Math.PI);
    const h2p = Math.atan2(b2, a2p) * (180 / Math.PI);

    const dLp = L2 - L1;
    const dCp = C2p - C1p;
    
    let dhp = h2p - h1p;
    if (Math.abs(dhp) > 180) {
        dhp = dhp > 0 ? dhp - 360 : dhp + 360;
    }
    
    const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * Math.PI / 360);

    const Lp = (L1 + L2) / 2;
    const Cp = (C1p + C2p) / 2;

    let hp = (h1p + h2p) / 2;
    if (Math.abs(h1p - h2p) > 180) {
        hp = hp > 180 ? hp - 180 : hp + 180;
    }

    const T = 1 - 0.17 * Math.cos((hp - 30) * Math.PI / 180)
              + 0.24 * Math.cos(2 * hp * Math.PI / 180)
              + 0.32 * Math.cos((3 * hp + 6) * Math.PI / 180)
              - 0.20 * Math.cos((4 * hp - 63) * Math.PI / 180);

    const SL = 1 + (0.015 * Math.pow(Lp - 50, 2)) / Math.sqrt(20 + Math.pow(Lp - 50, 2));
    const SC = 1 + 0.045 * Cp;
    const SH = 1 + 0.015 * Cp * T;

    const RT = -2 * Math.sqrt(Math.pow(Cp, 7) / (Math.pow(Cp, 7) + Math.pow(25, 7)))
               * Math.sin(60 * Math.exp(-Math.pow((hp - 275) / 25, 2)) * Math.PI / 180);

    const deltaE = Math.sqrt(
        Math.pow(dLp / (kL * SL), 2) +
        Math.pow(dCp / (kC * SC), 2) +
        Math.pow(dHp / (kH * SH), 2) +
        RT * (dCp / (kC * SC)) * (dHp / (kH * SH))
    );

    return deltaE;
}