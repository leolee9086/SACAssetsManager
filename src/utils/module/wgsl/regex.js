// WGSL 导入语法的正则表达式
export const WGSL_IMPORT_REGEX = /#import\s*{([^}]+)}\s*from\s*['"]([^'"]+)['"]\s*;?/gm;
export const WGSL_EXPORT_REGEX = /@export\s*([^;]+)/g;
export const WGSL_FUNCTION_REGEX = /fn\s+(\w+)/;
export const WGSL_CONSTANT_REGEX = /(f32|i32|u32|bool)\s+(\w+)/;
export const buildConstRegex = (constantName) => {
    return new RegExp(
        `(?:@export\\s+)?const\\s+${constantName}\\s*:\\s*f32\\s*=\\s*[^;]+;`,
        'gm'
    );
}
export const buildFnRegex = (functionName) => {
    return new RegExp(
        `(?:@export\\s+)?fn\\s+${functionName}\\s*\\([^{]*\\{[^}]*\\}`,
        'gm'
    );
}