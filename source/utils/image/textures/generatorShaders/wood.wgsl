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
            brightness: f32
        }
        @group(0) @binding(1) var<uniform> params: Params;

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
        noise3D(pos + vec3f(0.0, 100.0, 0.0)) * 1.8,
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
    let direction = vec3f(0.2, 1.0, 0.2);
    let p_directed = p * direction;
    
    // 增强基础纹理的层次感
    let n1 = fbmDistorted(p_directed * vec3f(0.5, 0.25, 0.35));
    let n1_detail = fbmDistorted(p_directed * vec3f(0.8, 0.4, 0.5)) * 0.3;
    let n1_fine_detail = fbmDistorted(p_directed * vec3f(1.2, 0.6, 0.7)) * 0.15; // 新增更细腻的基础纹理
    let base_pattern = mix(n1 + n1_detail + n1_fine_detail, 1.0, 0.4);
    
    // 增加更自然的环状纹理变化
    let ring_base = length(p_directed.xy * vec2f(0.12, 0.35)) * params.ring_scale;
    let ring_distortion = fbmDistorted(p_directed * 0.18) * 2.0 + 
                         fbmDistorted(p_directed * 0.3) * 0.5 +
                         fbmDistorted(p_directed * 0.45) * 0.25; // 新增第三层环状扰动
    let ring_pattern = sin(ring_base + ring_distortion);
    
    // 多层次木纤维细节
    let fiber_detail1 = fbmDistorted(p_directed * vec3f(10.0, 1.2, 1.0)) * 0.1;
    let fiber_detail2 = fbmDistorted(p_directed * vec3f(15.0, 1.8, 1.0)) * 0.06;
    let fiber_detail3 = fbmDistorted(p_directed * vec3f(20.0, 2.5, 1.0)) * 0.04;
    let fiber_detail4 = fbmDistorted(p_directed * vec3f(25.0, 3.0, 1.0)) * 0.02;
    let fiber_detail5 = fbmDistorted(p_directed * vec3f(35.0, 3.5, 1.0)) * 0.015;
    let fiber_detail6 = fbmDistorted(p_directed * vec3f(45.0, 4.0, 1.0)) * 0.01; // 新增更细的纤维
    let fiber_detail7 = fbmDistorted(p_directed * vec3f(55.0, 4.5, 1.0)) * 0.008; // 新增最细的纤维
    let combined_fiber = fiber_detail1 + fiber_detail2 + fiber_detail3 + fiber_detail4 + 
                        fiber_detail5 + fiber_detail6 + fiber_detail7;
    
    // 改进木纹纹理的细节
    let grain = 1.0 - smoothstep(0.2, 0.8,
        musgraveFbm(p * vec3f(params.grain_scale * 2.0, params.grain_scale * 0.3, 1.0), 4.0, 1.8, 2.2) +
        musgraveFbm(p * vec3f(params.grain_scale * 1.5, params.grain_scale * 0.2, 1.0), 3.0, 1.8, 2.2) * 0.5 +
        musgraveFbm(p * vec3f(params.grain_scale * 3.0, params.grain_scale * 0.4, 1.0), 2.0, 1.8, 2.2) * 0.25 +
        musgraveFbm(p * vec3f(params.grain_scale * 4.0, params.grain_scale * 0.5, 1.0), 2.0, 1.8, 2.2) * 0.125 // 新增第四层grain
    ) * 0.15;

    // 增强细节层次
    let fine_detail = fbmDistorted(p_directed * vec3f(30.0, 4.0, 1.0)) * 0.02 +
                      fbmDistorted(p_directed * vec3f(40.0, 5.0, 1.0)) * 0.01 +
                      fbmDistorted(p_directed * vec3f(50.0, 6.0, 1.0)) * 0.005; // 新增第三层细节
    let medium_detail = fbmDistorted(p_directed * vec3f(15.0, 2.5, 1.0)) * 0.04 +
                       fbmDistorted(p_directed * vec3f(20.0, 3.0, 1.0)) * 0.02 +
                       fbmDistorted(p_directed * vec3f(25.0, 3.5, 1.0)) * 0.01; // 新增第三层中等细节
    
    // 更自然的纹理混合
    let n2 = mix(
        musgraveFbm(vec3f(base_pattern * 1.5 + ring_pattern * 0.4), 5.0, 0.0, 2.0),
        base_pattern + combined_fiber,
        0.75
    );
    
    // 微观细节增强
    let micro_detail = fbmDistorted(p_directed * vec3f(60.0, 7.0, 1.0)) * 0.004 + // 新增微观细节
                       fbmDistorted(p_directed * vec3f(70.0, 8.0, 1.0)) * 0.002;
    
    // 平滑的细节整合
    let t_detailed = clamp(
        (n2 * grain + combined_fiber * 0.65 + fine_detail + medium_detail + micro_detail) * 0.95,
        0.0, 1.0
    );
    
    // 更平滑的颜色过渡
    if t_detailed < 0.35 {
        let dark_mix = smoothstep(0.0, 0.35, t_detailed);
        return mix(params.color1, params.color2, dark_mix);
    } else if t_detailed < 0.75 {
        let mid_mix = smoothstep(0.35, 0.75, t_detailed);
        return mix(params.color2, params.color3, mid_mix);
    } else {
        let light_mix = smoothstep(0.75, 1.0, t_detailed);
        return mix(params.color3, params.color3 * 1.05, light_mix);
    }
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
    let dims = textureDimensions(output);
    if global_id.x >= dims.x || global_id.y >= dims.y {
        return;
    }      
    // 直接使用像素坐标，不进行fract操作
    let uv = vec2f(f32(global_id.x), f32(global_id.y)) / vec2f(f32(dims.x), f32(dims.y));        
    // 根据实际尺寸计算位置，移除周期性变换
    let p = vec3f(
        uv.x * params.scale,
        uv.y * params.scale,
        params.time
    );
    let color = woodPattern(p);        
    // 应用对比度和亮度
    let adjusted_color = clamp(
        (color - 0.5) * params.contrast + 0.5 + params.brightness,
        vec3f(0.0),
        vec3f(1.0)
    );
    textureStore(output, global_id.xy, vec4f(adjusted_color, 1.0));
}