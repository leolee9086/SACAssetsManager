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
    let n1 = fbmDistorted(p * vec3f(5.8, 1.12, 1.5));
    let base_pattern = mix(n1, 1.0, 0.3);
            
            // 生成木纹的主要结构
    let n2 = mix(
        musgraveFbm(vec3f(base_pattern * 4.6), 8.0, 0.0, 2.5),
        base_pattern,
        0.85
    );
            
            // 添加纹理细节
    let grain = 1.0 - smoothstep(0.2, 1.0,
    musgraveFbm(p * vec3f(400.0, 9.5, 1.3), 2.0, 2.0, 2.5)) * 0.15;        
            // 混合颜色
    let t = clamp(n2 * grain, 0.0, 1.0);

    if t < 0.35 {
        return mix(params.color1, params.color2, t / 0.35);
    } else if t < 0.75 {
        return mix(params.color2, params.color3, (t - 0.35) / 0.4);
    } else {
        return mix(params.color3, params.color3 * 1.1, (t - 0.75) / 0.25);
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