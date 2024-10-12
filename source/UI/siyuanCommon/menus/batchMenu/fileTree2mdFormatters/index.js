
/**
 * 生成Markdown内容
 * @param {Array} tree - 树结构
 * @param {number} depth - 当前深度
 * @returns {string} Markdown内容
 */
export const 从文件树生成markdown列表 = (tree, depth = 0) => {
    let content = '';
    for (const node of tree) {
        const indent = '    '.repeat(depth);
        const icon = node.isDirectory ? '📁' : '📄';
        const size = node.isDirectory ? '' : ` (${node.size} bytes)`;
        const mtime = node.mtime.toISOString().split('T')[0];
        const absolutePath = node.path.replace(/\\/g, '/');
        const linkText = node.isDirectory ? node.name : `[${node.name}](file:///${encodeURI(absolutePath)})`;
        
        content += `${indent}- ${icon} ${linkText}${size} - 修改日期: ${mtime}\n`;

        if (node.children) {
            content += 从文件树生成markdown列表(node.children, depth + 1);
        }
    }
    return content;
};
/**
 * 生成Markdown段落内容
 * @param {Array} tree - 树结构
 * @returns {string} Markdown段落内容
 */
export const 从文件树生成markdown段落 = (tree) => {
    let content = '';
    for (const node of tree) {
        const icon = node.isDirectory ? '📁' : '📄';
        const size = node.isDirectory ? '' : ` (${node.size} bytes)`;
        const mtime = node.mtime.toISOString().split('T')[0];
        const absolutePath = node.path.replace(/\\/g, '/');
        const linkText = node.isDirectory ? node.name : `[${node.name}](file:///${encodeURI(absolutePath)})`;
        
        content += `${icon} ${linkText}${size} - 修改日期: ${mtime}\n\n`;

        if (node.children) {
            content += 从文件树生成markdown段落(node.children);
        }
    }
    return content;
};