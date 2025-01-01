const borderWidth: f32 = 0.3;  // 进一步增加边界宽度

@group(0) @binding(0) var input_texture: texture_2d<f32>;
@group(0) @binding(1) var input_sampler: sampler;
@group(0) @binding(2) var t_input: texture_2d<f32>;  // Gaussian input T(I)
@group(0) @binding(3) var t_inv: texture_2d<f32>;    // Inverse histogram transformation T^{-1}
@group(0) @binding(4) var t_sampler: sampler;        // Sampler for both textures
@group(0) @binding(5) var output_texture: texture_storage_2d<rgba8unorm, write>;

struct MirrorUV {
    uv_left: vec2<f32>,
    uv_right: vec2<f32>,
    uv_top: vec2<f32>,
    uv_bottom: vec2<f32>
}

fn smoothBlend(x: f32) -> f32 {
    // 使用更复杂的平滑函数，提供更渐进的过渡
    let x2 = x * x;
    let x4 = x2 * x2;
    let x8 = x4 * x4;
    return x8 * (x * (x * (-2.0 * x + 30.0) - 60.0) + 32.0);
}

fn remapValue(value: f32, fromMin: f32, fromMax: f32) -> f32 {
    return clamp((value - fromMin) / (fromMax - fromMin), 0.0, 1.0);
}

fn getEdgeWeight(pos: f32, borderWidth: f32) -> f32 {
    // 使用更平滑的过渡函数
    let w1 = smoothBlend(remapValue(pos, 0.0, borderWidth));
    let w2 = smoothBlend(remapValue(pos, 1.0 - borderWidth, 1.0));
    return w1 * w2;
}

fn getMirroredUV(uv: vec2<f32>, borderWidth: f32) -> MirrorUV {
    var result: MirrorUV;
    
    // 左右镜像
    result.uv_left = vec2<f32>(2.0 - uv.x, uv.y);  // 右边的镜像到左边
    result.uv_right = vec2<f32>(-uv.x, uv.y);      // 左边的镜像到右边
    
    // 上下镜像
    result.uv_top = vec2<f32>(uv.x, 2.0 - uv.y);   // 下边的镜像到上边
    result.uv_bottom = vec2<f32>(uv.x, -uv.y);     // 上边的镜像到下边
    
    return result;
}

fn TriangleGrid(uv: vec2<f32>,
    w1: ptr<function, f32>,
    w2: ptr<function, f32>,
    w3: ptr<function, f32>,
    vertex1: ptr<function, vec2<i32>>,
    vertex2: ptr<function, vec2<i32>>,
    vertex3: ptr<function, vec2<i32>>) {
    
    // 添加轻微的扰动以打破规则性
    let distorted_uv = uv + vec2<f32>(
        sin(uv.y * 6.28318) * 0.02,
        cos(uv.x * 6.28318) * 0.02
    );
    
    let scaled_uv = distorted_uv * 6.928;
    
    let gridToSkewedGrid = mat2x2<f32>(
        1.0, -0.57735027,
        0.0, 1.15470054
    );
    let skewedCoord = gridToSkewedGrid * scaled_uv;
    
    let baseId = vec2<i32>(floor(skewedCoord));
    var temp = vec3<f32>(fract(skewedCoord), 0.0);
    temp.z = 1.0 - temp.x - temp.y;

    // 使用平滑的重心坐标
    if temp.z > 0.0 {
        *w1 = smoothBlend(temp.z);
        *w2 = smoothBlend(temp.y);
        *w3 = smoothBlend(temp.x);
        *vertex1 = baseId;
        *vertex2 = baseId + vec2<i32>(0, 1);
        *vertex3 = baseId + vec2<i32>(1, 0);
    } else {
        *w1 = smoothBlend(-temp.z);
        *w2 = smoothBlend(1.0 - temp.y);
        *w3 = smoothBlend(1.0 - temp.x);
        *vertex1 = baseId + vec2<i32>(1, 1);
        *vertex2 = baseId + vec2<i32>(1, 0);
        *vertex3 = baseId + vec2<i32>(0, 1);
    }
    
    // 归一化权重
    let total = *w1 + *w2 + *w3;
    *w1 /= total;
    *w2 /= total;
    *w3 /= total;
}

fn hash(p: vec2<i32>) -> vec2<f32> {
    let p_float = vec2<f32>(f32(p.x), f32(p.y));
    
    // 增加混淆矩阵的值以产生更大的偏移
    let m = mat2x2<f32>(
        127.1, 311.7,
        269.5, 183.3
    );

    let sinVal = sin(p_float * m);
    
    // 增加偏移量的缩放因子
    return fract(sinVal * 43758.5453) * 0.3; // 增加偏移强度，原来是没有 * 0.3
}

fn GaussianTransform(uv: vec2<f32>, w1: f32, w2: f32, w3: f32,
    uv1: vec2<f32>, uv2: vec2<f32>, uv3: vec2<f32>) -> vec3<f32> {
    // 首先从原始输入纹理采样
    let I1 = textureSample(input_texture, input_sampler, uv1).rgb;
    let I2 = textureSample(input_texture, input_sampler, uv2).rgb;
    let I3 = textureSample(input_texture, input_sampler, uv3).rgb;

    // 在原始空间中进行混合
    let color = w1 * I1 + w2 * I2 + w3 * I3;

    // 根据边缘距离动态调整高斯变换参数
    let edgeDist = min(min(uv.x, uv.y), min(1.0 - uv.x, 1.0 - uv.y));
    let mu = 0.5;
    // 显著增加sigma范围并使用更大的过渡区域
    let sigma = mix(0.35, 0.12,  // 增加对比度
        smoothBlend(smoothstep(0.0, borderWidth * 3.0, edgeDist)));

    // 对混合结果应用高斯变换
    var G: vec3<f32>;
    G.r = CDF(color.r, mu, sigma);
    G.g = CDF(color.g, mu, sigma);
    G.b = CDF(color.b, mu, sigma);

    // 应用逆变换
    var finalColor: vec3<f32>;
    finalColor.r = invCDF(G.r, mu, sigma);
    finalColor.g = invCDF(G.g, mu, sigma);
    finalColor.b = invCDF(G.b, mu, sigma);

    return finalColor;
}

fn erf(x: f32) -> f32 {
    // 提高误差函数的精度
    let sign = select(-1.0, 1.0, x >= 0.0);
    let abs_x = abs(x);

    let pi = 3.14159265359;
    let a1 = 0.254829592;
    let a2 = -0.284496736;
    let a3 = 1.421413741;
    let a4 = -1.453152027;
    let a5 = 1.061405429;
    let p = 0.3275911;

    let t = 1.0 / (1.0 + p * abs_x);
    let y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * exp(-abs_x * abs_x);

    return sign * y;
}

fn CDF(x: f32, mu: f32, sigma: f32) -> f32 {
    let sqrt_2 = 1.4142135623730951;
    let U = 0.5 * (1.0 + erf((x - mu) / (sigma * sqrt_2)));
    return clamp(U, 0.0, 1.0);
}

fn invCDF(U: f32, mu: f32, sigma: f32) -> f32 {
    let sqrt_2 = 1.4142135623730951;
    let x = sigma * sqrt_2 * erfInv(2.0 * clamp(U, 0.0, 1.0) - 1.0) + mu;
    return clamp(x, 0.0, 1.0);
}

fn erfInv(x: f32) -> f32 {
    let a = 0.147f;
    let sign = select(-1.0, 1.0, x >= 0.0);
    let omx = 1.0 - x * x;

    if omx == 0.0 {
        return sign * 3.4e38; // 近似无穷大
    }

    let ln = log(omx);
    let t = 2.0 / (3.14159 * a) + ln / 2.0;
    return sign * sqrt(-t + sqrt(t * t - ln / a));
}

fn transposeMatrix3x3(m: mat3x3<f32>) -> mat3x3<f32> {
    return mat3x3<f32>(
        vec3<f32>(m[0][0], m[1][0], m[2][0]),
        vec3<f32>(m[0][1], m[1][1], m[2][1]),
        vec3<f32>(m[0][2], m[1][2], m[2][2])
    );
}

fn computeCovarMatrix(color: vec3<f32>) -> mat3x3<f32> {
    let mean = vec3<f32>(0.5);
    let centered = color - mean;
    return mat3x3<f32>(
        vec3<f32>(dot(centered, centered), 0.0, 0.0),
        vec3<f32>(0.0, dot(centered, centered), 0.0),
        vec3<f32>(0.0, 0.0, dot(centered, centered))
    );
}

fn invGaussianTransform(latent: vec3<f32>) -> vec3<f32> {
    let mean = vec3<f32>(0.5);
    let centered = latent - mean;
    
    // 计算协方差矩阵并获取其特征向量
    let covarMatrix = computeCovarMatrix(latent);
    let eigenVectors = transposeMatrix3x3(computeEigenVectors(covarMatrix));
    return eigenVectors * centered + mean;
}

fn gaussianTransform(color: vec3<f32>) -> vec3<f32> {
    let mean = vec3<f32>(0.5);
    let centered = color - mean;
    
    // 计算协方差矩阵
    let covarMatrix = computeCovarMatrix(color);
    
    // 计算特征向量
    let eigenVectors = computeEigenVectors(covarMatrix);
    
    // 应用变换
    return eigenVectors * centered + mean;
}

@compute @workgroup_size(8, 8)
fn computeTransform(@builtin(global_invocation_id) id: vec3<u32>) {
    let dims = textureDimensions(input_texture);
    let uv = vec2<f32>(f32(id.x) / f32(dims.x), f32(id.y) / f32(dims.y));
    
    // 获取输入颜色
    let color = textureLoad(input_texture, vec2<i32>(id.xy), 0).rgb;
    
    // 应用高斯变换
    let latentColor = gaussianTransform(color);
    
    // 存储结果
    textureStore(output_texture, vec2<i32>(id.xy), vec4<f32>(latentColor, 1.0));
}

@compute @workgroup_size(8, 8)
fn computeInverse(@builtin(global_invocation_id) id: vec3<u32>) {
    let dims = textureDimensions(input_texture);
    let uv = vec2<f32>(f32(id.x) / f32(dims.x), f32(id.y) / f32(dims.y));
    
    // 获取潜空间颜色
    let latentColor = textureLoad(input_texture, vec2<i32>(id.xy), 0).rgb;
    
    // 应用逆变换
    let originalColor = invGaussianTransform(latentColor);
    
    // 存储结果
    textureStore(output_texture, vec2<i32>(id.xy), vec4<f32>(originalColor, 1.0));
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    let pos = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(-1.0, 1.0),
        vec2<f32>(-1.0, 1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(1.0, 1.0)
    );

    // UV坐标从[-1,1]转换到[0,1]范围
    let uv = pos[vertexIndex] * vec2<f32>(0.5, 0.5) + vec2<f32>(0.5, 0.5);

    var output: VertexOutput;
    output.position = vec4<f32>(pos[vertexIndex], 0.0, 1.0);
    output.uv = uv;
    return output;
}

fn layeredBlend(dist: f32, color1: vec3<f32>, color2: vec3<f32>, color3: vec3<f32>, width1: f32, width2: f32, width3: f32, centerColor: vec3<f32>) -> vec3<f32> {
    let t1 = pow(smoothstep(0.0, width1, dist), 2.2);
    let t2 = pow(smoothstep(0.0, width2, dist), 2.0);
    let t3 = pow(smoothstep(0.0, width3, dist), 1.8);
    
    var color = mix(color1, centerColor, t1);
    color = mix(color, mix(color2, centerColor, t2), 0.35);
    color = mix(color, mix(color3, centerColor, t3), 0.25);
    return color;
}

fn calculateTileWeight(pos: vec2<f32>, tileSize: vec2<f32>, tileCenter: vec2<f32>) -> f32 {
    // 计算相对于瓦片中心的位置
    let relPos = abs(pos - 0.5 * (tileSize - vec2<f32>(1.0)));
    
    var w: f32;
    if (pos.x >= tileSize.x / 2.0 && pos.x < tileSize.x / 2.0 + tileCenter.x) {
        // 垂直边界
        let w0 = 1.0 - relPos.y / (tileSize.y / 2.0 - 1.0);
        let w1 = 1.0 - w0;
        w = w0 / sqrt(w0 * w0 + w1 * w1);
    } else if (pos.y >= tileSize.y / 2.0 && pos.y < tileSize.y / 2.0 + tileCenter.y) {
        // 水平边界
        let w0 = 1.0 - relPos.x / (tileSize.x / 2.0 - 1.0);
        let w1 = 1.0 - w0;
        w = w0 / sqrt(w0 * w0 + w1 * w1);
    } else {
        // 角落区域
        let temp_pos = vec2<f32>(
            select(pos.x, pos.x - tileCenter.x, pos.x >= tileSize.x / 2.0 + tileCenter.x),
            select(pos.y, pos.y - tileCenter.y, pos.y >= tileSize.y / 2.0 + tileCenter.y)
        );
        
        let lambda = vec2<f32>(
            1.0 - abs(temp_pos.x - 0.5 * (tileSize.x - 1.0)) / (tileSize.x / 2.0 - 1.0),
            1.0 - abs(temp_pos.y - 0.5 * (tileSize.y - 1.0)) / (tileSize.y / 2.0 - 1.0)
        );
        
        let w00 = (1.0 - lambda.x) * (1.0 - lambda.y);
        let w10 = lambda.x * (1.0 - lambda.y);
        let w01 = (1.0 - lambda.x) * lambda.y;
        let w11 = lambda.x * lambda.y;
        
        w = lambda.x * lambda.y / sqrt(w00 * w00 + w10 * w10 + w01 * w01 + w11 * w11);
    }
    
    return w;
}

// 添加高斯特征变换相关函数
fn computeEigenVectors(covarMatrix: mat3x3<f32>) -> mat3x3<f32> {
    // 简化版本的特征向量计算
    let m = covarMatrix;
    var v1 = normalize(vec3<f32>(m[0][0], m[1][0], m[2][0]));
    var v2 = normalize(vec3<f32>(m[0][1], m[1][1], m[2][1]));
    var v3 = normalize(vec3<f32>(m[0][2], m[1][2], m[2][2]));
    return mat3x3<f32>(v1, v2, v3);
}

// 更新瓦片参数计算
fn calculateTileParameters(targetSize: vec2<f32>, borderSize: f32) -> vec4<f32> {
    let tileCountWidth = floor(targetSize.x / borderSize);
    let tileRadiusWidth = borderSize;
    let restWidth = targetSize.x - tileRadiusWidth * tileCountWidth;
    let adjustedTileRadiusWidth = tileRadiusWidth + floor(restWidth / tileCountWidth);
    
    let tileCountHeight = floor(targetSize.y / borderSize);
    let tileRadiusHeight = borderSize;
    let restHeight = targetSize.y - tileRadiusHeight * tileCountHeight;
    let adjustedTileRadiusHeight = tileRadiusHeight + floor(restHeight / tileCountHeight);
    
    return vec4<f32>(adjustedTileRadiusWidth * 2.0, adjustedTileRadiusHeight * 2.0, 
                     tileCountWidth, tileCountHeight);
}

// 更新混合权重计算
fn calculateBlendWeight(pos: vec2<f32>, tileSize: vec2<f32>, center: vec2<f32>) -> f32 {
    if (pos.x >= tileSize.x * 0.5 && pos.x < tileSize.x * 0.5 + center.x) {
        // 垂直边界
        let w0 = 1.0 - floor(abs(pos.y - 0.5 * (tileSize.y - 1.0))) / (tileSize.y * 0.5 - 1.0);
        let w1 = 1.0 - w0;
        return w0 / sqrt(w0 * w0 + w1 * w1);
    } else if (pos.y >= tileSize.y * 0.5 && pos.y < tileSize.y * 0.5 + center.y) {
        // 水平边界
        let w0 = 1.0 - floor(abs(pos.x - 0.5 * (tileSize.x - 1.0))) / (tileSize.x * 0.5 - 1.0);
        let w1 = 1.0 - w0;
        return w0 / sqrt(w0 * w0 + w1 * w1);
    } else {
        // 角落区域
        let temp_pos = vec2<f32>(
            select(pos.x, pos.x - center.x, pos.x >= tileSize.x * 0.5 + center.x),
            select(pos.y, pos.y - center.y, pos.y >= tileSize.y * 0.5 + center.y)
        );
        
        let lambda = vec2<f32>(
            1.0 - floor(abs(temp_pos.x - 0.5 * (tileSize.x - 1.0))) / (tileSize.x * 0.5 - 1.0),
            1.0 - floor(abs(temp_pos.y - 0.5 * (tileSize.y - 1.0))) / (tileSize.y * 0.5 - 1.0)
        );
        
        let w00 = (1.0 - lambda.x) * (1.0 - lambda.y);
        let w10 = lambda.x * (1.0 - lambda.y);
        let w01 = (1.0 - lambda.x) * lambda.y;
        let w11 = lambda.x * lambda.y;
        
        return (lambda.x * lambda.y) / sqrt(w00 * w00 + w10 * w10 + w01 * w01 + w11 * w11);
    }
}

fn hash2D(p: vec2<f32>) -> vec2<f32> {
    var p3 = fract(vec3<f32>(p.xyx) * vec3<f32>(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

fn getTriangleGridDisturbance(uv: vec2<f32>) -> vec2<f32> {
    let gridSize = 32.0;
    let cellSize = 1.0 / gridSize;
    
    // 计算网格坐标
    let cell = floor(uv * gridSize);
    let cellUV = fract(uv * gridSize);
    
    // 生成三角形网格的顶点
    let isUpperTriangle = cellUV.x + cellUV.y > 1.0;
    
    // 计算三个顶点的位置
    var v1 = cell;
    var v2 = cell + select(vec2<f32>(0.0, 1.0), vec2<f32>(1.0, 1.0), isUpperTriangle);
    var v3 = cell + select(vec2<f32>(1.0, 0.0), vec2<f32>(1.0, 1.0), isUpperTriangle);
    
    // 生成随机偏移
    let offset1 = hash2D(v1) * 2.0 - 1.0;
    let offset2 = hash2D(v2) * 2.0 - 1.0;
    let offset3 = hash2D(v3) * 2.0 - 1.0;
    
    // 计算重心坐标
    var barycentric: vec3<f32>;
    if (isUpperTriangle) {
        let p = vec2<f32>(1.0) - cellUV;
        barycentric = vec3<f32>(p.x * p.y, (1.0 - p.x) * p.y, 1.0 - p.y);
    } else {
        barycentric = vec3<f32>(1.0 - cellUV.x - cellUV.y, cellUV.x, cellUV.y);
    }
    
    // 使用重心坐标混合偏移
    let finalOffset = offset1 * barycentric.x + 
                     offset2 * barycentric.y + 
                     offset3 * barycentric.z;
    
    return finalOffset * cellSize;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    let uv = vec2<f32>(fract(input.uv.x), fract(input.uv.y));
    let dims = vec2<f32>(textureDimensions(input_texture));
    let edgeWidth = borderWidth / dims.x;
    
    // 1. 预先采样所有需要的纹素
    let mirrorResult = getMirroredUV(uv, edgeWidth);
    
    // 中心和边缘采样
    let centerSample = textureSample(input_texture, input_sampler, uv).rgb;
    let leftSample = textureSample(input_texture, input_sampler, mirrorResult.uv_left).rgb;
    let rightSample = textureSample(input_texture, input_sampler, mirrorResult.uv_right).rgb;
    let topSample = textureSample(input_texture, input_sampler, mirrorResult.uv_top).rgb;
    let bottomSample = textureSample(input_texture, input_sampler, mirrorResult.uv_bottom).rgb;
    
    // 角落采样
    let topLeftSample = textureSample(input_texture, input_sampler, 
        vec2<f32>(mirrorResult.uv_left.x, mirrorResult.uv_top.y)).rgb;
    let topRightSample = textureSample(input_texture, input_sampler, 
        vec2<f32>(mirrorResult.uv_right.x, mirrorResult.uv_top.y)).rgb;
    let bottomLeftSample = textureSample(input_texture, input_sampler, 
        vec2<f32>(mirrorResult.uv_left.x, mirrorResult.uv_bottom.y)).rgb;
    let bottomRightSample = textureSample(input_texture, input_sampler, 
        vec2<f32>(mirrorResult.uv_right.x, mirrorResult.uv_bottom.y)).rgb;
    
    // 2. 转换到潜空间
    let centerColor = gaussianTransform(centerSample);
    let leftColor = gaussianTransform(leftSample);
    let rightColor = gaussianTransform(rightSample);
    let topColor = gaussianTransform(topSample);
    let bottomColor = gaussianTransform(bottomSample);
    let topLeftColor = gaussianTransform(topLeftSample);
    let topRightColor = gaussianTransform(topRightSample);
    let bottomLeftColor = gaussianTransform(bottomLeftSample);
    let bottomRightColor = gaussianTransform(bottomRightSample);
    
    // 3. 计算混合权重
    let isLeftEdge = uv.x < edgeWidth;
    let isRightEdge = uv.x > 1.0 - edgeWidth;
    let isTopEdge = uv.y < edgeWidth;
    let isBottomEdge = uv.y > 1.0 - edgeWidth;
    
    let leftWeight = select(0.0, smoothstep(0.0, edgeWidth, uv.x), isLeftEdge);
    let rightWeight = select(0.0, smoothstep(0.0, edgeWidth, 1.0 - uv.x), isRightEdge);
    let topWeight = select(0.0, smoothstep(0.0, edgeWidth, uv.y), isTopEdge);
    let bottomWeight = select(0.0, smoothstep(0.0, edgeWidth, 1.0 - uv.y), isBottomEdge);
    
    // 4. 混合计算
    var blendedLatent = centerColor;
    
    // 边缘混合
    blendedLatent = select(
        blendedLatent,
        mix(leftColor, centerColor, leftWeight),
        isLeftEdge
    );
    blendedLatent = select(
        blendedLatent,
        mix(rightColor, centerColor, rightWeight),
        isRightEdge
    );
    blendedLatent = select(
        blendedLatent,
        mix(topColor, blendedLatent, topWeight),
        isTopEdge
    );
    blendedLatent = select(
        blendedLatent,
        mix(bottomColor, blendedLatent, bottomWeight),
        isBottomEdge
    );
    
    // 角落混合
    let cornerWeight = vec4<f32>(
        select(0.0, min(leftWeight, topWeight), isLeftEdge && isTopEdge),
        select(0.0, min(rightWeight, topWeight), isRightEdge && isTopEdge),
        select(0.0, min(leftWeight, bottomWeight), isLeftEdge && isBottomEdge),
        select(0.0, min(rightWeight, bottomWeight), isRightEdge && isBottomEdge)
    );
    
    blendedLatent = select(blendedLatent, mix(topLeftColor, blendedLatent, cornerWeight.x), cornerWeight.x > 0.0);
    blendedLatent = select(blendedLatent, mix(topRightColor, blendedLatent, cornerWeight.y), cornerWeight.y > 0.0);
    blendedLatent = select(blendedLatent, mix(bottomLeftColor, blendedLatent, cornerWeight.z), cornerWeight.z > 0.0);
    blendedLatent = select(blendedLatent, mix(bottomRightColor, blendedLatent, cornerWeight.w), cornerWeight.w > 0.0);
    
    // 5. 应用扰动
    let edgeInfluence = 1.0 - max(max(leftWeight, rightWeight), max(topWeight, bottomWeight));
    let disturbance = getTriangleGridDisturbance(uv) * edgeInfluence;
    blendedLatent += vec3<f32>(disturbance.x, disturbance.y, 0.0) * 0.1;
    
    // 6. 转换回原始空间
    let finalColor = invGaussianTransform(blendedLatent);
    
    return vec4<f32>(finalColor, 1.0);
}

