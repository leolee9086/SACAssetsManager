
/**
 * 
 * @param {*} lab1 
 * @param {*} lab2 
 */
export function CIEDE2000(Lab_1, Lab_2) {
    const C_25_7 = 6103515625; // 25**7
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
