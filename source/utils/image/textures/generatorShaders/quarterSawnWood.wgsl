@group(0) @binding(0) var output: texture_storage_2d<rgba8unorm, write>;

struct Params {
    time: f32,
    scale: f32,
    color1: vec3f,
    _pad1: f32,
    color2: vec3f,
    _pad2: f32,
    color3: vec3f,
    _pad3: f32,
    grain_scale: f32,
    ring_scale: f32,
    contrast: f32,
    brightness: f32,
    ray_intensity: f32,    // 新增：木射线强度
    ray_frequency: f32,     // 新增：木射线频率
        _pad4: f32,

}
@group(0) @binding(1) var<uniform> params: Params;

// 改进的哈希函数
fn hash31(p3: vec3f) -> f32 {
    var p = fract(p3 * 0.1031);
    p += dot(p, p.yzx + 333.3456);
    return fract((p.x + p.y) * p.z);
}

// 改进的2D哈希
fn hash21(p: vec2f) -> f32 {
    return hash31(vec3f(p.x, p.y, 0.0));
}

// 改进的3D噪声 - 更适合直线纹理
fn noise3D(p: vec3f) -> f32 {
    let s = vec3f(7.0, 157.0, 113.0);
    let ip = floor(p);
    var fp = fract(p);
    
    // 使用更锐利的插值函数
    fp = fp * fp * (3.0 - 2.0 * fp);
    
    var result = 0.0;
    for (var i = 0; i < 2; i++) {
        for (var j = 0; j < 2; j++) {
            for (var k = 0; k < 2; k++) {
                let offset = vec3f(f32(i), f32(j), f32(k));
                let h = ip + offset;
                let n = fract(sin(dot(h, s)) * 43758.5453);
                let weight = fp - offset;
                result += n * (1.0 - abs(weight.x)) * (1.0 - abs(weight.y)) * (1.0 - abs(weight.z));
            }
        }
    }
    return result;
}

// 线性FBM - 更适合平行纹理
fn linearFbm(p: vec3f, octaves: i32) -> f32 {
    var value = 0.0;
    var amplitude = 0.5;
    var frequency = 1.0;
    
    for (var i = 0; i < octaves; i++) {
        value += amplitude * noise3D(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    
    return value;
}

// 木射线图案
fn rayPattern(p: vec2f) -> f32 {
    let ray = sin(p.x * params.ray_frequency) * 0.5 + 0.5;
    return ray * params.ray_intensity;
}

// 改进的方向性条纹函数
fn stripePattern(p: vec2f) -> f32 {
    // 强化垂直方向的基础噪声
    let base_noise = linearFbm(vec3f(p.x * 0.5, p.y * 6.0, 0.0), 3);
    let detail_noise = linearFbm(vec3f(p.x * 1.0, p.y * 12.0, 0.0), 2);
    
    // 增强方向性扰动
    let distortion = linearFbm(vec3f(p.x * 2.0, p.y * 0.3, 0.0), 2) * 0.15;
    
    // 创建强方向性的条纹
    let stripe_mask = smoothstep(0.35, 0.65, base_noise + distortion);
    let detail_mask = smoothstep(0.3, 0.7, detail_noise);
    
    // 添加方向性增强层
    let directional = linearFbm(vec3f(p.x * 0.2, p.y * 8.0, 0.0), 2);
    
    return mix(
        mix(stripe_mask, detail_mask, 0.3),
        directional,
        0.4
    ) * 0.2;
}

// 改进的纤维细节函数，添加更小尺度的细节
fn fiberPattern(p: vec2f) -> f32 {
    // 增加频率，减少平滑度
    let micro_fibers = linearFbm(vec3f(p.x * 100.0, p.y * 200.0, 0.0), 2);  // 增加频率，减少octaves
    let ultra_fine_fibers = linearFbm(vec3f(p.x * 70.0, p.y * 150.0, 0.0), 2);
    
    // 增加细节频率
    let fine_fibers = linearFbm(vec3f(p.x * 40.0, p.y * 100.0, 0.0), 2);
    let medium_fibers = linearFbm(vec3f(p.x * 20.0, p.y * 50.0, 0.0), 2);
    
    // 减少方向性平滑
    let direction1 = linearFbm(vec3f(p.x * 1.5, p.y * 0.4, 0.0), 1);
    let direction2 = linearFbm(vec3f(p.x * 0.8, p.y * 0.3, 0.0), 1);
    
    // 创建方向性的细节
    let stretched_fine = linearFbm(vec3f(p.x * 3.0, p.y * 40.0 + direction1, 0.0), 2);
    let stretched_micro = linearFbm(vec3f(p.x * 5.0, p.y * 60.0 + direction2, 0.0), 2);
    
    // 强方向性基础层
    let directional = linearFbm(vec3f(p.x * 0.5, p.y * 30.0, 0.0), 2);
    
    // 分层混合
    let micro_mix = mix(micro_fibers, ultra_fine_fibers, 0.5) * 0.3;
    let fine_mix = mix(fine_fibers, medium_fibers, 0.4) * 0.4;
    let stretched_mix = mix(stretched_fine, stretched_micro, 0.5) * 0.5;
    
    // 最终混合
    return mix(
        mix(micro_mix, fine_mix, 0.6),
        mix(stretched_mix, directional, 0.5),
        0.5
    ) * 0.18;
}

// 改进的木针纹理，增加更细微的细节
fn needlePattern(p: vec2f) -> f32 {
    // 增加频率，减少平滑度
    let micro_needles = linearFbm(vec3f(p.x * 12.0, p.y * 120.0, 0.0), 2);
    let ultra_fine_needles = linearFbm(vec3f(p.x * 8.0, p.y * 100.0, 0.0), 2);
    
    // 增加基础纹理的频率
    let vertical_noise = linearFbm(vec3f(p.x * 6.0, p.y * 50.0, 0.0), 2);
    let fine_noise = linearFbm(vec3f(p.x * 8.0, p.y * 60.0, 0.0), 2);
    
    // 方向性变化
    let direction = linearFbm(vec3f(p.x * 0.8, p.y * 0.2, 0.0), 2);
    let angled_noise = linearFbm(vec3f(
        p.x * 8.0 + direction,
        p.y * 45.0,
        0.0
    ), 2);
    
    // 强方向性层
    let directional = linearFbm(vec3f(p.x * 0.3, p.y * 35.0, 0.0), 2);
    
    // 分层混合
    let micro_mix = mix(micro_needles, ultra_fine_needles, 0.5) * 0.3;
    let base_mix = mix(vertical_noise, fine_noise, 0.4) * 0.4;
    let directional_mix = mix(angled_noise, directional, 0.5) * 0.5;
    
    return mix(
        mix(micro_mix, base_mix, 0.6),
        directional_mix,
        0.5
    ) * 0.15;
}

// 平顺木纹生成函数
fn quarterSawnPattern(p: vec3f) -> vec3f {
    // 增加基础纹理的频率
    let base = linearFbm(vec3f(p.x * 0.8, p.y * 2.5, p.z), 3) * 0.5;
    
    // 增加中等尺度纹理的频率
    let medium = linearFbm(vec3f(p.x * 5.0, p.y * 10.0, p.z), 2) * 0.3;
    
    // 增加细节纹理的频率和强度
    let detail1 = linearFbm(vec3f(p.x * 15.0, p.y * 25.0, p.z), 2) * 0.25;
    let detail2 = linearFbm(vec3f(p.x * 20.0, p.y * 30.0, p.z), 2) * 0.2;
    
    // 木射线效果
    let rays = rayPattern(vec2f(p.x, p.y)) * 0.35;
    
    // 各种纹理
    let stripes = stripePattern(vec2f(p.x, p.y));
    let fibers = fiberPattern(vec2f(p.x, p.y));
    let needles = needlePattern(vec2f(p.x, p.y));
    
    // 调整混合比例以突出细节
    let base_medium = mix(base, medium, 0.4);
    let detail_mix = mix(detail1, detail2, 0.5);
    let combined = base_medium + detail_mix * 0.35 + rays + stripes + 
                  fibers * 1.2 + // 增加纤维的权重
                  needles * 1.1; // 增加木针的权重
    
    // 水平变化 - 降低强度
    let horizontal = linearFbm(vec3f(p.x * 4.0, p.y * 0.5, p.z), 2) * 0.06;
    
    // 更细致的值范围控制
    let t = clamp(combined + horizontal, 0.0, 0.8);

    // 改进的颜色混合 - 增加层次
    if (t < 0.25) {
        return mix(params.color1, 
                  mix(params.color1, params.color2, 0.3), 
                  t / 0.25);
    } else if (t < 0.5) {
        return mix(mix(params.color1, params.color2, 0.3),
                  params.color2,
                  (t - 0.25) / 0.25);
    } else if (t < 0.75) {
        return mix(params.color2,
                  mix(params.color2, params.color3, 0.7),
                  (t - 0.5) / 0.25);
    } else {
        return mix(mix(params.color2, params.color3, 0.7),
                  params.color3,
                  (t - 0.75) / 0.25);
    }
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
    let dims = textureDimensions(output);
    if (global_id.x >= dims.x || global_id.y >= dims.y) {
        return;
    }
    
    // 计算UV坐标，强调垂直方向
    let uv = vec2f(
        f32(global_id.x) / f32(dims.x),
        f32(global_id.y) / f32(dims.y)
    );
    
    // 计算位置，加强垂直纹理
    let p = vec3f(
        uv.x * params.scale,
        uv.y * params.scale * 1.5,  // 垂直方向拉伸
        params.time
    );
    
    let color = quarterSawnPattern(p);
    
    // 更精确的亮度控制
    let contrast_base = color - vec3f(0.5);
    let contrast_adjusted = contrast_base * max(min(params.contrast, 1.2), 0.0) + vec3f(0.5);
    
    let brightness_offset = clamp(params.brightness, -0.15, 0.15);
    let final_color = clamp(
        contrast_adjusted + vec3f(brightness_offset),
        vec3f(0.0),
        vec3f(0.85)
    );
    
    textureStore(output, global_id.xy, vec4f(final_color, 1.0));
} 