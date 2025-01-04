// 亮度调节的统一缓冲区
struct Uniforms {
    // 亮度调节范围：-1.0 到 1.0
    // -1.0 表示完全黑，0.0 表示原始亮度，1.0 表示最大亮度
    brightness: f32
}

@group(0) @binding(0) var input_texture: texture_2d<f32>;
@group(0) @binding(1) var input_sampler: sampler;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@fragment
fn main(
    @location(0) texcoord: vec2<f32>
) -> @location(0) vec4<f32> {
    // 获取原始颜色
    let color = textureSample(input_texture, input_sampler, texcoord);
    
    // 计算亮度调整
    // 当 brightness > 0 时，将颜色值向白色(1.0)过渡
    // 当 brightness < 0 时，将颜色值向黑色(0.0)过渡
    let adjusted = mix(
        color.rgb,
        select(vec3(0.0), vec3(1.0), uniforms.brightness > 0.0),
        abs(uniforms.brightness)
    );
    
    return vec4(adjusted, color.a);
}
