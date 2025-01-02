/**
 * 解析 WGSL 着色器代码中的 uniform 绑定
 * @param {string} wgslCode - WGSL 着色器代码
 * @returns {Object} uniform 定义对象
 */
export function parseWGSLUniformBindings(wgslCode) {
    if (!wgslCode || typeof wgslCode !== 'string') {
        return {};
    }

    const uniforms = {};
    
    // 查找所有的 uniform 变量声明
    const uniformRegex = /@group\((\d+)\)\s+@binding\((\d+)\)\s+var<uniform>\s+(\w+)\s*:\s*(\w+)/g;
    const matches = [...wgslCode.matchAll(uniformRegex)];

    for (const match of matches) {
        const [, group, binding, varName, structName] = match;
        // 查找对应的结构体定义
        const structDef = extractStruct(wgslCode, structName);
        if (structDef) {
            uniforms[varName] = {
                group: parseInt(group),
                binding: parseInt(binding),
                struct: structName,
                fields: parseStructFields(structDef)
            };
        }
    }

    return uniforms;
}

/**
 * 提取结构体定义
 * @private
 */
function extractStruct(wgslCode, structName) {
    const structRegex = new RegExp(`struct\\s+${structName}\\s*{([^}]+)}`);
    const match = wgslCode.match(structRegex);
    return match ? match[1] : null;
}

/**
 * 解析结构体字段
 * @private
 */
function parseStructFields(structDef) {
    const fields = {};
    const lines = structDef.split(/\r?\n/);
    
    for (const line of lines) {
        const codeLine = removeComments(line).trim();
        if (!codeLine) continue;

        const match = codeLine.match(/(\w+)\s*:\s*([\w\d_<>\[\]]+)/);
        if (!match) continue;

        const [, name, type] = match;
        fields[name] = convertWGSLType(type);
    }

    return fields;
}

/**
 * 转换 WGSL 类型到我们的类型系统
 * @private
 */
function convertWGSLType(wgslType) {
    const typeMap = {
        'f32': 'f32',
        'i32': 'i32',
        'u32': 'u32',
        'vec2f': 'vec2f',
        'vec2<f32>': 'vec2f',
        'vec3f': 'vec3f',
        'vec3<f32>': 'vec3f',
        'vec4f': 'vec4f',
        'vec4<f32>': 'vec4f',
        'mat2x2f': 'mat2x2f',
        'mat2x2<f32>': 'mat2x2f',
        'mat3x3f': 'mat3x3f',
        'mat3x3<f32>': 'mat3x3f',
        'mat4x4f': 'mat4x4f',
        'mat4x4<f32>': 'mat4x4f',
        'array<f32>': 'array_f32'
    };

    // 处理数组类型
    const arrayMatch = wgslType.match(/array<(.+)>/);
    if (arrayMatch) {
        const baseType = convertWGSLType(arrayMatch[1]);
        return `array_${baseType}`;
    }

    return typeMap[wgslType] || 'unknown';
}

function removeComments(line) {
    return line.replace(/\/\*.*?\*\//g, '').split('//')[0];
}