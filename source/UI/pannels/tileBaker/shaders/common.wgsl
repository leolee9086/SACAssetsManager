@export
struct Params {
    // 基础参数 (16 字节对齐)
    tileSizeX: f32,
    tileSizeY: f32,
    rotation: f32,
    randomOffset: f32,  // 填充到 16 字节

    // 砖缝参数 (16 字节对齐)
    seamWidth: f32,
    seamVariation: f32,
    seamProfile: f32,
    seamNoiseFrequency: f32,

    // 外观控制参数 (16 字节对齐)
    contrast: f32,
    edgeSharpness: f32,
    heightRangeMin: f32,
    heightRangeMax: f32,

    // 磨损和砂浆参数 (16 字节对齐)
    wearAmount: f32,
    wearDetail: f32,
    mortarVariation: f32,
    mortarFrequency: f32,

    // 裂纹参数 (16 字节对齐)
    crackWidth: f32,
    crackDepth: f32,
    crackRandomness: f32,
    crackFrequency: f32,

    // 角点参数 (16 字节对齐)
    cornerDamage: f32,
    cornerNoiseScale: f32,
    cornerFalloff: f32,
    _pad: f32,  // 添加填充以确保 16 字节对齐
};

@export 
fn perlinNoise(p: vec2<f32>) -> f32 {
    // 使用多个八度的噪声叠加
    var value = 0.0;
    var amplitude = 0.5;
    var frequency = 1.0;
    let persistence = 0.5;
    let numOctaves = 4;
    
    // 添加偏移以避免在原点处的特殊情况
    var p2 = p + vec2<f32>(0.71, 0.113);
    
    for(var i = 0; i < numOctaves; i++) {
        value += amplitude * gradientNoise(p2 * frequency);
        frequency *= 2.0;
        amplitude *= persistence;
    }
    
    // 确保结果在 0-1 范围内
    return clamp(value + 0.5, 0.0, 1.0);
}

@export 
fn random2(p: vec2<f32>) -> vec2<f32> {
    return normalize(vec2<f32>(
        sin(dot(p, vec2<f32>(127.1, 311.7))),
        sin(dot(p, vec2<f32>(269.5, 183.3)))
    ));
}

fn hash(p: vec2<f32>) -> f32 {
    var p2 = fract(p * vec2<f32>(123.34, 456.21));
    p2 += dot(p2, p2 + 19.19);
    return fract(p2.x * p2.y);
}

fn gradientNoise(p: vec2<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    
    // 四个角的随机值
    let a = hash(i);
    let b = hash(i + vec2<f32>(1.0, 0.0));
    let c = hash(i + vec2<f32>(0.0, 1.0));
    let d = hash(i + vec2<f32>(1.0, 1.0));
    
    // 平滑插值
    let u = f * f * (3.0 - 2.0 * f);
    
    return mix(
        mix(a, b, u.x),
        mix(c, d, u.x),
        u.y
    );
}