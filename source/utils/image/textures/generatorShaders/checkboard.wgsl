@group(0) @binding(0) var output: texture_storage_2d<rgba8unorm, write>;        
struct Params {
            color1: vec4f,
            color2: vec4f,
            size: f32,
            rotation: f32,
            offset_x: f32,
            offset_y: f32
        }
@group(0) @binding(1) var<uniform> params: Params;
fn rotate2D(uv: vec2f, angle: f32) -> vec2f {
    let c = cos(angle);
    let s = sin(angle);
    return vec2f(
        uv.x * c - uv.y * s,
        uv.x * s + uv.y * c
    );
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
    let dims = textureDimensions(output);
    let uv = (vec2f(f32(global_id.x), f32(global_id.y)) + vec2f(params.offset_x, params.offset_y)) / vec2f(f32(dims.x), f32(dims.y));

    let rotatedUV = rotate2D(uv - 0.5, params.rotation) + 0.5;
    let grid = floor(rotatedUV * params.size);
    let checker = (grid.x + grid.y) % 2.0;

    let color = mix(params.color1, params.color2, checker);
    textureStore(output, global_id.xy, color);
}