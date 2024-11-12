import * as parser from '../../../../static/@babel_parser.js'
import traverse from '../../../../static/@babel/traverse.js'

/**
 * 解析 JSDoc 注释
 * @param {string} code 源代码
 * @param {string} exportName 导出函数名
 * @returns {Object} 解析后的配置
 */
export function parseJSDocConfig(code, exportName) {
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });
  
    let docConfig = {
      inputTypes: {},
      outputTypes: {},
      defaultValues: {}
    };
    docConfig.name=exportName
    // 遍历 AST 寻找目标导出函数
    traverse(ast, {
      ExportNamedDeclaration(path) {
        const declaration = path.node.declaration;

        if (declaration && (
            // 普通函数声明
            (declaration.type === 'FunctionDeclaration' && declaration.id.name === exportName) ||
            // 箭头函数声明
            (declaration.type === 'VariableDeclaration' && 
             declaration.declarations[0].id.name === exportName &&
             declaration.declarations[0].init.type === 'ArrowFunctionExpression')
        )) {
          const comments = path.node.leadingComments;
          if (!comments) return;
          // 解析 JSDoc 注释
          const docComment = comments[0].value;
          const lines = docComment.split('\n');
          
          lines.forEach(line => {
            // 解析 @param
            const paramMatch = line.match(/@param\s+{([^}]+)}\s+([^\s]+)\s*(.*)/);
            if (paramMatch) {
              const [, type, name, description] = paramMatch;
              const cleanName = name.replace(/^\w+\./, ''); // 移除可能的前缀
              docConfig.inputTypes[cleanName] = type;
              
              // 检查默认值
              const defaultMatch = description.match(/\[default:\s*([^\]]+)\]/);
              if (defaultMatch) {
                try {
                  docConfig.defaultValues[cleanName] = JSON.parse(defaultMatch[1]);
                } catch (e) {
                  docConfig.defaultValues[cleanName] = defaultMatch[1];
                }
              }
            }
  
            // 解析 @returns
            const returnsMatch = line.match(/@returns?\s+{([^}]+)}\s*(.*)/);
            if (returnsMatch) {
              const [, type, description] = returnsMatch;
              // 假设返回值是一个对象，解析其属性类型
              const typeProps = type.match(/{\s*([^}]+)\s*}/);
              if (typeProps) {
                const props = typeProps[1].split(',').map(prop => prop.trim());
                props.forEach(prop => {
                  const [name, propType] = prop.split(':').map(s => s.trim());
                  docConfig.outputTypes[name] = propType;
                });
              } else {
                docConfig.outputTypes.result = type;
              }
            }
  
            // 解析自定义配置 @nodeWidth 和 @nodeHeight
            const widthMatch = line.match(/@nodeWidth\s+(\d+)/);
            if (widthMatch) {
              docConfig.width = parseInt(widthMatch[1]);
            }
            
            const heightMatch = line.match(/@nodeHeight\s+(\d+)/);
            if (heightMatch) {
              docConfig.height = parseInt(heightMatch[1]);
            }
          });
        }
      }
    });
  
    return docConfig;
  }
  
/**
 * 从URL加载并解析JSDoc配置
 * @param {string} url - 目标文件的URL地址
 * @param {string} exportName - 需要解析的导出函数名
 * @returns {Promise<Object>} 解析后的配置对象
 * @example
 * const config = await parseJSDocConfigFromURL('/path/to/file.js', 'targetFunction');
 */
export async function parseJSDocConfigFromURL(url, exportName) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const code = await response.text();
        return parseJSDocConfig(code, exportName);
    } catch (error) {
        console.error('解析JSDoc配置失败:', error);
        throw error;
    }
}
