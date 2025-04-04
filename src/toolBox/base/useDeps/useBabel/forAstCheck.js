/**
 * 检查AST节点是否包含特定类型的节点
 * @param {Object} ast - AST语法树
 * @param {string} nodeType - 要查找的节点类型
 * @returns {boolean} 是否包含该类型节点
 */
export const hasNodeType = (ast, nodeType) => {
    let found = false;
    parser.traverse(ast, {
        [nodeType]() {
            found = true;
            this.stop();
        }
    });
    return found;
}

