import * as parser from '../../../../static/@babel_parser.js'
import traverse from '../../../../static/@babel/traverse.js'

function parseDefaultValue(description) {
  const defaultMatch = description.match(/\[default:\s*([^\]]+)\]/);
  if (!defaultMatch) return null;
  
  try {
    return JSON.parse(defaultMatch[1]);
  } catch (e) {
    return defaultMatch[1];
  }
}

function parseParamLine(line, docConfig) {
  const paramMatch = line.match(/@param\s+{([^}]+)}\s+([^\s]+)\s*(.*)/);
  if (!paramMatch) return;

  const [, type, name, description] = paramMatch;
  const cleanName = name.replace(/^\w+\./, '');
  docConfig.inputTypes[cleanName] = type;
  
  const defaultValue = parseDefaultValue(description);
  if (defaultValue !== null) {
    docConfig.defaultValues[cleanName] = defaultValue;
  }
}

function parseReturnsLine(line, docConfig) {
  const returnsMatch = line.match(/@returns?\s+{([^}]+)}\s*(.*)/);
  if (!returnsMatch) return;

  const [, type] = returnsMatch;
  const typeProps = type.match(/{\s*([^}]+)\s*}/);
  
  if (typeProps) {
    const props = typeProps[1].split(',').map(prop => prop.trim());
    props.forEach(prop => {
      const [name, propType] = prop.split(':').map(s => s.trim());
      docConfig.outputTypes[name] = propType;
    });
  } else {
    docConfig.outputTypes.$result = type;
  }
}

function parseNodeDimensions(line, docConfig) {
  const widthMatch = line.match(/@nodeWidth\s+(\d+)/);
  if (widthMatch) {
    docConfig.width = parseInt(widthMatch[1]);
  }
  
  const heightMatch = line.match(/@nodeHeight\s+(\d+)/);
  if (heightMatch) {
    docConfig.height = parseInt(heightMatch[1]);
  }
}

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

  let docConfig = initDocConfig(exportName);

  traverse(ast, {
    ExportNamedDeclaration(path) {
      processExportDeclaration(path, exportName, docConfig);
    },
    FunctionDeclaration(path) {
      processFunctionDeclaration(path, exportName, docConfig);
    },
    VariableDeclaration(path) {
      processVariableDeclaration(path, exportName, docConfig);
    }
  });

  return docConfig;
}

function initDocConfig(exportName) {
  return {
    name: exportName,
    inputTypes: {},
    outputTypes: {},
    defaultValues: {},
    description: '',
    tags: {}  // 存储其他自定义标签
  };
}

function processExportDeclaration(path, exportName, docConfig) {
  const declaration = path.node.declaration;
  if (!isTargetFunction(declaration, exportName)) return;
  processComments(path.node.leadingComments, docConfig);
}

function processFunctionDeclaration(path, exportName, docConfig) {
  if (path.node.id.name !== exportName) return;
  processComments(path.node.leadingComments, docConfig);
}

function processVariableDeclaration(path, exportName, docConfig) {
  const declarations = path.node.declarations;
  const targetDecl = declarations.find(d => d.id.name === exportName);
  if (!targetDecl) return;
  processComments(path.node.leadingComments, docConfig);
}

function processComments(comments, docConfig) {
  if (!comments || !comments.length) return;
  
  const docComment = comments[0].value;
  // 提取描述部分（第一个@标签之前的所有内容）
  const descriptionMatch = docComment.match(/^\s*\*?\s*([\s\S]*?)(?=\s*@|$)/);
  if (descriptionMatch) {
    docConfig.description = descriptionMatch[1].trim();
  }

  const lines = docComment.split('\n');
  lines.forEach(line => {
    // 处理已知的标签
    parseParamLine(line, docConfig);
    parseReturnsLine(line, docConfig);
    parseNodeDimensions(line, docConfig);
    
    // 处理自定义标签
    parseCustomTag(line, docConfig);
  });
}

function parseCustomTag(line, docConfig) {
  const tagMatch = line.match(/@(\w+)\s+(.*)/);
  if (!tagMatch) return;

  const [, tagName, content] = tagMatch;
  if (!['param', 'returns', 'return', 'nodeWidth', 'nodeHeight'].includes(tagName)) {
    if (!docConfig.tags[tagName]) {
      docConfig.tags[tagName] = [];
    }
    docConfig.tags[tagName].push(content.trim());
  }
}

function isTargetFunction(declaration, exportName) {
  return declaration && (
    // 普通函数声明
    (declaration.type === 'FunctionDeclaration' && declaration.id.name === exportName) ||
    // 箭头函数声明
    (declaration.type === 'VariableDeclaration' && 
     declaration.declarations[0].id.name === exportName &&
     declaration.declarations[0].init.type === 'ArrowFunctionExpression')
  );
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
