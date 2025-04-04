import * as parser from '../../../../../static/@babel_parser.js'
export {hasNodeType} from './forAstCheck.js'
export {extractExports,extractImports} from './forModuleAnalyze.js'
/**
 * 解析代码字符串为AST语法树
 * @param {string} code - 需要解析的代码字符串
 * @returns {Object} 返回AST语法树对象
 */
export const parseCodeToAst = (code) => {
    return parser.parse(code, {
        sourceType: 'module',
        plugins: ['typescript']  // 如果需要支持TS
    });
}



