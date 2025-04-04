/**
 * 从AST节点中提取所有导入声明
 * @param {Object} ast - AST语法树
 * @returns {Array} 返回所有导入声明节点数组
 */
export const extractImports = (ast) => {
    return ast.program.body.filter(node => node.type === 'ImportDeclaration');
}
/**
 * 从AST节点中提取所有导出声明
 * @param {Object} ast - AST语法树
 * @returns {Array} 返回所有导出声明节点数组
 */
export const extractExports = (ast) => {
    return ast.program.body.filter(node => 
        node.type === 'ExportNamedDeclaration' || 
        node.type === 'ExportDefaultDeclaration' ||
        node.type === 'ExportAllDeclaration'
    );
}
