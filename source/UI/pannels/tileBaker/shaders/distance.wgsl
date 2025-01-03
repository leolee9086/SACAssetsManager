#import { fn perlinNoise } from "./common.wgsl"
#import { struct Params } from "./common.wgsl"

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var textureSampler: sampler;

fn rotate2D(uv: vec2<f32>, angle: f32) -> vec2<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return vec2<f32>(
        uv.x * c - uv.y * s,
        uv.x * s + uv.y * c
    );
}

// 计算图像的灰度值
fn getLuminance(color: vec3<f32>) -> f32 {
    return dot(color, vec3<f32>(0.299, 0.587, 0.114));
}

// 计算梯度
fn calculateGradient(uv: vec2<f32>, texSize: vec2<f32>) -> vec2<f32> {
    let pixelSize = 1.0 / texSize;
    
    // 预计算所有采样点的偏移
    let offsets = array<vec2<f32>, 8>(
        vec2<f32>(-pixelSize.x, -pixelSize.y), // tl
        vec2<f32>(0.0, -pixelSize.y),          // t
        vec2<f32>(pixelSize.x, -pixelSize.y),  // tr
        vec2<f32>(-pixelSize.x, 0.0),          // l
        vec2<f32>(pixelSize.x, 0.0),           // r
        vec2<f32>(-pixelSize.x, pixelSize.y),  // bl
        vec2<f32>(0.0, pixelSize.y),           // b
        vec2<f32>(pixelSize.x, pixelSize.y)    // br
    );
    
    // 在统一控制流中采样所有点
    let samples = array<f32, 8>(
        textureSample(inputTexture, textureSampler, uv + offsets[0]).r, // tl
        textureSample(inputTexture, textureSampler, uv + offsets[1]).r, // t
        textureSample(inputTexture, textureSampler, uv + offsets[2]).r, // tr
        textureSample(inputTexture, textureSampler, uv + offsets[3]).r, // l
        textureSample(inputTexture, textureSampler, uv + offsets[4]).r, // r
        textureSample(inputTexture, textureSampler, uv + offsets[5]).r, // bl
        textureSample(inputTexture, textureSampler, uv + offsets[6]).r, // b
        textureSample(inputTexture, textureSampler, uv + offsets[7]).r  // br
    );
    
    // Sobel X = -tl - 2l - bl + tr + 2r + br
    let gx = -samples[0] - 2.0 * samples[3] - samples[5] + 
             samples[2] + 2.0 * samples[4] + samples[7];
             
    // Sobel Y = -tl - 2t - tr + bl + 2b + br
    let gy = -samples[0] - 2.0 * samples[1] - samples[2] + 
             samples[5] + 2.0 * samples[6] + samples[7];
    
    return vec2<f32>(gx, gy);
}

// 改进的边缘检测
fn detectEdge(uv: vec2<f32>, texSize: vec2<f32>) -> f32 {
    let gradient = calculateGradient(uv, texSize);
    return length(gradient);
}

// 计算曲率
fn calculateCurvature(uv: vec2<f32>, texSize: vec2<f32>) -> f32 {
    let gradient = calculateGradient(uv, texSize);
    let gradientMag = length(gradient);
    
    // 计算二阶导数
    let pixelSize = 1.0 / texSize;
    let dx = gradient.x;
    let dy = gradient.y;
    let dxx = calculateGradient(uv + vec2<f32>(pixelSize.x, 0.0), texSize).x - dx;
    let dyy = calculateGradient(uv + vec2<f32>(0.0, pixelSize.y), texSize).y - dy;
    
    return abs(dxx + dyy) / (1.0 + gradientMag);
}

fn applyProfile(dist: f32, profile: i32) -> f32 {
    switch(profile) {
        case 1: { // 线性
            return dist;
        }
        case 2: { // 平方
            return dist * dist;
        }
        case 3: { // 平方根
            return sqrt(dist);
        }
        default: {
            return dist;
        }
    }
}

// 改进的裂纹生成，避免非统一返回值
fn generateFractalCrack(uv: vec2<f32>, distanceField: f32, texSize: vec2<f32>) -> f32 {
    // 计算边缘强度和曲率
    let edgeStrength = detectEdge(uv, texSize);
    let curvature = calculateCurvature(uv, texSize);
    
    // 修改权重计算，使其更加局部化
    let edgeWeight = smoothstep(0.3, 0.7, distanceField) * 
                     smoothstep(0.0, 0.3, distanceField); // 添加上限，避免在高值区域产生裂缝
    let curvatureWeight = smoothstep(0.0, 0.5, curvature);
    
    // 计算裂纹方向
    let gradient = calculateGradient(uv, texSize);
    let crackAngle = atan2(gradient.y, gradient.x);
    
    // 添加局部化因子
    let localFactor = perlinNoise(uv * 5.0) * // 增加噪声频率
                      smoothstep(0.2, 0.8, edgeStrength) *
                      (1.0 - smoothstep(0.7, 1.0, distanceField)); // 在高值区域渐变消失
    
    // 修改主裂纹计算
    let rotatedUV = rotate2D(uv, crackAngle);
    let mainCrackBase = abs(rotatedUV.x) * (20.0 + curvature * 10.0);
    let mainCrackNoise = perlinNoise(uv * params.crackFrequency) * localFactor; // 应用局部化因子
    let mainCrackWidth = params.crackWidth * (1.0 + curvatureWeight) * localFactor; // 局部化裂纹宽度
    let mainCrack = step(mainCrackBase * (1.0 + mainCrackNoise * params.crackRandomness), mainCrackWidth);
    
    // 初始化分支裂纹累积值
    var branchCracks = 0.0;
    
    // 使用循环展开替代动态循环
    {
        // 分支 1
        let branchWeight1 = edgeWeight * 0.8 * (1.0 + curvatureWeight);
        let branchAngle1 = perlinNoise(rotatedUV) * 3.14159 * branchWeight1;
        let branchUV1 = rotate2D(rotatedUV, branchAngle1);
        let branchCrack1 = abs(branchUV1.x) * (30.0 + curvature * 15.0);
        branchCracks += step(branchCrack1, params.crackWidth * 0.5) * 0.5 * branchWeight1;
        
        // 分支 2
        let branchWeight2 = edgeWeight * 0.6 * (1.0 + curvatureWeight);
        let branchAngle2 = perlinNoise(rotatedUV * 2.0) * 3.14159 * branchWeight2;
        let branchUV2 = rotate2D(rotatedUV, branchAngle2);
        let branchCrack2 = abs(branchUV2.x) * (30.0 + curvature * 15.0);
        branchCracks += step(branchCrack2, params.crackWidth * 0.5) * 0.5 * branchWeight2;
        
        // 分支 3
        let branchWeight3 = edgeWeight * 0.4 * (1.0 + curvatureWeight);
        let branchAngle3 = perlinNoise(rotatedUV * 3.0) * 3.14159 * branchWeight3;
        let branchUV3 = rotate2D(rotatedUV, branchAngle3);
        let branchCrack3 = abs(branchUV3.x) * (30.0 + curvature * 15.0);
        branchCracks += step(branchCrack3, params.crackWidth * 0.5) * 0.5 * branchWeight3;
    }
    
    // 微裂纹计算
    let microDetail = perlinNoise(uv * params.crackFrequency * 2.0) * 
                     smoothstep(0.2, 0.8, edgeStrength) * 
                     params.crackRandomness;
    
    // 组合所有裂纹效果
    let totalCrack = mainCrack + branchCracks;
    
    // 确保返回值在 0-1 范围内
    return clamp(totalCrack * edgeWeight + microDetail * 0.3, 0.0, 1.0);
}

// 改进的磨损效果计算
fn calculateWearEffect(baseStrength: f32, uv: vec2<f32>) -> f32 {
    let texSize = vec2<f32>(textureDimensions(inputTexture));
    
    // 在统一控制流中预计算所有需要的值
    let gradient = calculateGradient(uv, texSize);
    let edgeStrength = length(gradient);
    let curvature = calculateCurvature(uv, texSize);
    
    // 边缘区域的磨损权重（边缘和拐角处磨损更明显）
    let edgeWearWeight = smoothstep(0.2, 0.8, edgeStrength + curvature * 2.0);
    
    // 在统一控制流中计算所有噪声值
    let noiseScales = array<f32, 3>(5.0, 15.0, params.wearDetail);
    let noiseWeights = array<f32, 3>(0.6, 0.3, 0.1);
    
    var combinedNoise = 0.0;
    for (var i = 0u; i < 3u; i++) {
        combinedNoise += perlinNoise(uv * noiseScales[i]) * noiseWeights[i];
    }
    
    // 组合不同尺度的磨损，并应用非线性变换
    let combinedWear = pow(combinedNoise * params.wearAmount, 1.5);
    
    // 计算磨损深度（边缘处磨损更深）
    let wearDepth = combinedWear * mix(0.3, 1.0, edgeWearWeight);
    
    // 添加随机的微小凸起（模拟磨损后的表面不平整）
    let microBumps = (perlinNoise(uv * 50.0) - 0.5) * 0.05 * params.wearAmount;
    
    // 计算磨损模式（某些区域更容易磨损）
    let wearPattern = smoothstep(0.3, 0.7, combinedWear + edgeWearWeight);
    
    // 在深度较大的区域增加更明显的磨损
    let depthInfluence = smoothstep(0.3, 0.7, baseStrength);
    let finalWearAmount = mix(
        wearDepth * 0.5,  // 浅区域的磨损
        wearDepth,        // 深区域的磨损
        depthInfluence
    );
    
    // 应用磨损效果，确保结果在合理范围内
    return clamp(
        baseStrength - (finalWearAmount * wearPattern) + microBumps,
        0.0,
        baseStrength  // 确保磨损不会使深度增加
    );
}

// 改进的砂浆堆积效果
fn calculateMortarAccumulation(baseStrength: f32, uv: vec2<f32>) -> f32 {
    // 大尺度堆积
    let largeAccum = perlinNoise(uv * params.mortarFrequency) * params.mortarVariation;
    
    // 细节堆积
    let detailAccum = perlinNoise(uv * params.mortarFrequency * 3.0) * params.mortarVariation * 0.5;
    
    // 组合堆积效果
    let totalAccum = (largeAccum + detailAccum) * 2.0;  // 增强效果
    
    // 在深度较大的区域增加堆积效果
    let accumWeight = smoothstep(0.2, 0.8, baseStrength);
    
    return baseStrength + (totalAccum * accumWeight);
}

// 添加新的灰度映射函数
fn remapGrayscale(value: f32, inputMin: f32, inputMax: f32, outputMin: f32, outputMax: f32) -> f32 {
    let inputRange = inputMax - inputMin;
    let outputRange = outputMax - outputMin;
    return outputMin + (((value - inputMin) / inputRange) * outputRange);
}

// 检测边缘和角点
fn detectEdgesAndCorners(uv: vec2<f32>, texSize: vec2<f32>) -> vec2<f32> {
    let gradient = calculateGradient(uv, texSize);
    let edgeStrength = length(gradient);
    
    // 检测角点（梯度变化剧烈的区域）
    let cornerStrength = dot(abs(gradient), vec2<f32>(1.0));
    
    return vec2<f32>(edgeStrength, cornerStrength);
}

// 计算应力分布
fn calculateStressField(uv: vec2<f32>, edgeStrength: f32, cornerStrength: f32) -> f32 {
    // 边缘应力
    let edgeStress = smoothstep(0.3, 0.7, edgeStrength);
    
    // 角点应力（增强角点效果）
    let cornerStress = pow(cornerStrength, 0.5) * 1.5;
    
    // 合并应力场
    return max(edgeStress, cornerStress);
}

// 生成微小裂纹
fn generateMicroCracks(uv: vec2<f32>, stress: f32) -> f32 {
    let microDetail = perlinNoise(uv * 50.0) * 0.15;
    return microDetail * stress;
}

// 改进的边缘开裂效果
fn calculateCrackEffect(baseStrength: f32, uv: vec2<f32>, edgeStrength: f32) -> f32 {
    // 主裂纹图案
    let mainCrack = generateFractalCrack(uv, baseStrength, vec2<f32>(textureDimensions(inputTexture)));
    
    // 应力场
    let stress = calculateStressField(uv, edgeStrength, 0.0);
    
    // 微小裂纹
    let microCracks = generateMicroCracks(uv, stress);
    
    // 裂纹掩码（控制裂纹出现的位置）
    let crackMask = smoothstep(
        0.5 - params.crackWidth,
        0.5 + params.crackWidth,
        mainCrack + microCracks
    );
    
    // 应力影响裂纹深度
    let crackDepth = params.crackDepth * mix(0.2, 1.0, stress);
    
    // 在裂纹边缘添加轻微凸起（材料应力效果）
    let bulge = smoothstep(0.4, 0.6, mainCrack) * 0.1 * (1.0 - stress);
    
    // 合并效果
    return baseStrength - (crackDepth * crackMask) + bulge;
}

// 改进的角点损坏效果
fn calculateCornerDamage(baseStrength: f32, uv: vec2<f32>, cornerStrength: f32) -> f32 {
    // 主损坏图案
    let cornerNoise = generateFractalCrack(uv * params.cornerNoiseScale, cornerStrength, vec2<f32>(textureDimensions(inputTexture)));
    
    // 角点影响区域
    let cornerMask = smoothstep(0.0, params.cornerFalloff, cornerStrength);
    
    // 添加不规则碎裂效果
    let debris = perlinNoise(uv * 20.0) * 0.3;
    
    // 计算损坏程度
    let damagePattern = mix(cornerNoise, debris, 0.3) * cornerMask;
    let damage = params.cornerDamage * damagePattern;
    
    // 添加细节变化
    let detailNoise = perlinNoise(uv * 40.0) * 0.1;
    
    // 在损坏区域添加微小凸起
    let microBulge = smoothstep(0.3, 0.7, damagePattern) * 0.05;
    
    return baseStrength - (damage * cornerMask) + (detailNoise * cornerMask) + microBulge;
}

@vertex
fn vertMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4<f32> {
    var pos = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>( 1.0, -1.0),
        vec2<f32>( 1.0,  1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>( 1.0,  1.0),
        vec2<f32>(-1.0,  1.0)
    );
    return vec4<f32>(pos[vertexIndex], 0.0, 1.0);
}

@fragment
fn fragMain(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTexture));
    let uv = pos.xy / texSize;
    
    let originalColor = textureSample(inputTexture, textureSampler, uv);
    let originalDistance = getLuminance(originalColor.rgb);
    
    // 1. 首先进行砖面判定 - 提前进行以避免后续计算影响砖面
    let seamWidth = params.seamWidth * 2.0;
    let isBrickSurface = originalDistance >= seamWidth;
    
    // 2. 计算局部化的噪声 - 只在砖缝区域有效
    let mortarMask = 1.0 - smoothstep(0.0, seamWidth, originalDistance);
    let localNoiseScale = 50.0; // 增加噪声频率
    let noiseUV = uv * localNoiseScale;
    
    // 多层噪声叠加，创造更丰富的细节
    let noise1 = perlinNoise(noiseUV) * 0.5;
    let noise2 = perlinNoise(noiseUV * 2.0) * 0.25;
    let noise3 = perlinNoise(noiseUV * 4.0) * 0.125;
    let seamNoise = (noise1 + noise2 + noise3) * mortarMask * params.seamVariation;
    
    // 3. 计算局部化的砖缝宽度
    let localSeamWidth = seamWidth * (1.0 + seamNoise * 0.3); // 降低噪声对宽度的影响
    
    // 4. 计算砖缝深度 - 使用更陡峭的过渡
    let mortarWeight = smoothstep(
        localSeamWidth * 0.8,  // 收紧过渡区域
        localSeamWidth,
        originalDistance
    );
    
    // 5. 基础深度计算
    let baseDepth = mix(
        params.heightRangeMin,
        params.heightRangeMax,
        smoothstep(0.0, localSeamWidth, originalDistance + seamNoise * 0.1)
    );
    
    // 6. 添加细节变化 - 只在砖缝区域
    let detailNoise = (perlinNoise(noiseUV * 8.0) * 0.1 + 
                      perlinNoise(noiseUV * 16.0) * 0.05) * 
                      mortarMask;
    
    // 7. 计算最终深度
    let mortarDepth = clamp(
        baseDepth + detailNoise,
        params.heightRangeMin,
        params.heightRangeMax
    );
    
    // 8. 使用更严格的混合方式
    let preOutput = mix(
        1.0,                // 砖面为纯白色
        mortarDepth,        // 砖缝深度
        step(originalDistance, localSeamWidth) // 硬截止
    );
    
    // 9. 最终强制砖面纯白
    let finalDepth = select(
        preOutput,
        1.0,
        isBrickSurface
    );
    
    // 10. 使用局部化宽度和黄金分割比进行更精确的判定
    let goldenRatio = 1.618;
    let guardWidth = mix(seamWidth, localSeamWidth, 1.0 / goldenRatio);
    let safetyCheck = originalDistance >= guardWidth;
    let outputDepth = select(finalDepth, 1.0, safetyCheck);
    
    return vec4<f32>(vec3<f32>(outputDepth), originalColor.a);
}