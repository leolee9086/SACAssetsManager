@group(0) @binding(0) var output: texture_storage_2d<rgba8unorm, write>;
        
struct Params {
            scale: f32,
            seed: f32,
            intensity: f32,
            jitter: f32,
            falloff: f32
        }
@group(0) @binding(1) var<uniform> params: Params;
fn hash3(p: vec2f) -> vec2f {
    var p2 = vec2f(
        dot(p, vec2f(127.1, 311.7)),
        dot(p, vec2f(269.5, 183.3))
    );
    p2 = fract(sin(p2 + params.seed) * 43758.5453123);
    return p2;
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
    let dims = textureDimensions(output);
    let uv = vec2f(f32(global_id.x), f32(global_id.y)) / vec2f(f32(dims.x), f32(dims.y));

    let scaled_uv = uv * params.scale;
    let cell = floor(scaled_uv);
    var min_dist = 1.0;
            
            // 搜索相邻的细胞
    for (var y: i32 = -1; y <= 1; y++) {
        for (var x: i32 = -1; x <= 1; x++) {
            let neighbor = cell + vec2f(f32(x), f32(y));
            let point = neighbor + params.jitter * hash3(neighbor);
            let diff = point - scaled_uv;
            min_dist = min(min_dist, length(diff));
        }
    }

    let value = pow(min_dist * params.intensity, params.falloff);
    textureStore(output, global_id.xy, vec4f(value, value, value, 1.0));
}