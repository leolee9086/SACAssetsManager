@group(0) @binding(0) var output: texture_storage_2d<rgba8unorm, write>;

struct GradientParams {
    color1: vec4f,
    color2: vec4f,
    angle: f32,
    offset: f32,
    _padding: vec2f
}
@group(0) @binding(1) var<uniform> params: GradientParams;

fn rotate2D(pos: vec2f, angle: f32) -> f32 {
    let c = cos(angle);
    let s = sin(angle);
    return pos.x * c + pos.y * s;
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
    let dims = textureDimensions(output);
    if (global_id.x >= dims.x || global_id.y >= dims.y) {
        return;
    }
    
    let pos = vec2f(
        (f32(global_id.x) / f32(dims.x) - 0.5) * 2.0,
        (f32(global_id.y) / f32(dims.y) - 0.5) * 2.0
    );
    
    let rotated = rotate2D(pos, params.angle);
    var t = (rotated + 1.0) * 0.5 + params.offset;
    t = clamp(t, 0.0, 1.0);
    
    let color = mix(params.color1, params.color2, t);
    textureStore(output, global_id.xy, color);
} 