@export 
fn sRGBToLinear(srgb: vec3f) -> vec3f {
    let cutoff = vec3f(0.04045);
    let slope = vec3f(1.0 / 12.92);
    let a = vec3f(0.055);
    let gamma = vec3f(2.4);
    let scale = vec3f(1.0 / 1.055);
    return select(
        pow((srgb + a) * scale, gamma),
        srgb * slope,
        srgb <= cutoff
    );
}
@export
fn linearToSRGB(linear: vec3f) -> vec3f {
    let cutoff = vec3f(0.0031308);
    let slope = vec3f(12.92);
    let a = vec3f(0.055);
    let gamma = vec3f(1.0 / 2.4);
    return select(
        (1.0 + a) * pow(linear, gamma) - a,
        linear * slope,
        linear <= cutoff
    );
}

@export 
fn RGBToKM(color: vec3f, S: vec3f) -> KMCoefficients {
    // 对于接近白色的颜色，降低散射系数以保持亮度
    let whiteness = (color.r + color.g + color.b) / 3.0;
    let adjustedS = mix(S, S * 0.5, pow(whiteness, 2.0));
    let R = clamp(color, vec3f(EPSILON), vec3f(1.0 - EPSILON));
    // 修改 K/S 比率计算，使其在接近白色时更准确
    let K_over_S = (pow(1.0 - R, vec3f(2.0))) / (2.0 * R);
    let K = K_over_S * adjustedS;
    return KMCoefficients(K, adjustedS);
}

@export                 // 改进的 KM 系数到 RGB 转换
fn KMToRGB(km: KMCoefficients) -> vec3f {
    let K_over_S = km.K / km.S;
    // 标准 K-M 方程的反函数
    // R = 1 + K/S - sqrt((K/S)² + 2K/S)
    let a = 1.0 + K_over_S;
    let root = sqrt(K_over_S * K_over_S + 2.0 * K_over_S);
    let R = a - root;
    return clamp(R, vec3f(0.0), vec3f(1.0));
}

@export
fn PremultiplyAlpha(color: vec4f) -> vec4f {
 // 计算在白色背景下的RGB值，并保留alpha
    let premultipliedRGB = color.rgb * color.a + vec3f(1.0) * (1.0 - color.a);
    return vec4f(premultipliedRGB, color.a);
}