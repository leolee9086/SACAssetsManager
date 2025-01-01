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
            wood_type: i32,
            panel_width: f32,
            panel_height: f32,
            ring_scale: f32,
            ring_contrast: f32,
            grain_scale: f32,
        }
@group(0) @binding(1) var<uniform> params: Params;

        // 哈希函数
fn hash2(p: vec2f) -> vec2f {
    var p2 = vec2f(
        dot(p, vec2f(127.1, 311.7)),
        dot(p, vec2f(269.5, 183.3))
    );
    return fract(sin(p2) * 43758.5453123);
}

        // 值噪声
fn noise1(p: vec2f) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);

    let a = hash2(i).x;
    let b = hash2(i + vec2f(1.0, 0.0)).x;
    let c = hash2(i + vec2f(0.0, 1.0)).x;
    let d = hash2(i + vec2f(1.0, 1.0)).x;

    return mix(
        mix(a, b, u.x),
        mix(c, d, u.x),
        u.y
    );
}

        // 梯度噪声
fn noise2(p: vec2f) -> f32 {
    let i = floor(p);
    let f = fract(p);
            
            // 五次平滑插值
    let u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

    let ga = hash2(i) * 2.0 - 1.0;
    let gb = hash2(i + vec2f(1.0, 0.0)) * 2.0 - 1.0;
    let gc = hash2(i + vec2f(0.0, 1.0)) * 2.0 - 1.0;
    let gd = hash2(i + vec2f(1.0, 1.0)) * 2.0 - 1.0;

    let va = dot(ga, f);
    let vb = dot(gb, f - vec2f(1.0, 0.0));
    let vc = dot(gc, f - vec2f(0.0, 1.0));
    let vd = dot(gd, f - vec2f(1.0, 1.0));

    return mix(
        mix(va, vb, u.x),
        mix(vc, vd, u.x),
        u.y
    );
}

        // FBM (分形布朗运动)
fn fbm(p: vec2f, octaves: i32) -> f32 {
    var freq = 1.0;
    var amp = 0.5;
    var sum = 0.0;
    var norm = 0.0;
    var pos = p;
            
            // 旋转矩阵
    let rot = mat2x2f(
        vec2f(0.8, 0.6),
        vec2f(-0.6, 0.8)
    );

    for (var i = 0; i < octaves; i++) {
        sum += amp * noise2(pos);
        norm += amp;
        amp *= 0.5;
        pos = rot * pos * 2.0;
    }

    return 0.5 + 0.5 * sum / norm;
}

        // 木纹条纹颜色
fn stripesColor(f: f32, wood_type: i32) -> vec3f {
    var color: vec3f;

    if wood_type == 1 {
                // 红黄色
        color = 0.47 + 0.4 * sin(1.3 * f * f + vec3f(2.3, 2.85, 3.7));
    } else if wood_type == 2 {
                // 深红色
        color = 0.5 + 0.4 * sin(1.4 * f * f + vec3f(2.5, 3.1, 3.4));
    } else {
                // 浅黄色
        color = 0.7 + 0.3 * sin(1.4 * f * f + vec3f(1.7, 2.2, 2.5));
    }

    return color;
}

        // 树木年轮
fn treeRings(uv: vec2f) -> vec3f {
    var p = vec2f(2.5, 10.0) * uv + vec2f(50.0, 5.0);
    let angle = 2.0 * fbm(p, 1) / length(p);
            
            // 旋转矩阵
    let c = cos(angle);
    let s = sin(angle);
    let rot = mat2x2f(
        vec2f(c, s),
        vec2f(-s, c)
    );

    p = rot * p;
    let f = fbm(vec2f(params.ring_scale * p.y, 0.0), 2);
    return stripesColor(f, params.wood_type);
}

        // 变色效果
fn discoloration(uv: vec2f) -> vec3f {
    let p = 0.5 * vec2f(1.0, 2.0) * uv;
    let f = fbm(p, 2);
    return 0.6 + 0.6 * sin(2.3 * f + vec3f(1.4, 1.8, 2.4));
}

        // 细微纹理
fn fineGrain(uv: vec2f) -> f32 {
    let p = params.grain_scale * vec2f(4.0, 50.0) * uv;
    let f = fbm(0.5 * p, 4);
    return 1.0 - 0.4 * f * (1.0 - smoothstep(0.35, 0.45, f));
}

        // 木板拼接效果
fn panelAdjustment(uv: vec2f) -> vec3f {
    let width = params.panel_width;
    let height = params.panel_height;

    let j = floor(uv.y / height);
    let t = fract(uv.y / height);
    let i = floor(uv.x / width + 0.33 * (j % 3.0));
    let s = fract(uv.x / width + 0.33 * (j % 3.0));

    let off = 100.0 * hash2(vec2f(i, j));

    let asp = width / height;
    let gapw = 0.0017;

    let w = smoothstep(0.5, 0.5 - gapw, abs(s - 0.5)) * smoothstep(0.5, 0.5 - asp * gapw, abs(t - 0.5));

    let f = fbm(uv + off, 1);
    return vec3f(off, mix(sqrt(f), 1.0, w));
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
    let dims = textureDimensions(output);
    let uv = (2.0 * vec2f(f32(global_id.x), f32(global_id.y)) - vec2f(f32(dims.x), f32(dims.y))) / f32(dims.y);
    var pos = uv + 0.1 * params.time * vec2f(2.0, 1.0);
            
            // 应用木板拼接效果
    let panel = panelAdjustment(pos);
    pos += panel.xy;
            
            // 组合所有效果
    var color = treeRings(pos);
    color *= fineGrain(pos);
    color *= discoloration(pos);
    color *= panel.z;
            
            // 色调映射 (简单的S型曲线)
    color = color / (1.0 + color);

    textureStore(output, global_id.xy, vec4f(color, 1.0));
}
