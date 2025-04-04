@group(0) @binding(0) var output: texture_storage_2d<rgba8unorm, write>;

struct Params {
    color1: vec3f,    // 基础颜色
    _pad1: f32,
    color2: vec3f,    // 斑点颜色
    _pad2: f32,
    color3: vec3f,    // 亮点颜色
    _pad3: f32,
    
    time: f32,        // 随机种子
    scale: f32,       // 整体缩放
    grid_scale: f32,  // 晶体网格缩放
    line_width: f32,  // 晶体边界宽度
    
    noise_scale: f32, // 噪声缩放
    roughness: f32,   // 表面粗糙度
    _pad4: vec2f
}
@group(0) @binding(1) var<uniform> params: Params;

// 改进的哈希函数
fn hash2(p: vec2f) -> vec2f {
    let k = vec2f(12.9898, 78.233);
    let p2 = vec2f(
        dot(p, k),
        dot(p, k.yx)
    );
    return fract(sin(p2) * vec2f(43758.5453123, 28001.8384247));
}

// 简化的 Voronoi 函数用于调试
fn voronoi(p: vec2f) -> vec3f {
    let n = floor(p);
    let f = fract(p);
    
    // 调试：直接返回基础值
    // return vec3f(f.x, f.y, 0.0);  // 应该看到 UV 重复图案
    
    var minDist = 8.0;
    var secondDist = 8.0;
    var minPoint = vec2f(0.0);
    
    // 遍历相邻单元格
    for(var j: i32 = -1; j <= 1; j++) {
        for(var i: i32 = -1; i <= 1; i++) {
            let neighbor = vec2f(f32(i), f32(j));
            let point = hash2(n + neighbor);
            let diff = neighbor + point - f;
            let dist = length(diff);  // 改用 length 而不是 dot
            
            if(dist < minDist) {
                secondDist = minDist;
                minDist = dist;
                minPoint = point;
            } else if(dist < secondDist) {
                secondDist = dist;
            }
        }
    }
    
    // 调试：输出原始距离值
    return vec3f(minDist, secondDist, minPoint.x);
}

// 改进的 Perlin 噪声
fn noise(p: vec2f) -> f32 {
    let i = floor(p);
    let f = fract(p);
    
    // 使用更平滑的插值
    let u = f * f * (3.0 - 2.0 * f);
    
    let a = hash2(i);
    let b = hash2(i + vec2f(1.0, 0.0));
    let c = hash2(i + vec2f(0.0, 1.0));
    let d = hash2(i + vec2f(1.0, 1.0));
    
    return mix(
        mix(dot(a, f), dot(b, f - vec2f(1.0, 0.0)), u.x),
        mix(dot(c, f - vec2f(0.0, 1.0)), dot(d, f - vec2f(1.0, 1.0)), u.x),
        u.y
    ) * 0.5 + 0.5;
}

// 改进的 FBM
fn fbm(p: vec2f) -> f32 {
    var value = 0.0;
    var amplitude = 0.5;
    var frequency = 1.0;
    var total_amplitude = 0.0;
    
    for(var i = 0; i < 4; i++) {
        // 使用不同的偏移来避免重复
        let offset = vec2f(f32(i) * 1.327, f32(i) * 2.645);
        value += amplitude * noise(p * frequency + offset);
        total_amplitude += amplitude;
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    
    return value / total_amplitude;
}
@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
    let dims = textureDimensions(output);
    let uv = vec2f(f32(id.x), f32(id.y)) / vec2f(f32(dims.x), f32(dims.y));
    
    // 1. 生成基础的 Voronoi 图案作为晶体结构
    var p = uv * params.grid_scale;
    let voronoi_result = voronoi(p + vec2f(params.time));
    let cell_dist = voronoi_result.x;
    let edge_dist = abs(voronoi_result.y - voronoi_result.x);
    
    // 2. 添加噪声纹理作为表面细节
    let noise_uv = uv * params.noise_scale;
    var detail = fbm(noise_uv + vec2f(params.time * 0.1));
    detail = pow(detail, params.roughness);
    
    // 3. 合成最终颜色
    // 边缘检测
    let edge = smoothstep(0.0, params.line_width, edge_dist);
    
    // 基于 Voronoi 和噪声混合颜色
    let noise_factor = detail * 0.5;
    let cell_factor = cell_dist * 0.5;
    
    // 混合三种颜色
    var final_color = mix(
        params.color1,  // 基础颜色
        params.color2,  // 斑点颜色
        noise_factor
    );
    
    final_color = mix(
        final_color,
        params.color3,  // 亮点颜色
        cell_factor * edge
    );
    
    // 4. 添加表面变化
    let surface_detail = fbm(noise_uv * 2.0 + vec2f(params.time * 0.2));
    final_color *= (0.8 + surface_detail * 0.4);
    
    textureStore(output, id.xy, vec4f(final_color, 1.0));
}