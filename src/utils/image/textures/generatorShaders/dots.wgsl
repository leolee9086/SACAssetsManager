@group(0) @binding(0) var output: texture_storage_2d<rgba8unorm, write>;        
struct Params {
            background: vec4f,
            dot_color: vec4f,
            size: f32,
            dot_radius: f32,
            softness: f32,
            rotation: f32
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
    let uv = vec2f(f32(global_id.x), f32(global_id.y)) / vec2f(f32(dims.x), f32(dims.y));

    let rotatedUV = rotate2D(uv - 0.5, params.rotation) + 0.5;
    let gridUV = fract(rotatedUV * params.size);
    let dist = length(gridUV - 0.5);

    let circle = 1.0 - smoothstep(
        params.dot_radius - params.softness,
        params.dot_radius + params.softness,
        dist
    );

    let color = mix(params.background, params.dot_color, circle);
    textureStore(output, global_id.xy, color);
}
