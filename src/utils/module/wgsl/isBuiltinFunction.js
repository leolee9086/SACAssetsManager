// 新增：判断是否为 WGSL 内置函数
export function isBuiltinFunction(fnName) {
    const builtins = new Set([
        // 数学函数
        'abs', 'acos', 'acosh', 'asin', 'asinh', 'atan', 'atan2', 'atanh',
        'ceil', 'clamp', 'cos', 'cosh', 'cross', 'degrees',
        'distance', 'exp', 'exp2', 'floor', 'fma', 'fract',
        'inverseSqrt', 'length', 'log', 'log2',
        'max', 'min', 'mix', 'modf', 'pow',
        'radians', 'round', 'sign', 'sin', 'sinh',
        'smoothstep', 'sqrt', 'step', 'tan', 'tanh',
        'trunc', 'dot', 'normalize',

        // 向量操作
        'dot', 'cross', 'normalize', 'reflect', 'refract',
        'length', 'distance', 'faceForward',

        // 矩阵操作
        'transpose', 'determinant', 'inverse',

        // 纹理采样相关
        'textureSample', 'textureSampleLevel', 'textureSampleGrad',
        'textureSampleCompare', 'textureLoad', 'textureStore',
        'textureDimensions', 'textureNumLevels', 'textureNumLayers',
        'textureNumSamples',

        // 数据类型转换
        'bitcast', 'vec2', 'vec3', 'vec4',
        'mat2x2', 'mat2x3', 'mat2x4',
        'mat3x2', 'mat3x3', 'mat3x4',
        'mat4x2', 'mat4x3', 'mat4x4',

        // 整数数学
        'countOneBits', 'reverseBits', 'firstLeadingBit', 'firstTrailingBit',
        'insertBits', 'extractBits',

        // 原子操作
        'atomicLoad', 'atomicStore', 'atomicAdd', 'atomicSub',
        'atomicMin', 'atomicMax', 'atomicAnd', 'atomicOr', 'atomicXor',
        'atomicExchange', 'atomicCompareExchangeWeak',

        // 同步和内存屏障
        'storageBarrier', 'workgroupBarrier',

        // 工作组和衍生函数
        'workgroupUniformLoad',
        'dpdx', 'dpdy', 'fwidth',
        'dpdxCoarse', 'dpdyCoarse', 'fwidthCoarse',
        'dpdxFine', 'dpdyFine', 'fwidthFine',

        // 数组和缓冲区操作
        'arrayLength',

        // 包装和解包
        'pack2x16float', 'pack2x16snorm', 'pack2x16unorm',
        'pack4x8snorm', 'pack4x8unorm',
        'unpack2x16float', 'unpack2x16snorm', 'unpack2x16unorm',
        'unpack4x8snorm', 'unpack4x8unorm',

        // 其他工具函数
        'select', 'all', 'any', 'saturate'
    ]);
    
    return builtins.has(fnName);
}
