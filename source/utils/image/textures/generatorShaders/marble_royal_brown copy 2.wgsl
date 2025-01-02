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
    
    // 主导方向的大裂纹控制
    let main_crack = vec3f(
        turbulence(p * 0.8 + vec3f(p.y * 0.4, p.x * 0.2, 0.0), 4, 0.7) +
        turbulence(p * 1.6 + vec3f(p.x * 0.3, p.y * 0.5, 0.0), 3, 0.8) * 0.5,
        
        turbulence(p * 0.7 + vec3f(p.x * 0.5, p.y * 0.3, 0.0), 4, 0.7) +
        turbulence(p * 1.5 + vec3f(p.y * 0.2, p.x * 0.4, 0.0), 3, 0.8) * 0.5,
        
        turbulence(p * 0.9 + vec3f(p.y * 0.3, p.x * 0.4, 0.0), 4, 0.7) +
        turbulence(p * 1.7 + vec3f(p.x * 0.4, p.y * 0.3, 0.0), 3, 0.8) * 0.5
    );
    
    // 裂纹分叉控制
    let crack_branch = vec3f(
        turbulence(p * 2.2 + main_crack.yzx * 0.6, 6, 0.5) * 0.4,
        turbulence(p * 2.0 + main_crack.zxy * 0.6, 6, 0.5) * 0.4,
        turbulence(p * 1.8 + main_crack.xyz * 0.6, 6, 0.5) * 0.4
    );
    
    pos += (main_crack + crack_branch) * params.jitter;

    // 主裂纹纹理
    let base_pattern1 = sin(
        pos.x * params.vein_scale * 0.7 + pos.y * params.vein_scale * 0.5 +
        main_crack.x * params.vein_contrast * 2.5
    ) * 0.7 + crack_branch.x * 0.3;
    
    let base_pattern2 = sin(
        pos.y * params.vein_scale * 0.6 + pos.x * params.vein_scale * 0.4 +
        main_crack.y * params.vein_contrast * 2.5
    ) * 0.7 + crack_branch.y * 0.3;

    // 边缘渐变细节
    let edge_detail = (
        turbulence(pos * 3.5 + main_crack * 0.4, 7, 0.4) * 0.3 +
        turbulence(pos * 2.8 + crack_branch * 0.3, 6, 0.4) * 0.2
    );

    let base_combined = mix(base_pattern1, base_pattern2, 0.4) + edge_detail + 0.5;
    
    // 细微纹理细节
    let detail1 = turbulence(pos * vec3f(4.0) + main_crack * 0.2, 6, 0.3) * 0.15;
    let detail2 = turbulence(pos * vec3f(5.0) + crack_branch * 0.2, 5, 0.3) * 0.1;
    let detail3 = turbulence(pos * vec3f(6.0) + main_crack.zxy * 0.2, 4, 0.3) * 0.08;
    let detail4 = turbulence(pos * vec3f(7.0) + crack_branch.yzx * 0.2, 4, 0.3) * 0.07;

    // 暗部控制（主要沿裂纹分布）
    let darkness1 = turbulence(
        pos * vec3f(1.5) + main_crack * 0.5, 
        4, 0.5
    ) * 0.3;
    
    let darkness2 = turbulence(
        pos * vec3f(2.0) + crack_branch * 0.4, 
        3, 0.4
    ) * 0.2;

    let combined = clamp(
        base_combined + 
        detail1 + detail2 + detail3 + detail4 - 
        (darkness1 * 0.4 + darkness2 * 0.3),
        0.3,
        1.0
    );
    
    // 调整色彩过渡以匹配图片特征
    if combined < 0.45 {
        let dark_mix = smoothstep(0.3, 0.45, combined);
        return mix(params.color1 * 0.95, params.color2 * 1.05, dark_mix) * 
               (1.0 - darkness2 * 0.15 + edge_detail * 0.1);
    } else if combined < 0.65 {
        let mid_mix = smoothstep(0.45, 0.65, combined);
        let mid_color = mix(params.color2 * 1.05, params.color3 * 0.9, mid_mix);
        return mid_color * (1.0 - darkness1 * 0.1 + edge_detail * 0.15);
    } else {
        let bright_mix = smoothstep(0.65, 1.0, combined);
        let bright_color = mix(params.color3 * 0.9, params.color3 * 1.1, bright_mix);
        return bright_color * (1.0 + edge_detail * 0.1);
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
