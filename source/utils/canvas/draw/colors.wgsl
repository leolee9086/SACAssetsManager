                // 色彩空间转换函数
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
