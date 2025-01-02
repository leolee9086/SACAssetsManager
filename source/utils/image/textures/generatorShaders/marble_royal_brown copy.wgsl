@group(0) @binding(0) var output: texture_storage_2d<rgba8unorm, write>;

struct Params {
    color1: vec3f,
    _pad1: f32,
    color2: vec3f,
    _pad2: f32,
    color3: vec3f,
    _pad3: f32,
        time: f32,
    scale: f32,

    vein_scale: f32,
    jitter: f32,
    vein_contrast: f32,
    brightness: f32,
}
@group(0) @binding(1) var<uniform> params: Params;

// 改进的涡流噪声函数
fn turbulence(p: vec3f, octaves: i32, roughness: f32) -> f32 {
    var value = 0.0;
    var amp = 1.0;
    var freq = 1.0;
    var tot = 0.0;
    
    for (var i = 0; i < octaves; i++) {
        value += amp * abs(noise3D(p * freq));
        tot += amp;
        amp *= roughness;
        freq *= 2.0;
    }
    
    return value / tot;
}

// 大理石纹理生成函数
fn marblePattern(p: vec3f) -> vec3f {
    var pos = p;
    
    // 添加纤维粗细变化控制
    let thickness_variation = vec3f(
        turbulence(p * 1.2 + vec3f(p.y * 0.8, p.z * 1.2, p.x * 0.9), 6, 0.5) * 0.7 +
        turbulence(p * 2.4 + vec3f(p.z * 1.1, p.x * 0.7, p.y * 1.3), 4, 0.6) * 0.3,
        
        turbulence(p * 1.3 + vec3f(p.x * 1.1, p.y * 0.9, p.z * 0.8), 6, 0.5) * 0.7 +
        turbulence(p * 2.5 + vec3f(p.y * 0.8, p.z * 1.2, p.x * 0.6), 4, 0.6) * 0.3,
        
        turbulence(p * 1.4 + vec3f(p.z * 0.7, p.x * 1.3, p.y * 1.1), 6, 0.5) * 0.7 +
        turbulence(p * 2.6 + vec3f(p.x * 1.2, p.y * 0.6, p.z * 0.9), 4, 0.6) * 0.3
    );
    
    // 更新纤维噪声，加入粗细变化
    let fiber_noise = vec3f(
        turbulence(p * (1.8 + thickness_variation.x) + vec3f(p.y * 3.2, p.z * 0.6, p.x * 2.4), 9, 0.25) +
        turbulence(p * (1.4 - thickness_variation.y) + vec3f(p.z * 0.5, p.x * 3.0, p.y * 0.4), 8, 0.3) * 0.9 +
        turbulence(p * (3.2 + thickness_variation.z) + vec3f(p.x * 1.2, p.y * 0.7, p.z * 2.6), 7, 0.4) * 0.5,
        
        turbulence(p * (1.6 - thickness_variation.z) + vec3f(p.x * 2.8, p.y * 3.0, p.z * 0.7), 9, 0.25) +
        turbulence(p * (1.2 + thickness_variation.x) + vec3f(p.y * 2.6, p.z * 0.4, p.x * 0.5), 8, 0.3) * 0.9 +
        turbulence(p * (3.0 - thickness_variation.y) + vec3f(p.z * 0.8, p.x * 1.6, p.y * 1.2), 7, 0.4) * 0.5,
        
        turbulence(p * (1.7 + thickness_variation.y) + vec3f(p.z * 2.4, p.x * 0.6, p.y * 2.8), 9, 0.25) +
        turbulence(p * (1.3 - thickness_variation.z) + vec3f(p.x * 0.4, p.y * 2.5, p.z * 2.2), 8, 0.3) * 0.9 +
        turbulence(p * (3.1 + thickness_variation.x) + vec3f(p.y * 1.4, p.z * 0.9, p.x * 1.3), 7, 0.4) * 0.5
    );

    let flow_direction = vec3f(
        sin(pos.y * 0.8 + fiber_noise.x * (0.6 + thickness_variation.x * 0.2)),
        cos(pos.x * 0.7 + fiber_noise.y * (0.6 + thickness_variation.y * 0.2)),
        sin((pos.x + pos.y) * 0.5 + fiber_noise.z * (0.6 + thickness_variation.z * 0.2))
    );
    
    pos += fiber_noise * (params.jitter * 2.5) + flow_direction * (0.3 + thickness_variation.x * 0.1);

    // 更新纤维细节，加入粗细变化
    let fiber_detail = (
        sin(pos.x * (26.0 + thickness_variation.x * 4.0) + pos.y * 9.0 + flow_direction.x * 4.0 + 
            turbulence(pos * 1.9, 7, 0.3) * 5.0) * (0.2 + thickness_variation.x * 0.1) +
        sin(pos.y * (24.0 - thickness_variation.y * 4.0) + pos.x * 10.0 + flow_direction.y * 4.0 + 
            turbulence(pos * 1.8, 7, 0.3) * 5.0) * (0.2 + thickness_variation.y * 0.1) +
        sin(pos.x * (18.0 + thickness_variation.z * 4.0) + pos.y * 16.0 + flow_direction.z * 4.0 + 
            turbulence(pos * 1.7, 7, 0.3) * 5.0) * (0.15 + thickness_variation.z * 0.08) +
        sin(pos.y * (20.0 - thickness_variation.x * 4.0) + pos.x * 14.0 + 
            (flow_direction.x + flow_direction.y) * 2.0 + turbulence(pos * 1.6, 7, 0.3) * 5.0) * 
            (0.15 + thickness_variation.y * 0.08)
    ) * 0.45;

    // 更柔顺的基础纹理
    let base_pattern1 = sin(
        pos.x * params.vein_scale * 2.2 + pos.y * params.vein_scale * 1.6 +
        turbulence(pos * 0.7 + fiber_noise * 0.7, 9, 0.35) * params.vein_contrast * 1.8
    ) * 0.6 + turbulence(pos * 2.6 + flow_direction * 0.5, 8, 0.4) * 0.4;
    
    let base_pattern2 = sin(
        pos.y * params.vein_scale * 2.0 + pos.x * params.vein_scale * 1.7 +
        turbulence(pos * 0.8 + fiber_noise.zxy * 0.6, 9, 0.35) * params.vein_contrast * 1.7
    ) * 0.6 + turbulence(pos * 2.4 + flow_direction.zxy * 0.5, 8, 0.4) * 0.4;

    let base_combined = mix(base_pattern1, base_pattern2, 0.3) + fiber_detail + 0.4; // 进一步提亮
    
    // 更细腻的细节层
    let detail1 = turbulence(pos * vec3f(4.5, 4.2, 4.3) + fiber_noise * 0.3, 7, 0.3) * 0.45;
    let detail2 = turbulence(pos * vec3f(5.4, 5.6, 5.5) + fiber_noise.yzx * 0.25, 6, 0.25) * 0.35;
    let detail3 = turbulence(pos * vec3f(6.6, 6.4, 6.5) + fiber_noise.zxy * 0.2, 5, 0.2) * 0.3;
    let detail4 = turbulence(pos * vec3f(8.5, 8.3, 8.4) + fiber_noise.yzx * 0.15, 4, 0.15) * 0.25;

    // 添加暗部控制变量
    let darkness1 = turbulence(
        pos * vec3f(1.8, 1.8, 1.8) + 
        vec3f(pos.y * 0.3, pos.x * 0.3, 0.0), 
        5, 0.4
    ) * 0.4;
    
    let darkness2 = turbulence(
        pos * vec3f(2.8, 2.8, 2.8) + 
        vec3f(pos.x * 0.2, pos.y * 0.2, 0.0), 
        4, 0.3
    ) * 0.3;

    let combined = clamp(
        base_combined + 
        detail1 + detail2 + detail3 + detail4 - 
        (darkness1 * 0.3 + darkness2 * 0.15), // 减少暗部影响
        0.25,
        1.0
    );
    
    // 调整色彩过渡，进一步减少暗部
    if combined < 0.4 {
        let dark_mix = smoothstep(0.25, 0.4, combined);
        return mix(params.color1 * 0.95, params.color2 * 1.05, dark_mix) * 
               (1.0 - darkness2 * 0.1 + fiber_detail * 0.2);
    } else if combined < 0.6 {
        let mid_dark_mix = smoothstep(0.4, 0.6, combined);
        let mid_dark_color = mix(params.color2 * 1.05, params.color2 * 1.25, mid_dark_mix);
        return mid_dark_color * (1.0 - darkness1 * 0.05 + fiber_detail * 0.25);
    } else if combined < 0.8 {
        let mid_bright_mix = smoothstep(0.6, 0.8, combined);
        let mid_bright_color = mix(params.color2 * 1.25, params.color3 * 1.1, mid_bright_mix);
        return mid_bright_color * (1.0 + fiber_detail * 0.3);
    } else {
        let bright_mix = smoothstep(0.8, 1.0, combined);
        let bright_color = mix(params.color3 * 1.1, params.color3 * 1.4, bright_mix);
        return bright_color * (1.0 + fiber_detail * 0.35);
    }
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
    let dims = textureDimensions(output);
    if global_id.x >= dims.x || global_id.y >= dims.y {
        return;
    }
    
    let uv = vec2f(f32(global_id.x), f32(global_id.y)) / vec2f(f32(dims.x), f32(dims.y));
    let p = vec3f(
        uv.x * params.scale,
        uv.y * params.scale,
        params.time
    );
    
    let color = marblePattern(p);
    
    // 改进的亮度和对比度调整
    let final_color = mix(
        vec3f(0.4),  // 降低中间值以增加对比度
        color,
        params.vein_contrast * 1.2  // 增加对比度系数
    ) * params.brightness;
    
    textureStore(output, global_id.xy, vec4f(final_color, 1.0));
}

// 改进的哈希函数
fn hash31(p3: vec3f) -> f32 {
    var p = fract(p3 * 0.1031);
    p += dot(p, p.yzx + 333.3456);
    return fract((p.x + p.y) * p.z);
}

fn hash21(p: vec2f) -> f32 {
    return hash31(vec3f(p.x, p.y, 0.0));
}

// 改进的3D噪声
fn noise3D(p: vec3f) -> f32 {
    let s = vec3f(7.0, 157.0, 113.0);
    let ip = floor(p);
    var fp = fract(p);
    
    // 使用更好的平滑插值
    fp = fp * fp * fp * (fp * (fp * 6.0 - 15.0) + 10.0);
    
    // 改进的哈希计算，减少方向性
    var result = 0.0;
    for (var i = 0; i < 2; i++) {
        for (var j = 0; j < 2; j++) {
            for (var k = 0; k < 2; k++) {
                let offset = vec3f(f32(i), f32(j), f32(k));
                let h = ip + offset;
                
                // 更复杂的哈希计算减少方向性
                let n = fract(
                    sin(
                        dot(h, vec3f(127.1, 311.7, 74.7)) + 
                        dot(h.zxy, vec3f(269.5, 183.3, 246.1)) + 
                        dot(h.yzx, vec3f(419.2, 371.9, 168.2))
                    ) * 43758.5453
                );

                let weight = fp - offset;
                result += n * (1.0 - abs(weight.x)) * (1.0 - abs(weight.y)) * (1.0 - abs(weight.z));
            }
        }
    }

    return result;
}
