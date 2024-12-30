// 解析绑定的正则表达式
const BINDING_REGEX = /@group\((\d+)\)\s+@binding\((\d+)\)\s+var\s+(\w+)\s*:\s*([^;]+)/g;
const STRUCT_REGEX = /struct\s+(\w+)\s*\{([^}]+)\}/g;

/**
 * 解析 WGSL 代码中的绑定信息
 * @param {string} wgslCode - WGSL 源代码
 * @returns {Array<{
 *   group: number,
 *   binding: number,
 *   name: string,
 *   type: string,
 *   structDetails?: {
 *     name: string,
 *     fields: Array<{name: string, type: string}>
 *   }
 * }>}
 */
export function parseWGSLBindings(wgslCode) {
    // 存储所有结构体定义
    const structs = new Map();
    // 存储所有绑定
    const bindings = [];

    // 首先解析所有结构体定义
    let structMatch;
    while ((structMatch = STRUCT_REGEX.exec(wgslCode)) !== null) {
        const [_, structName, fieldsStr] = structMatch;
        const fields = fieldsStr
            .split(',')
            .map(field => field.trim())
            .filter(field => field.length > 0)
            .map(field => {
                const [name, type] = field.split(':').map(s => s.trim());
                return { name, type };
            });

        structs.set(structName, {
            name: structName,
            fields
        });
    }

    // 然后解析所有绑定
    let bindingMatch;
    while ((bindingMatch = BINDING_REGEX.exec(wgslCode)) !== null) {
        const [_, group, binding, name, type] = bindingMatch;
        
        const bindingInfo = {
            group: parseInt(group),
            binding: parseInt(binding),
            name,
            type: type.trim()
        };

        // 如果绑定类型是一个已知的结构体，添加结构体详情
        const structName = type.replace(/^(?:uniform\s+)?(?:<\s*)?(\w+)(?:\s*>)?.*$/, '$1');
        if (structs.has(structName)) {
            bindingInfo.structDetails = structs.get(structName);
        }

        bindings.push(bindingInfo);
    }

    return bindings;
}

/**
 * 使用示例：
 * 
 * const wgslCode = `
 *   struct GradientParams {
 *       color1: vec4f,
 *       color2: vec4f,
 *       angle: f32,
 *       offset: f32,
 *       _padding: vec2f
 *   }
 *   @group(0) @binding(0) var output: texture_storage_2d<rgba8unorm, write>;
 *   @group(0) @binding(1) var<uniform> params: GradientParams;
 * `;
 * 
 * const bindings = parseWGSLBindings(wgslCode);
 * // 返回结果示例:
 * // [
 * //   {
 * //     group: 0,
 * //     binding: 0,
 * //     name: "output",
 * //     type: "texture_storage_2d<rgba8unorm, write>"
 * //   },
 * //   {
 * //     group: 0,
 * //     binding: 1,
 * //     name: "params",
 * //     type: "GradientParams",
 * //     structDetails: {
 * //       name: "GradientParams",
 * //       fields: [
 * //         { name: "color1", type: "vec4f" },
 * //         { name: "color2", type: "vec4f" },
 * //         { name: "angle", type: "f32" },
 * //         { name: "offset", type: "f32" },
 * //         { name: "_padding", type: "vec2f" }
 * //       ]
 * //     }
 * //   }
 * // ]
 */