/**
 * JavaScript代码解析工具
 * 提供对JavaScript代码的解析功能，包括JSDoc注释解析
 */

import * as parser from '../../../../static/@babel_parser.js'
import traverse from '../../../../static/@babel/traverse.js'

/**
 * 解析默认值
 * @param {string} description 描述文本
 * @returns {*|null} 解析后的默认值或null
 */
function 解析默认值(description) {
  const defaultMatch = description.match(/\[default:\s*([^\]]+)\]/);
  if (!defaultMatch) return null;
  
  try {
    return JSON.parse(defaultMatch[1]);
  } catch (e) {
    return defaultMatch[1];
  }
}

/**
 * 解析参数行
 * @param {string} line 文档行
 * @param {Object} docConfig 文档配置对象
 */
function 解析参数行(line, docConfig) {
  const paramMatch = line.match(/@param\s+{([^}]+)}\s+([^\s]+)\s*(.*)/);
  if (!paramMatch) return;

  const [, type, name, description] = paramMatch;
  const cleanName = name.replace(/^\w+\./, '');
  docConfig.inputTypes[cleanName] = type;
  
  const defaultValue = 解析默认值(description);
  if (defaultValue !== null) {
    docConfig.defaultValues[cleanName] = defaultValue;
  }
}

/**
 * 解析返回值行
 * @param {string} line 文档行
 * @param {Object} docConfig 文档配置对象
 */
function 解析返回值行(line, docConfig) {
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

/**
 * 解析节点尺寸
 * @param {string} line 文档行
 * @param {Object} docConfig 文档配置对象
 */
function 解析节点尺寸(line, docConfig) {
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
 * 初始化文档配置
 * @param {string} exportName 导出函数名
 * @returns {Object} 初始化的文档配置对象
 */
function 初始化文档配置(exportName) {
  return {
    name: exportName,
    inputTypes: {},
    outputTypes: {},
    defaultValues: {},
    description: '',
    tags: {}  // 存储其他自定义标签
  };
}

/**
 * 处理导出声明
 * @param {Object} path AST路径
 * @param {string} exportName 导出函数名
 * @param {Object} docConfig 文档配置对象
 */
function 处理导出声明(path, exportName, docConfig) {
  const declaration = path.node.declaration;
  if (!是目标函数(declaration, exportName)) return;
  处理注释(path.node.leadingComments, docConfig);
}

/**
 * 处理函数声明
 * @param {Object} path AST路径
 * @param {string} exportName 导出函数名
 * @param {Object} docConfig 文档配置对象
 */
function 处理函数声明(path, exportName, docConfig) {
  if (path.node.id.name !== exportName) return;
  处理注释(path.node.leadingComments, docConfig);
}

/**
 * 处理变量声明
 * @param {Object} path AST路径
 * @param {string} exportName 导出函数名
 * @param {Object} docConfig 文档配置对象
 */
function 处理变量声明(path, exportName, docConfig) {
  const declarations = path.node.declarations;
  const targetDecl = declarations.find(d => d.id.name === exportName);
  if (!targetDecl) return;
  处理注释(path.node.leadingComments, docConfig);
}

/**
 * a处理代码注释
 * @param {Array} comments 注释数组
 * @param {Object} docConfig 文档配置对象
 */
function 处理注释(comments, docConfig) {
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
    解析参数行(line, docConfig);
    解析返回值行(line, docConfig);
    解析节点尺寸(line, docConfig);
    
    // 处理自定义标签
    解析自定义标签(line, docConfig);
  });
}

/**
 * 解析自定义标签
 * @param {string} line 文档行
 * @param {Object} docConfig 文档配置对象
 */
function 解析自定义标签(line, docConfig) {
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

/**
 * 判断是否为目标函数
 * @param {Object} declaration 声明对象
 * @param {string} exportName 导出函数名
 * @returns {boolean} 是否为目标函数
 */
function 是目标函数(declaration, exportName) {
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
 * 解析JSDoc配置
 * @param {string} code 源代码
 * @param {string} exportName 导出函数名
 * @returns {Object} 解析后的配置
 */
export function 解析JSDoc配置(code, exportName) {
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });

  let docConfig = 初始化文档配置(exportName);

  traverse(ast, {
    ExportNamedDeclaration(path) {
      处理导出声明(path, exportName, docConfig);
    },
    FunctionDeclaration(path) {
      处理函数声明(path, exportName, docConfig);
    },
    VariableDeclaration(path) {
      处理变量声明(path, exportName, docConfig);
    }
  });

  return docConfig;
}

/**
 * 从URL解析JSDoc配置
 * @param {string} url 代码文件URL
 * @param {string} exportName 导出函数名
 * @returns {Promise<Object>} 解析后的配置
 * @throws {Error} 解析失败时抛出异常
 */
export async function 从URL解析JSDoc配置(url, exportName) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP错误! 状态码: ${response.status}`);
    }
    const code = await response.text();
    return 解析JSDoc配置(code, exportName);
  } catch (error) {
    console.error('解析JSDoc配置失败:', error);
    throw error;
  }
}

// 兼容原有API名称，便于过渡
export const parseJSDocConfig = 解析JSDoc配置;
export const parseJSDocConfigFromURL = 从URL解析JSDoc配置;

// 导出内部函数供单元测试使用
export const _internals = {
  解析默认值,
  解析参数行,
  解析返回值行,
  解析节点尺寸,
  解析自定义标签,
  处理注释,
  是目标函数,
}; 