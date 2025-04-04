@group(0) @binding(0) var output: texture_storage_2d<rgba8unorm, write>;

struct Params {
scale: f32,
seed: f32,
octaves: i32,
persistence: f32,
lacunarity: f32,
frequency: f32,
amplitude: f32,
offset_x: f32,
offset_y: f32,
contrast: f32,
brightness: f32,
detail_scale: f32,
master_scale: f32,
detail_weight: f32
}
@group(0) @binding(1) var<uniform> params: Params;

// 优化哈希函数，减少计算复杂度
fn hash2(p: vec2f) -> f32 {
    let x = p.x * 127.1 + p.y * 311.7 + params.seed;
    return fract(sin(x) * 43758.5453123);
}

// 简化的2D噪声实现
fn simpleNoise2D(p: vec2f) -> f32 {
    let pi = floor(p);
    let pf = fract(p);

    let a = hash2(pi);
    let b = hash2(pi + vec2f(1.0, 0.0));
    let c = hash2(pi + vec2f(0.0, 1.0));
    let d = hash2(pi + vec2f(1.0, 1.0));

    let u = pf * pf * (3.0 - 2.0 * pf);

    return mix(
        mix(a, b, u.x),
        mix(c, d, u.x),
        u.y
    );
}

// 修改 fbm 函数以支持多层次细节
fn fbm(p: vec2f) -> f32 {
// 主要纹理
    var freq = params.frequency;
    var amp = params.amplitude;
    var sum = 0.0;
    var maxSum = 0.0;

    let offsetP = p + vec2f(params.offset_x, params.offset_y);
    let baseP = offsetP * params.master_scale;

    let maxOctaves = min(params.octaves, 4);

    for (var i = 0; i < maxOctaves; i++) {
        sum += amp * simpleNoise2D(baseP * freq);
        maxSum += amp;
        freq *= params.lacunarity;
        amp *= params.persistence;
    }

    var mainNoise = sum / maxSum;

// 细节纹理
    freq = params.frequency * 2.0;
    amp = params.amplitude * 0.5;
    sum = 0.0;
    maxSum = 0.0;

    let detailP = offsetP * params.detail_scale;

    for (var i = 0; i < maxOctaves; i++) {
        sum += amp * simpleNoise2D(detailP * freq);
        maxSum += amp;
        freq *= params.lacunarity;
        amp *= params.persistence;
    }

    let detailNoise = sum / maxSum;

// 混合主要纹理和细节
    var result = mix(mainNoise, detailNoise, params.detail_weight);

// 应用对比度和亮度
    result = (result - 0.5) * params.contrast + 0.5 + params.brightness;
    return clamp(result, 0.0, 1.0);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
    let dims = textureDimensions(output);
    if global_id.x >= dims.x || global_id.y >= dims.y {
        return;
    }

    let pos = vec2f(f32(global_id.x), f32(global_id.y));
    let uv = pos / vec2f(f32(dims.x), f32(dims.y));

    let noise = fbm(uv * params.scale);
    textureStore(output, global_id.xy, vec4f(noise, noise, noise, 1.0));
}
