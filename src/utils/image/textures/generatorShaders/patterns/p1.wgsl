// 结构体定义
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) texCoord: vec2f,
};

struct Uniforms {
    // 视口信息
    viewport: vec4f,      // x, y, width, height
    // 晶格基向量
    basis1: vec2f,
    basis2: vec2f,
    // 变换参数
    nodeTransform: vec4f, // scale, rotation, translateX, translateY
    fillTransform: vec4f, // scale, rotation, translateX, translateY
    // 渲染参数
    gridColor: vec4f,     // 网格线颜色
    backgroundColor: vec4f,
    showGrid: u32,        // 是否显示网格
    gridLineWidth: f32,   // 网格线宽度
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var nodeSampler: sampler;
@group(0) @binding(2) var nodeTexture: texture_2d<f32>;
@group(0) @binding(3) var fillSampler: sampler;
@group(0) @binding(4) var fillTexture: texture_2d<f32>;

// 顶点着色器
@vertex
fn vertexMain(@location(0) position: vec2f,
              @location(1) texCoord: vec2f) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4f(position, 0.0, 1.0);
    output.texCoord = texCoord;
    return output;
}

// 工具函数：2D旋转矩阵
fn rotate2D(angle: f32) -> mat2x2f {
    let s = sin(angle);
    let c = cos(angle);
    return mat2x2f(c, -s, s, c);
}

// 工具函数：检查点是否在网格线上
fn isOnGridLine(pos: vec2f, lineWidth: f32) -> bool {
    // 计算点在晶格坐标系中的位置
    let invBasis = mat2x2f(
        uniforms.basis2.y, -uniforms.basis2.x,
        -uniforms.basis1.y, uniforms.basis1.x
    ) / (uniforms.basis1.x * uniforms.basis2.y - uniforms.basis1.y * uniforms.basis2.x);
    
    let latticeCoords = invBasis * pos;
    
    // 检查是否在网格线上
    let fracX = fract(latticeCoords.x);
    let fracY = fract(latticeCoords.y);
    
    return fracX < lineWidth || fracX > (1.0 - lineWidth) ||
           fracY < lineWidth || fracY > (1.0 - lineWidth);
}

// 工具函数：应用图像变换
fn applyTransform(pos: vec2f, transform: vec4f) -> vec2f {
    let scale = transform.x;
    let rotation = transform.y;
    let translate = transform.zw;
    
    // 应用变换
    var transformedPos = pos;
    transformedPos = rotate2D(rotation) * transformedPos;
    transformedPos = transformedPos * scale;
    transformedPos = transformedPos + translate;
    
    return transformedPos;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    // 将纹理坐标转换为视口空间坐标
    let viewportPos = input.texCoord * uniforms.viewport.zw + uniforms.viewport.xy;
    
    // 初始化输出颜色为背景色
    var color = uniforms.backgroundColor;
    
    // 计算在晶格中的位置
    let latticePos = viewportPos;
    
    // 绘制填充图案
    let fillPos = applyTransform(latticePos, uniforms.fillTransform);
    let fillColor = textureSample(fillTexture, fillSampler, fillPos);
    color = mix(color, fillColor, fillColor.a);
    
    // 绘制网格线
    if (uniforms.showGrid != 0u && isOnGridLine(latticePos, uniforms.gridLineWidth)) {
        color = mix(color, uniforms.gridColor, uniforms.gridColor.a);
    }
    
    // 绘制晶格点图案
    let nodePos = applyTransform(latticePos, uniforms.nodeTransform);
    let nodeColor = textureSample(nodeTexture, nodeSampler, nodePos);
    color = mix(color, nodeColor, nodeColor.a);
    
    return color;
}