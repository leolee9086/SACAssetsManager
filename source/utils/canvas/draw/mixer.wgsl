   // 常量定义
#import {fn sRGBToLinear,fn linearToSRGB} from './colors.wgsl';
#import {f32 PI,f32 EPSILON} from './constants.wgsl'

                // 结构体定义
struct VertexOutput {
                    @builtin(position) position: vec4f,
                    @location(0) texCoord: vec2f,
                }
struct KMCoefficients {
                    K: vec3f,  // 吸收系数
                    S: vec3f   // 散射系数
                }
struct PigmentParams {
                scatteringCoeff: f32,    // 散射系数基准值
                thicknessScale: f32,     // 厚度缩放因子
                alphaExponent: f32,      // alpha 通道指数
                ditherStrength: f32,     // 抖动强度
                maxOpacity: f32,         // 最大不透明度
                canvasWeight: f32,        // 画布颜色权重
                viscosity: f32,      // 稠度
                dragStrength: f32,   // 拖动强度
}
// 绑定组声明
@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var outputTexture: texture_2d<f32>;
@group(0) @binding(2) var textureSampler: sampler;
@group(0) @binding(3) var<uniform> params: PigmentParams;
// 顶点着色器
@vertex
fn vertexMain(@location(0) position: vec2f) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4f(position, 0.0, 1.0);
    output.texCoord = position * 0.5 + 0.5;
    return output;
}


              // 改进 RGB 到 KM 系数的转换
fn RGBToKM(color: vec3f, S: vec3f) -> KMCoefficients {
    // 对于接近白色的颜色，降低散射系数以保持亮度
    let whiteness = (color.r + color.g + color.b) / 3.0;
    let adjustedS = mix(S, S * 0.5, pow(whiteness, 2.0));
    let R = clamp(color, vec3f(EPSILON), vec3f(1.0 - EPSILON));
    // 修改 K/S 比率计算，使其在接近白色时更准确
    let K_over_S = (pow(1.0 - R, vec3f(2.0))) / (2.0 * R);
    let K = K_over_S * adjustedS;
    return KMCoefficients(K, adjustedS);
}

                // 改进的 KM 系数到 RGB 转换
fn KMToRGB(km: KMCoefficients) -> vec3f {
    let K_over_S = km.K / km.S;
    // 标准 K-M 方程的反函数
    // R = 1 + K/S - sqrt((K/S)² + 2K/S)
    let a = 1.0 + K_over_S;
    let root = sqrt(K_over_S * K_over_S + 2.0 * K_over_S);
    let R = a - root;
    return clamp(R, vec3f(0.0), vec3f(1.0));
}
 // 添加 alpha 混合函数
fn blendAlpha(a1: f32, a2: f32) -> f32 {
// Porter-Duff alpha 合成
    return a1 + a2 * (1.0 - a1);
}
fn premultiplyAlpha(color: vec4f) -> vec4f {
 // 计算在白色背景下的RGB值，并保留alpha
    let premultipliedRGB = color.rgb * color.a + vec3f(1.0) * (1.0 - color.a);
    return vec4f(premultipliedRGB, color.a);
}
                    
// 添加新的辅助函数用于限制颜色衰减
fn limitColorDecay(color: vec3f, original: vec3f, limit: f32) -> vec3f {
    let decay = max(original - color, vec3f(0.0));
    let limitedDecay = min(decay, vec3f(limit));
    return original - limitedDecay;
}
 // 改进的颜料混合函数
fn mixPigmentsKM(color1: vec4f, color2: vec4f, params: PigmentParams, texCoord: vec2f) -> vec4f {
    let premultipliedColor1 = premultiplyAlpha(color1);
    let premultipliedColor2 = premultiplyAlpha(color2);
    let c1 = sRGBToLinear(color1.rgb);
    let c2 = sRGBToLinear(premultipliedColor2.rgb);         
    // 为每个颜色通道调整散射系数
    let S = vec3f(
        params.scatteringCoeff * 1.0,  // Red
        params.scatteringCoeff * 1.2,  // Green
        params.scatteringCoeff * 1.4   // Blue
    );

    let km1 = RGBToKM(c1, S);
    let km2 = RGBToKM(c2, S);
    let alpha = min(color1.a, color1.a);  // 限制最大不透明度
    let canvasAlpha = color2.a;  // 获取画布的 alpha 值
    let combinedAlpha = blendAlpha(alpha, canvasAlpha);  // 结合画笔和画布的 alpha
    let brushWeight = pow(alpha, params.alphaExponent);  // 使用结合后的 alpha 计算权重                    
                    // 调整画布权重
    let canvasWeight = 0.5 + params.canvasWeight;  // 增加画布颜色的影响
    var thickness = brushWeight * params.thicknessScale;
                    // 在高稠度时模拟真实的颜料物理特性
    if params.viscosity > 0.7 {
                    // 计算剪切应力 (基于位置和方向的梯度)
        let shearStress = length(vec2f(
            dpdx(texCoord.x),
            dpdy(texCoord.y)
        )) * 10.0;
                    
                    // 非牛顿流体模型：剪切变稀效应
                    // 使用 Cross 模型计算表观粘度
        let zeroPhi = params.viscosity;           // 零剪切粘度
        let infPhi = params.viscosity * 0.3;      // 无限剪切粘度
        let k = 0.8;                              // 松弛时间
        let n = 0.7;                              // 流动指数
                    
                    // 计算表观粘度
        let apparentViscosity = infPhi + (zeroPhi - infPhi) / (1.0 + pow(k * shearStress, n));
                    
                    // 计算局部流动模式
        let flowPattern = hash2D(texCoord * 5.0);
                    
                    // 计算颜料分布权重 - 仅影响空间分布
        let distributionWeight = smoothstep(
            0.3, 0.7,
            flowPattern + shearStress * (1.0 - apparentViscosity)
        );
                    
                    // 应用到厚度
        thickness = thickness * (1.0 - (distributionWeight - 0.5) * 0.2);
    }

    var t1 = thickness;
    var t2 = (1.0 - thickness) * 1.0;
    let total = t1 + t2;
                    
                    // 归一化权重
    t1 = t1 / total;
    t2 = t2 / total;
                    
                    // 使用对数空间混合以获得更准确的颜料混合效果
    let mixed_km = KMCoefficients(
        exp(log(km1.K + vec3f(1.0)) * t1 + log(km2.K + vec3f(1.0)) * t2) - vec3f(1.0),
        exp(log(km1.S + vec3f(1.0)) * t1 + log(km2.S + vec3f(1.0)) * t2) - vec3f(1.0)
    );
                    
                    // 转换回 RGB
    let mixed_linear = KMToRGB(mixed_km);
    let mixed_srgb = linearToSRGB(mixed_linear);
                    
                    // 计算最终的 alpha 值，考虑最大不透明度
    let final_alpha = min(blendAlpha(alpha, color2.a), params.maxOpacity);

    return vec4f(mixed_srgb, 1.0);
}
              
                // 添加噪声函数
fn hash2D(p: vec2f) -> f32 {
    let k = vec2f(0.3183099, 0.3678794);
    let kp = p * k;
    return fract(16.0 * k.x * k.y * fract(kp.x + kp.y));
}

                // 添加抖动函数
fn getDither(pos: vec2f, strength: f32) -> f32 {
                    // 使用像素位置生成伪随机值
    let rand = hash2D(pos);
                    // 将随机值映射到 [-strength, strength] 范围
    return (rand * 2.0 - 1.0) * strength;
}

// 片段着色器
@fragment
fn fragmentMain(
    @location(0) texCoord: vec2f,
    @builtin(position) fragCoord: vec4f,
) -> @location(0) vec4f {
    let brush = textureSample(inputTexture, textureSampler, texCoord);
    let canvas = textureSample(outputTexture, textureSampler, texCoord);

    var mixed = mixPigmentsKM(brush, canvas, params, texCoord);                    
                    // 微弱的抖动以减少色带
    let dither = getDither(fragCoord.xy, params.ditherStrength * 0.25);
    return vec4f(mixed.rgb, brush.a);
}