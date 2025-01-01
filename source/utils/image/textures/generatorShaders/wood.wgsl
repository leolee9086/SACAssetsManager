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

            grain_scale: f32,
            ring_scale: f32,
            contrast: f32,
            brightness: f32
        }
        @group(0) @binding(1) var<uniform> params: Params;

        // 改进的哈希函数
fn hash31(p3: vec3f) -> f32 {
    // 使用正弦函数来提供更好的周期性
    var p = sin(p3 * 0.1031);
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
            
    var result = 0.0;
    for (var i = 0; i < 2; i++) {
        for (var j = 0; j < 2; j++) {
            for (var k = 0; k < 2; k++) {
                let offset = vec3f(f32(i), f32(j), f32(k));
                let h = ip + offset;
                let n = fract(
                    sin(
                        dot(h, vec3f(127.1, 311.7, 74.7)) + dot(h.zxy, vec3f(269.5, 183.3, 246.1)) + dot(h.yzx, vec3f(419.2, 371.9, 168.2))
                    ) * 43758.5453
                );
                let weight = fp - offset;
                result += n * (1.0 - abs(weight.x)) * (1.0 - abs(weight.y)) * (1.0 - abs(weight.z));
            }
        }
    }

    return result;
}

        // 改进的FBM函数
fn fbm(p: vec3f, octaves: i32, roughness: f32) -> f32 {
    var sum = 0.0;
    var amp = 1.0;
    var tot = 0.0;
    var pos = p;
    let rough = clamp(roughness, 0.0, 1.0);

    for (var i = 0; i < octaves; i++) {
        sum += amp * noise3D(pos);
        tot += amp;
        amp *= rough;
        pos *= 2.0;
    }

    return sum / tot;
}

        // 扭曲的FBM
fn fbmDistorted(p: vec3f) -> f32 {
    var pos = p;
    pos += (vec3f(
        noise3D(pos + vec3f(100.0, 0.0, 0.0)),
        noise3D(pos + vec3f(0.0, 100.0, 0.0)) ,
        noise3D(pos + vec3f(0.0, 0.0, 100.0))
    ) * 2.0 - 1.0) * 1.15;

    return fbm(pos, 8, 0.5);
}

        // Musgrave FBM
fn musgraveFbm(p: vec3f, octaves: f32, dimension: f32, lacunarity: f32) -> f32 {
    var sum = 0.0;
    var amp = 1.0;
    var pos = p;
    let m = pow(lacunarity, -dimension);

    for (var i = 0.0; i < octaves; i += 1.0) {
        let n = noise3D(pos) * 2.0 - 1.0;
        sum += n * amp;
        amp *= m;
        pos *= lacunarity;
    }

    return sum;
}

        // 改进的木纹生成函数
fn woodPattern(p: vec3f) -> vec3f {
    let direction = vec3f(0.1, 1.0, 0.1);
    let p_directed = p * direction;
    
    // 增加基础纹理的密度和细节
    let n1_base = fbmDistorted(p_directed * vec3f(0.8, 0.4, 0.6));
    let n1_detail = fbmDistorted(p_directed * vec3f(1.6, 0.8, 1.2));
    let n1 = mix(n1_base, n1_detail, 0.5);
    let base_pattern = mix(n1, 1.0, 0.3);
    
    // 增强环状纹理的密度
    let ring_base = length(p_directed.xy * vec2f(0.3, 0.7)) * params.ring_scale;
    let ring_detail = fbmDistorted(p_directed * 0.4) * 3.0;
    let ring_variation = fbmDistorted(p_directed * 0.6) * 2.5;
    let ring_pattern = sin(ring_base + ring_detail) * (1.0 + ring_variation * 0.3);
    
    // 分层的木纤维细节
    let fiber_layers = array<vec2f, 16>(
        vec2f(8.0, 0.12),    // 基础纤维
        vec2f(12.0, 0.08),   // 中等纤维
        vec2f(15.0, 0.05),   // 细纤维
        vec2f(18.0, 0.04),   // 更细纤维
        vec2f(22.0, 0.035),  
        vec2f(25.0, 0.03),  
        vec2f(30.0, 0.025),  
        vec2f(35.0, 0.02),   
        vec2f(40.0, 0.015),  
        vec2f(45.0, 0.01),   
        vec2f(50.0, 0.008),  
        vec2f(55.0, 0.005),  
        vec2f(65.0, 0.004), 
        vec2f(75.0, 0.003),  
        vec2f(85.0, 0.002),  
        vec2f(95.0, 0.001)   
    );
    
    var combined_fiber = 0.0;
    for (var i = 0; i < 16; i++) {
        let scale = fiber_layers[i].x;
        let intensity = fiber_layers[i].y;
        combined_fiber += fbmDistorted(p_directed * vec3f(scale, scale * 0.2, 1.0)) * intensity;
    }
    
    // 添加随机的微小变化
    let micro_detail = fbmDistorted(p_directed * vec3f(80.0, 8.0, 1.0)) * 0.008;
    
    // 增强纹理混合
    let n2 = mix(
        musgraveFbm(vec3f(base_pattern * 1.5 + ring_pattern * 0.4), 5.0, 0.0, 2.0),
        base_pattern + combined_fiber + micro_detail,
        0.7
    );
    
    // 增强木纹纹理的细节
    let grain = 1.0 - smoothstep(0.2, 0.8,
        musgraveFbm(p_directed * vec3f(params.grain_scale * 2.0, params.grain_scale * 0.3, 1.0), 4.0, 1.8, 2.2) +
        musgraveFbm(p_directed * vec3f(params.grain_scale * 1.5, params.grain_scale * 0.2, 1.0), 3.0, 1.8, 2.2) * 0.5 +
        musgraveFbm(p_directed * vec3f(params.grain_scale * 3.0, params.grain_scale * 0.4, 1.0), 2.0, 1.8, 2.2) * 0.3
    ) * 0.18;

    // 增加更细腻的色彩过渡
    let fine_detail = fbmDistorted(p_directed * vec3f(20.0, 3.0, 1.0)) * 0.03;
    let medium_detail = fbmDistorted(p_directed * vec3f(10.0, 2.0, 1.0)) * 0.05;
    
    // 将细节添加到基本 t 值中
    let t_detailed = clamp((n2 * grain + combined_fiber * 0.7 + fine_detail + medium_detail), 0.0, 1.0);
    
    // 更精细的颜色混合系统
    if t_detailed < 0.12 {
        // 最深暗部
        let deepest_mix = smoothstep(0.0, 0.12, t_detailed);
        return mix(
            params.color1 * 0.75,  // 更深的暗部
            mix(params.color1 * 0.85, params.color2 * 0.8, 0.2),
            pow(deepest_mix, 1.8) + fine_detail * 0.4
        );
    } else if t_detailed < 0.2 {
        // 深暗过渡区
        let deep_dark_mix = smoothstep(0.12, 0.2, t_detailed);
        let deep_base = mix(params.color1 * 0.85, params.color2 * 0.8, 0.2);
        let deep_target = mix(params.color1 * 0.9, params.color2 * 0.85, 0.3);
        return mix(
            deep_base,
            deep_target,
            deep_dark_mix + fine_detail * 0.6
        );
    } else if t_detailed < 0.28 {
        // 暗部主区域
        let dark_mix = smoothstep(0.2, 0.28, t_detailed);
        let dark_base = mix(params.color1 * 0.9, params.color2 * 0.85, 0.3);
        let dark_target = mix(params.color1, params.color2, 0.35);
        return mix(
            dark_base,
            dark_target,
            dark_mix + fine_detail * 0.8
        );
    } else if t_detailed < 0.36 {
        // 暗中过渡区域1
        let dark_mid_mix1 = smoothstep(0.28, 0.36, t_detailed);
        let mid_dark1 = mix(params.color1, params.color2, 0.35);
        let mid_dark_target1 = mix(params.color2 * 0.9, mix(params.color2, params.color3, 0.15), 0.4);
        return mix(
            mid_dark1,
            mid_dark_target1,
            dark_mid_mix1 + medium_detail * 0.5
        );
    } else if t_detailed < 0.44 {
        // 暗中过渡区域2
        let dark_mid_mix2 = smoothstep(0.36, 0.44, t_detailed);
        let mid_dark2 = mix(params.color2 * 0.9, mix(params.color2, params.color3, 0.15), 0.4);
        let mid_dark_target2 = mix(params.color2, params.color3, 0.25);
        return mix(
            mid_dark2,
            mid_dark_target2,
            dark_mid_mix2 + medium_detail * 0.6
        );
    } else if t_detailed < 0.52 {
        // 中间色调区域1
        let mid_mix1 = smoothstep(0.44, 0.52, t_detailed);
        let mid_base1 = mix(params.color2, params.color3, 0.25);
        let mid_target1 = mix(params.color2, params.color3, 0.4);
        return mix(
            mid_base1,
            mid_target1,
            mid_mix1 + (fine_detail + medium_detail) * 0.5
        );
    } else if t_detailed < 0.6 {
        // 中间色调区域2
        let mid_mix2 = smoothstep(0.52, 0.6, t_detailed);
        let mid_base2 = mix(params.color2, params.color3, 0.4);
        let mid_target2 = mix(params.color2, params.color3, 0.55);
        return mix(
            mid_base2,
            mid_target2,
            mid_mix2 + (fine_detail + medium_detail) * 0.6
        );
    } else if t_detailed < 0.68 {
        // 中亮过渡区域1
        let light_mid_mix1 = smoothstep(0.6, 0.68, t_detailed);
        let mid_light1 = mix(params.color2, params.color3, 0.55);
        let mid_light_target1 = mix(params.color2, params.color3, 0.7);
        return mix(
            mid_light1,
            mid_light_target1,
            light_mid_mix1 + fine_detail * 1.0
        );
    } else if t_detailed < 0.76 {
        // 中亮过渡区域2
        let light_mid_mix2 = smoothstep(0.68, 0.76, t_detailed);
        let mid_light2 = mix(params.color2, params.color3, 0.7);
        let mid_light_target2 = mix(params.color2, params.color3, 0.85);
        return mix(
            mid_light2,
            mid_light_target2,
            light_mid_mix2 + fine_detail * 1.2
        );
    } else if t_detailed < 0.84 {
        // 亮色区域1
        let light_mix1 = smoothstep(0.76, 0.84, t_detailed);
        let light_base1 = mix(params.color2, params.color3, 0.85);
        let light_target1 = mix(params.color3 * 0.95, params.color3, 0.3);
        return mix(
            light_base1,
            light_target1,
            light_mix1 + (fine_detail + medium_detail) * 0.7
        );
    } else if t_detailed < 0.92 {
        // 亮色区域2
        let light_mix2 = smoothstep(0.84, 0.92, t_detailed);
        let light_base2 = mix(params.color3 * 0.95, params.color3, 0.3);
        let light_target2 = mix(params.color3 * 0.97, params.color3, 0.6);
        return mix(
            light_base2,
            light_target2,
            light_mix2 + (fine_detail + medium_detail) * 0.8
        );
    } else {
        // 最亮区域
        let highlight_mix = smoothstep(0.92, 1.0, t_detailed);
        let highlight_base = mix(params.color3 * 0.97, params.color3, 0.6);
        let highlight_target = params.color3;
        return mix(
            highlight_base,
            highlight_target,
            highlight_mix + fine_detail * 2.0 + medium_detail * 0.9
        );
    }
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
    let dims = textureDimensions(output);
    if global_id.x >= dims.x || global_id.y >= dims.y {
        return;
    }      

    let uv = vec2f(f32(global_id.x), f32(global_id.y)) / vec2f(f32(dims.x), f32(dims.y));
    let scale_factor = params.scale ;
    
    // 修改坐标计算方式，确保 x 轴方向的连续性
    let tiled_uv = vec2f(
        fract(uv.x * scale_factor), // 保持周期性
        uv.y * scale_factor         // 保持原有的缩放
    );
    
    let p = vec3f(
        uv.x * scale_factor, // 直接使用缩放后的uv.x，保持连续性
        tiled_uv.y,
        params.time
    );

    let color = woodPattern(p);        
    textureStore(output, global_id.xy, vec4f(color, 1.0));
}