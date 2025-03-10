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
    
    // 增加更复杂的初始扭曲
    pos += vec3f(
        turbulence(p * 0.7, 6, 0.65),  // 增加八度数和粗糙度
        turbulence(p * 0.6, 6, 0.65),
        turbulence(p * 0.5, 6, 0.65)
    ) * params.jitter;

    // 多层次的基础纹理
    let base_pattern1 = sin(
        pos.x * params.vein_scale + 
        turbulence(pos * 0.4, 7, 0.7) * params.vein_contrast
    );
    
    let base_pattern2 = sin(
        pos.y * params.vein_scale * 0.7 + 
        turbulence(pos * 0.5, 6, 0.6) * params.vein_contrast * 0.8
    );

    // 多尺度细节层
    let detail1 = turbulence(pos * 2.0, 5, 0.5) * 0.4;
    let detail2 = turbulence(pos * 3.0, 4, 0.4) * 0.3;
    let detail3 = turbulence(pos * 4.0, 3, 0.3) * 0.2;
    let detail4 = turbulence(pos * 6.0, 3, 0.25) * 0.15;  // 更高频细节
    
    // 多层次的暗部控制
    let darkness1 = turbulence(pos * 1.5, 4, 0.5) * 0.5;
    let darkness2 = turbulence(pos * 2.5, 3, 0.4) * 0.3;
    
    // 组合基础纹理
    let base_combined = mix(base_pattern1, base_pattern2, 0.3);
    
    // 组合所有纹理层，使用多层次暗部控制
    let combined = clamp(
        base_combined + 
        detail1 + detail2 + detail3 + detail4 - 
        (darkness1 * 0.7 + darkness2 * 0.3),
        0.0, 1.0
    );
    
    // 更细致的颜色过渡逻辑
    if combined < 0.3 {  // 深色区域
        let dark_mix = smoothstep(0.0, 0.3, combined);
        return mix(params.color1 * 0.7, params.color2 * 0.85, dark_mix) * 
               (1.0 - darkness2 * 0.2);
    } else if combined < 0.5 {  // 暗中间调
        let mid_dark_mix = smoothstep(0.3, 0.5, combined);
        let mid_dark_color = mix(params.color2 * 0.85, params.color2, mid_dark_mix);
        return mid_dark_color * (1.0 - darkness1 * 0.15);
    } else if combined < 0.7 {  // 亮中间调
        let mid_bright_mix = smoothstep(0.5, 0.7, combined);
        let mid_bright_color = mix(params.color2, params.color3 * 0.9, mid_bright_mix);
        return mid_bright_color * (1.0 - darkness1 * 0.1);
    } else {  // 亮部
        let bright_mix = smoothstep(0.7, 1.0, combined);
        let bright_color = mix(params.color3 * 0.9, params.color3 * 1.2, bright_mix);
        // 在亮部保留细微的暗部细节
        return bright_color * (1.0 - darkness2 * 0.08);
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
