struct Params {
    atmosphere: vec3<f32>,
    beta: f32,
}

@group(0) @binding(0) var input_texture: texture_2d<f32>;
@group(0) @binding(1) var output_texture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> params: Params;

// 优化1: 使用共享内存来减少纹理采样
var<workgroup> shared_data: array<f32, 256>; // 16x16 工作组

// 暗通道计算
fn getDarkChannel(pos: vec2<i32>, radius: i32, local_id: vec3<u32>, dims: vec2<u32>) -> f32 {
    let local_pos = vec2<u32>(local_id.xy);
    let local_idx = local_pos.y * 16u + local_pos.x;
    
    // 首先将像素值存入共享内存
    var color = vec3<f32>(0.0);
    // 所有线程都需要写入共享内存，即使是无效的像素
    if(pos.x < i32(dims.x) && pos.y < i32(dims.y)) {
        color = textureLoad(input_texture, pos, 0).rgb;
    }
    // 计算暗通道值时使用更严格的最小值
    shared_data[local_idx] = min(min(color.r, color.g), color.b);
    
    workgroupBarrier();
    
    if(pos.x >= i32(dims.x) || pos.y >= i32(dims.y)) {
        return 0.0;
    }
    
    // 增加采样半径以获取更好的暗通道估计
    let start_x = max(0, i32(local_pos.x) - radius);
    let end_x = min(15, i32(local_pos.x) + radius);
    let start_y = max(0, i32(local_pos.y) - radius);
    let end_y = min(15, i32(local_pos.y) + radius);
    
    var min_val = 1.0;  // 修改为寻找最小值而不是平均值
    
    for(var y = start_y; y <= end_y; y++) {
        for(var x = start_x; x <= end_x; x++) {
            let sample_idx = y * 16 + x;
            min_val = min(min_val, shared_data[sample_idx]);
        }
    }
    
    return min_val;  // 返回区域内的最小值
}

// 估算大气光值
fn estimateAtmosphericLight(dark_channel: f32, original: vec3<f32>) -> vec3<f32> {
    let threshold = 0.95;
    let weight = smoothstep(threshold - 0.05, threshold + 0.05, dark_channel);
    
    // 考虑颜色饱和度
    let luminance = dot(original, vec3<f32>(0.299, 0.587, 0.114));
    let saturation_weight = 1.0 - abs(luminance - dark_channel);
    
    return mix(original, params.atmosphere, weight * saturation_weight);
}

// 计算透射率
fn getTransmission(dark_channel: f32) -> f32 {
    let min_transmission = 0.1;
    let max_transmission = 0.9;  // 降低最大透射率以增强效果
    
    // 使用更激进的透射率估计
    let omega = 0.95;  // 使用固定的较大权重
    let raw_transmission = 1.0 - omega * dark_channel;
    
    // 增强深度感知
    let depth_factor = pow(dark_channel, 0.8);  // 调整指数以增强效果
    let adjusted_transmission = mix(raw_transmission, depth_factor, 0.5);  // 增加深度因子的影响
    
    return clamp(adjusted_transmission, min_transmission, max_transmission);
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>,
        @builtin(workgroup_id) workgroup_id: vec3<u32>,
        @builtin(local_invocation_id) local_id: vec3<u32>) {
    let dims = textureDimensions(input_texture);
    let pos = vec2<i32>(global_id.xy);
    
    // 移除这里的边界检查，将其移到 getDarkChannel 内部
    let dark_channel = getDarkChannel(pos, 4, local_id, dims);
    
    // 在这里进行边界检查
    if(pos.x >= i32(dims.x) || pos.y >= i32(dims.y)) {
        return;
    }
    
    let original = textureLoad(input_texture, pos, 0).rgb;
    
    // 使用向量化操作
    let A = estimateAtmosphericLight(dark_channel, original);
    let t = getTransmission(dark_channel);
    
    let safe_t = max(t, 0.001);
    let inv_safe_t = 1.0 / safe_t;
    
    // 增强去雾效果
    let result = pow(
        (original * inv_safe_t - A * inv_safe_t + A), 
        vec3<f32>(0.9)  // 稍微降低 gamma 以增加对比度
    );
    
    // 确保结果在有效范围内
    let final_result = clamp(result, vec3<f32>(0.0), vec3<f32>(1.0));
    textureStore(output_texture, pos, vec4<f32>(final_result, 1.0));
}
