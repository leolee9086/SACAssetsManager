/**
 * 获取数据类型的默认值
 * @param {string} type - 数据类型
 * @returns {number|number[]} 默认值
 */
export function getDefaultValue(type) {
    switch (type) {
        case 'f32': return 0.0;
        case 'i32': return 0;
        case 'vec4f': return [1, 1, 1, 1];
        case 'vec3f': return [0, 0, 0];
        case 'vec2f': return [0, 0];
        default: return 0;
    }
}

/**
 * 准备 GPU Uniform 数据
 * @param {Object} uniformLayout - uniform 布局定义
 * @param {Object} params - 参数值
 * @returns {Float32Array} 处理后的 uniform 数据
 */
export function prepareUniformData(uniformLayout, params = {}) {
    const bufferData = [];
    
    console.log('\n=== GPU Uniform 参数传递分析 ===');
    console.log('原始参数:', params);
    
    let reconstructedParams = {};
    let currentOffset = 0;
    
    for (const [name, type] of Object.entries(uniformLayout)) {
        const value = params[name] ?? getDefaultValue(type);
        
        console.log(`\n字段: ${name}`);
        console.log(`类型: ${type}`);
        console.log(`偏移: ${currentOffset}字节`);
        console.log(`原始值:`, value);
        
        // 处理显式填充字段
        if (name.startsWith('_pad')) {
            if (type === 'vec4f') {
                bufferData.push(0.0, 0.0, 0.0, 0.0);
                currentOffset += 16;
            } else if (type === 'vec2f') {
                bufferData.push(0.0, 0.0);
                currentOffset += 8;
            } else if (type === 'f32') {
                bufferData.push(0.0);
                currentOffset += 4;
            }
            console.log(`填充字段: ${name}, 大小: ${currentOffset - (bufferData.length - 1) * 4}字节`);
            continue;
        }

        // 处理实际数据字段
        switch (type) {
            case 'vec4f': {
                const color = Array.isArray(value) ? value : [0, 0, 0, 1];
                if (color.length < 4) color.push(1);
                bufferData.push(...color);
                reconstructedParams[name] = [...color];
                currentOffset += 16;
                break;
            }
            case 'vec3f': {
                const vec = Array.isArray(value) ? value : [0, 0, 0];
                bufferData.push(...vec);
                reconstructedParams[name] = [...vec];
                currentOffset += 12;
                break;
            }
            case 'vec2f': {
                const vec = Array.isArray(value) ? value : [0, 0];
                bufferData.push(...vec);
                reconstructedParams[name] = [...vec];
                currentOffset += 8;
                break;
            }
            case 'f32': {
                bufferData.push(value);
                reconstructedParams[name] = value;
                currentOffset += 4;
                break;
            }
            case 'i32': {
                bufferData.push(value);
                reconstructedParams[name] = value;
                currentOffset += 4;
                break;
            }
        }
        
        console.log(`写入值:`, reconstructedParams[name]);
        console.log(`当前偏移: ${currentOffset}`);
    }
    
    // 确保最终大小是16的倍数
    const finalSize = Math.ceil(currentOffset / 16) * 16;
    if (finalSize > currentOffset) {
        const paddingSize = (finalSize - currentOffset) / 4;
        for (let i = 0; i < paddingSize; i++) {
            bufferData.push(0.0);
        }
        console.log(`添加末尾填充: ${finalSize - currentOffset}字节`);
    }
    
    console.log('\n=== 最终数据 ===');
    console.log('Buffer 大小:', finalSize, '字节');
    console.log('数据项数:', bufferData.length);
    
    return new Float32Array(bufferData);
} 