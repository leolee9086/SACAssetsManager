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
    // 使用更平滑的过渡函数
    let x2 = x * x;
    let x4 = x2 * x2;
    let x6 = x4 * x2;
    return x6 * (x * (x * (-3.0 * x + 35.0) - 70.0) + 35.0);
}

fn remapValue(value: f32, low1: f32, high1: f32, low2: f32, high2: f32) -> f32 {
    return low2 + (value - low1) * (high2 - low2) / (high1 - low1);
}

fn getEdgeWeight(dist: f32, edgeWidth: f32) -> f32 {
    // 使用双重平滑步进确保边缘更柔和
    let t = clamp(dist / edgeWidth, 0.0, 1.0);
    return smoothBlend(smoothBlend(t));
}

fn getMirroredUV(uv: vec2<f32>, edgeWidth: f32) -> MirrorUV {
    var result: MirrorUV;
    
    // 正确的镜像计算
    // 对于左边界：将 x 坐标关于 x=0 进行镜像
    result.uv_left = vec2<f32>(-uv.x, uv.y);
    
    // 对于右边界：将 x 坐标关于 x=1 进行镜像
    result.uv_right = vec2<f32>(2.0 - uv.x, uv.y);
    
    // 对于上边界：将 y 坐标关于 y=0 进行镜像
    result.uv_top = vec2<f32>(uv.x, -uv.y);
    
    // 对于下边界：将 y 坐标关于 y=1 进行镜像
    result.uv_bottom = vec2<f32>(uv.x, 2.0 - uv.y);
    
    // 确保所有坐标都在[0,1]范围内
    result.uv_left = fract(result.uv_left);
    result.uv_right = fract(result.uv_right);
    result.uv_top = fract(result.uv_top);
    result.uv_bottom = fract(result.uv_bottom);
    
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
    var w = 0.0;
    
    if (pos.x >= tileSize.x / 2.0 && pos.x < tileSize.x / 2.0 + tileCenter.x) {
        // 垂直边界
        let w0 = 1.0 - floor(abs(pos.y - 0.5 * (tileSize.y - 1.0))) / (tileSize.y / 2.0 - 1.0);
        let w1 = 1.0 - w0;
        w = w0 / sqrt(w0 * w0 + w1 * w1);
    } else if (pos.y >= tileSize.y / 2.0 && pos.y < tileSize.y / 2.0 + tileCenter.y) {
        // 水平边界
        let w0 = 1.0 - floor(abs(pos.x - 0.5 * (tileSize.x - 1.0))) / (tileSize.x / 2.0 - 1.0);
        let w1 = 1.0 - w0;
        w = w0 / sqrt(w0 * w0 + w1 * w1);
    } else {
        // 角落区域
        let temp_pos = vec2<f32>(
            select(pos.x, pos.x - tileCenter.x, pos.x >= tileSize.x / 2.0 + tileCenter.x),
            select(pos.y, pos.y - tileCenter.y, pos.y >= tileSize.y / 2.0 + tileCenter.y)
        );
        
        let lambda = vec2<f32>(
            1.0 - floor(abs(temp_pos.x - 0.5 * (tileSize.x - 1.0))) / (tileSize.x / 2.0 - 1.0),
            1.0 - floor(abs(temp_pos.y - 0.5 * (tileSize.y - 1.0))) / (tileSize.y / 2.0 - 1.0)
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
fn calculateTileParameters(uv: vec2<f32>) -> vec4<f32> {
    let dims = vec2<f32>(textureDimensions(input_texture));
    let borderSize = 128.0;  // 基础边界大小
    
    let tileCountWidth = floor(dims.x / borderSize);
    let tileRadiusWidth = borderSize;
    let restWidth = dims.x - tileRadiusWidth * tileCountWidth;
    let adjustedTileRadiusWidth = tileRadiusWidth + floor(restWidth / tileCountWidth);
    
    let tileCountHeight = floor(dims.y / borderSize);
    let tileRadiusHeight = borderSize;
    let restHeight = dims.y - tileRadiusHeight * tileCountHeight;
    let adjustedTileRadiusHeight = tileRadiusHeight + floor(restHeight / tileCountHeight);
    
    return vec4<f32>(
        adjustedTileRadiusWidth * 2.0 / dims.x,  // tileWidth
        adjustedTileRadiusHeight * 2.0 / dims.y,  // tileHeight
        tileCountWidth,
        tileCountHeight
    );
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
    // 使用更大的网格尺寸来创建更大块的扰动
    let gridSize = vec2<f32>(8.0, 6.0); // 减少网格数量，增加每个三角形的大小
    let cellSize = 1.0 / gridSize;
    
    // 减小时间变化的扰动强度，使其更加柔和
    let timeOffset = vec2<f32>(sin(uv.x * 3.141) * 0.05, cos(uv.y * 3.141) * 0.05);
    let distortedUV = uv + timeOffset;
    
    let cell = floor(distortedUV * gridSize);
    let cellUV = fract(distortedUV * gridSize);
    
    let isUpperTriangle = cellUV.x + cellUV.y > 1.0;
    
    var v1 = cell;
    var v2 = cell + select(vec2<f32>(0.0, 1.0), vec2<f32>(1.0, 1.0), isUpperTriangle);
    var v3 = cell + select(vec2<f32>(1.0, 0.0), vec2<f32>(1.0, 1.0), isUpperTriangle);
    
    // 减小随机偏移的强度
    let noise1 = hash2D(v1 + timeOffset);
    let noise2 = hash2D(v2 - timeOffset);
    let noise3 = hash2D(v3 * 1.5);
    
    // 调整偏移的方向和强度
    let offset1 = (noise1 * 2.0 - 1.0) * vec2<f32>(0.8, 0.6);
    let offset2 = (noise2 * 2.0 - 1.0) * vec2<f32>(0.6, 0.8);
    let offset3 = (noise3 * 2.0 - 1.0) * vec2<f32>(0.7, 0.7);
    
    // 使用更平滑的重心坐标计算
    var barycentric: vec3<f32>;
    if (isUpperTriangle) {
        let p = vec2<f32>(1.0) - cellUV;
        barycentric = vec3<f32>(
            pow(smoothstep(0.0, 1.0, p.x * p.y), 3.0),
            pow(smoothstep(0.0, 1.0, (1.0 - p.x) * p.y), 3.0),
            pow(smoothstep(0.0, 1.0, 1.0 - p.y), 3.0)
        );
    } else {
        barycentric = vec3<f32>(
            pow(smoothstep(0.0, 1.0, 1.0 - cellUV.x - cellUV.y), 3.0),
            pow(smoothstep(0.0, 1.0, cellUV.x), 3.0),
            pow(smoothstep(0.0, 1.0, cellUV.y), 3.0)
        );
    }
    
    // 归一化重心坐标
    let sum = barycentric.x + barycentric.y + barycentric.z;
    barycentric = barycentric / sum;
    
    let finalOffset = offset1 * barycentric.x + 
                     offset2 * barycentric.y + 
                     offset3 * barycentric.z;
    
    return finalOffset * cellSize;
}

fn getRandomOffset(seed: vec2<f32>) -> vec2<f32> {
    let noise = hash2D(seed);
    return (noise * 2.0 - 1.0) * 0.02; // 增加随机偏移强度
}

fn calculateWeight(pos: vec2<f32>, tileSize: vec2<f32>, tileCenter: vec2<f32>) -> f32 {
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

fn applyBorderBlending(uv: vec2<f32>, color: vec3<f32>, borderSize: f32) -> vec3<f32> {
    let dims = vec2<f32>(textureDimensions(input_texture));
    
    // 计算边界权重，与 JS 版本的 applyBorderBlending 保持一致
    var w = min(remapValue(uv.x * dims.x, 0.0, borderSize, 0.0, 1.0), 1.0); // 左边界
    w *= min(remapValue(uv.x * dims.x, dims.x - 1.0, dims.x - 1.0 - borderSize, 0.0, 1.0), 1.0); // 右边界
    w *= min(remapValue(uv.y * dims.y, 0.0, borderSize, 0.0, 1.0), 1.0); // 上边界
    w *= min(remapValue(uv.y * dims.y, dims.y - 1.0, dims.y - 1.0 - borderSize, 0.0, 1.0), 1.0); // 下边界
    
    let w_inv = 1.0 - w;
    w = w / sqrt(w * w + w_inv * w_inv);
    
    return color * w;
}

fn calculateTileCenterAndOffset(i_tile: f32, j_tile: f32, tileParams: vec4<f32>) -> vec4<f32> {
    let tileCountWidth = tileParams.z;
    let tileCountHeight = tileParams.w;
    
    var tileCenterWidth = 0.0;
    var tileCenterHeight = 0.0;
    var cumulativeOffsetWidth = 0.0;
    var cumulativeOffsetHeight = 0.0;
    
    if (i_tile > tileCountWidth - 2.0) {
        tileCenterWidth = 1.0;
        cumulativeOffsetWidth = (i_tile - 1.0) - (tileCountWidth - 2.0);
    } else if (j_tile > tileCountHeight - 2.0) {
        tileCenterHeight = 1.0;
        cumulativeOffsetHeight = (j_tile - 1.0) - (tileCountHeight - 2.0);
    }
    
    return vec4<f32>(tileCenterWidth, tileCenterHeight, cumulativeOffsetWidth, cumulativeOffsetHeight);
}

fn customModulo(x: f32, n: f32) -> f32 {
    var r = x % n;
    if (r < 0.0) {
        r += n;
    }
    return r;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    let dims = vec2<f32>(textureDimensions(input_texture));
    let borderSize = 128.0;
    let tileParams = calculateTileParameters(input.uv);
    
    // 首先应用边界混合
    let color = textureSample(input_texture, input_sampler, input.uv).rgb;
    let gaussianColor = gaussianTransform(color);
    var outputColor = vec3<f32>(0.0);
    var totalWeight = 0.0;
    
    // 添加边界混合的贡献
    let borderWeight = applyBorderBlending(input.uv, vec3<f32>(1.0), borderSize).x;
    outputColor += gaussianColor * borderWeight;
    totalWeight += borderWeight;
    
    // 计算瓦片参数
    let tileSize = vec2<f32>(tileParams.x * dims.x, tileParams.y * dims.y);
    let tileCount = vec2<f32>(tileParams.z, tileParams.w);
    
    // 遍历瓦片进行混合
    for (var c = -1; c < i32(tileCount.x - 1.0 + tileCount.y - 1.0); c = c + 1) {
        let i_tile = f32(select(c, -1, c >= i32(tileCount.x - 1.0)));
        let j_tile = f32(select(-1, c - i32(tileCount.x - 1.0), c >= i32(tileCount.x - 1.0)));
        
        let tileInfo = calculateTileCenterAndOffset(i_tile, j_tile, tileParams);
        let tileCenterWidth = tileInfo.x;
        let tileCenterHeight = tileInfo.y;
        let cumulativeOffsetWidth = tileInfo.z;
        let cumulativeOffsetHeight = tileInfo.w;
        
        // 生成随机偏移
        let seed = vec2<f32>(f32(c), f32(c * 31 + 17));
        let randOffset = hash2D(seed);
        let offset = vec2<f32>(
            floor((dims.x - (tileSize.x + tileCenterWidth)) * randOffset.x),
            floor((dims.y - (tileSize.y + tileCenterHeight)) * randOffset.y)
        );
        
        // 计算当前像素在瓦片中的位置
        let pixelPos = vec2<f32>(
            customModulo(input.uv.x * dims.x - i_tile * tileSize.x / 2.0 - cumulativeOffsetWidth, dims.x),
            customModulo(input.uv.y * dims.y - j_tile * tileSize.y / 2.0 - cumulativeOffsetHeight, dims.y)
        );
        
        // 计算权重和偏移采样
        let w = calculateTileWeight(pixelPos, tileSize, vec2<f32>(tileCenterWidth, tileCenterHeight));
        let isInTile = (pixelPos.x < tileSize.x + tileCenterWidth && 
                       pixelPos.y < tileSize.y + tileCenterHeight);
        
        // 采样偏移位置
        let offsetUV = vec2<f32>(
            customModulo(pixelPos.x + offset.x, dims.x) / dims.x,
            customModulo(pixelPos.y + offset.y, dims.y) / dims.y
        );
        
        let offsetColor = gaussianTransform(
            textureSample(input_texture, input_sampler, offsetUV).rgb
        );
        
        // 使用 select 替代 if 语句
        let validWeight = select(0.0, w, isInTile && w > 0.0);
        outputColor += offsetColor * validWeight;
        totalWeight += validWeight;
    }
    
    // 使用 select 替代 if 语句进行归一化
    outputColor = select(gaussianColor, outputColor / totalWeight, totalWeight > 0.0);
    
    // 转换回原始颜色空间
    return vec4<f32>(invGaussianTransform(outputColor), 1.0);
}

