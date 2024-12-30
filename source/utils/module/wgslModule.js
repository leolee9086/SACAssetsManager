import MagicString from '../../../static/magic-string.mjs'
import { isBuiltinFunction } from './wgsl/isBuiltinFunction.js';
import * as wglsRegs from './wgsl/regex.js'

// 纯函数：解析导入列表
function parseImportList(importList) {
    return importList.split(',').map(item => {
        const [type, name] = item.trim().split(/\s+/);
        return { type, name, key: `${type}_${name}` };
    });
}

// 纯函数：处理单个导入声明
function processImportDeclaration(content, importItems, declarations) {
    let prependContent = '';
    for (const { type, name, key } of importItems) {
        if (!declarations.has(key)) {
            const extractedContent = processImportItem(type, name, content);
            if (extractedContent) {
                declarations.add(key);
                prependContent += extractedContent + '\n';
            }
        }
    }
    return prependContent;
}

// 纯函数：处理导入内容的缓存
async function processImportCache(absolutePath, content, basePath, importCache) {
    if (!importCache.has(absolutePath)) {
        const processedContent = await processImports(content, basePath, importCache);
        importCache.set(absolutePath, processedContent);
    }
    return importCache.get(absolutePath);
}
function resolveImportPath(basePath, importPath) {
    if (importPath.startsWith('http://') || importPath.startsWith('https://')) {
        return importPath;
    }
    if (basePath.startsWith('http://') || basePath.startsWith('https://')) {
        const baseUrl = new URL(basePath);
        return new URL(importPath, baseUrl).toString();
    }
    return path.resolve(basePath, importPath);
}


function extractFunction(source, functionName) {
    const fnRegex = wglsRegs.buildFnRegex(functionName)
    const match = source.match(fnRegex);
    if (!match) {
        throw new Error(`Function ${functionName} not found in imported content`);
    }

    // 新增：分析函数依赖
    const extractedFn = match[0].replace(/(?:\/\/\s*)?@export\s+/, '').trim();
    const dependencies = extractFunctionDependencies(source, extractedFn);
    
    // 返回所有依赖的函数定义和主函数
    return dependencies.join('\n') + '\n' + extractedFn;
}

// 新增：提取函数依赖
function extractFunctionDependencies(source, fnContent) {
    const dependencies = new Set();
    // 匹配函数调用: 查找 "fn 标识符("
    const fnCallRegex = /\b(\w+)\s*\(/g;
    let match;
    
    while ((match = fnCallRegex.exec(fnContent)) !== null) {
        const calledFn = match[1];
        // 跳过内置函数
        if (isBuiltinFunction(calledFn)) continue;
        
        // 查找被调用函数的定义
        const fnDefRegex = new RegExp(`fn\\s+${calledFn}\\s*\\([^)]*\\)[^{]*{[^}]*}`, 'g');
        const defMatch = source.match(fnDefRegex);
        
        if (defMatch) {
            dependencies.add(defMatch[0]);
            // 递归查找这个函数的依赖
            const subDeps = extractFunctionDependencies(source, defMatch[0]);
            subDeps.forEach(dep => dependencies.add(dep));
        }
    }
    
    return Array.from(dependencies);
}



function extractConstant(source, constantName) {
    const constRegex = wglsRegs.buildConstRegex(constantName)
    const match = source.match(constRegex);
    if (!match) {
        throw new Error(`Constant ${constantName} not found in imported content`);
    }
    return match[0].replace(/(?:\/\/\s*)?@export\s+/, '').trim();
}
function processImportItem(type, name, content) {
    let extractedContent = '';
    if (type === 'fn') {
        extractedContent = extractFunction(content, name);
    } else if (type === 'f32') {
        extractedContent = extractConstant(content, name);
    }
    return extractedContent;
}

async function fetchContent(path) {
    if (path.startsWith('http://') || path.startsWith('https://')) {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
        }
        return response.text();
    }
    return fs.readFile(path, 'utf-8');
}


// 宏定义正则表达式
const MACRO_DEF_REGEX = /#define\s+(\w+)(?:\(([\w\s,]*)\))?\s+([^\n]+)/g;

// 宏处理器
function processMacros(source) {
    const s = new MagicString(source);
    const macros = new Map();
    
    // 1. 收集所有宏定义
    let match;
    while ((match = MACRO_DEF_REGEX.exec(source)) !== null) {
        const [fullMatch, name, params, body] = match;
        macros.set(name, {
            params: params ? params.split(',').map(p => p.trim()) : [],
            body: body.trim(),
            start: match.index,
            end: match.index + fullMatch.length
        });
        // 移除宏定义
        s.remove(match.index, match.index + fullMatch.length);
    }
    
    // 2. 展开宏使用
    let result = s.toString();
    for (const [name, macro] of macros) {
        result = expandMacro(result, name, macro);
    }
    
    return result;
}

// 展开单个宏
function expandMacro(source, macroName, macro) {
    const s = new MagicString(source);
    const regex = new RegExp(`\\b${macroName}\\b(?:\\(([^)]+)\\))?`, 'g');
    
    let match;
    while ((match = regex.exec(source)) !== null) {
        const [fullMatch, argsStr] = match;
        let replacement = macro.body;
        
        // 处理带参数的宏
        if (macro.params.length > 0) {
            if (!argsStr) {
                throw new Error(`Macro ${macroName} expects arguments but none provided`);
            }
            const args = argsStr.split(',').map(arg => arg.trim());
            if (args.length !== macro.params.length) {
                throw new Error(`Macro ${macroName} expects ${macro.params.length} arguments but got ${args.length}`);
            }
            
            // 替换参数
            macro.params.forEach((param, i) => {
                replacement = replacement.replace(new RegExp(`\\b${param}\\b`, 'g'), args[i]);
            });
        }
        
        s.overwrite(match.index, match.index + fullMatch.length, replacement);
    }
    
    return s.toString();
}

// 核心处理流程
async function processWGSL(source, filePath, importCache = new Map()) {
    // 1. 处理宏
    source = processMacros(source);
    // 2. 处理导入
    const importProcessed = await processImports(source, filePath, importCache);
    // 3. 后处理
    return postProcess(importProcessed);
}

// 处理所有导入语句
async function processImports(source, basePath, importCache) {
    const s = new MagicString(source);
    const declarations = new Set();
    let prependContent = '';
    let match;

    while ((match = wglsRegs.WGSL_IMPORT_REGEX.exec(source)) !== null) {
        const [fullMatch, importList, importPath] = match;
        const { start, end } = getMatchRange(match);
        const absolutePath = resolveImportPath(basePath, importPath);
        
        // 获取导入文件内容
        const content = await fetchContent(absolutePath);
        // 处理导入文件的缓存
        const cachedContent = await processImportCache(absolutePath, content, basePath, importCache);
        
        // 处理导入声明
        const importItems = parseImportList(importList);
        prependContent += processImportDeclaration(cachedContent, importItems, declarations);
        s.remove(start, end);
    }

    if (prependContent) {
        s.prepend(prependContent + '\n');
    }
    return s.toString();
}

// 后处理：移除@export标记并整理代码
function postProcess(source) {
    const s = new MagicString(source);
    return s.replaceAll(/@export\s+/g, '')
        .trim()
        .toString();
}

// 辅助函数：获取正则表达式匹配的范围
function getMatchRange(match) {
    return {
        start: match.index,
        end: match.index + match[0].length
    };
}

// 处理条件编译指令
function processConditionalCompilation(source, defines = {}) {
    const s = new MagicString(source);
    // 处理 #if 指令
    const IF_REGEX = /#if\s+([^\n]+)\n([\s\S]*?)(?:#else\n([\s\S]*?))?\s*#endif/g;
    let match;
    while ((match = IF_REGEX.exec(source)) !== null) {
        const [fullMatch, condition, ifBlock, elseBlock = ''] = match;
        const { start, end } = {
            start: match.index,
            end: match.index + fullMatch.length
        };
        // 计算条件
        const isConditionMet = evaluateCondition(condition, defines);
        // 替换为相应的代码块
        s.overwrite(start, end, isConditionMet ? ifBlock : elseBlock);
    }
    return s.toString();
}

// 评估条件表达式
function evaluateCondition(condition, defines) {
    // 替换所有已定义的变量
    const evalStr = condition.replace(/\b\w+\b/g, match => {
        return defines[match] !== undefined ? defines[match] : match;
    });
    
    try {
        // 安全的条件评估
        return new Function('return ' + evalStr)();
    } catch (e) {
        console.warn(`条件编译表达式评估失败: ${condition}`);
        return false;
    }
}

/**
 * 加载并预处理 WGSL 代码文件
 * 
 * @param {string} path - WGSL 文件的路径，支持本地文件路径或 HTTP(S) URL
 * @param {Object} [options] - 预处理选项
 * @param {boolean} [options.cache=true] - 是否启用导入缓存
 * @param {Object.<string, boolean|number|string>} [options.defines={}] - 条件编译的定义
 *        例如: { DEBUG: true, VERSION: 2 }
 * @param {Map<string, string>} [options.importCache=new Map()] - 导入缓存映射
 * @param {Object.<string, string>} [options.macros={}] - 要预定义的宏
 *        例如: { PI: "3.14159", MAX_ITEMS: "100" }
 * 
 * @returns {Promise<string>} 处理后的 WGSL 代码
 * 
 * @throws {Error} 当文件加载失败或处理过程中出错时抛出异常
 * 
 * @example
 * // 基础用法
 * const code = await requireWGSLCode('./shaders/main.wgsl');
 * 
 * @example
 * // 使用完整选项
 * const code = await requireWGSLCode('./shaders/main.wgsl', {
 *   cache: true,
 *   defines: { 
 *     DEBUG: true,
 *     PLATFORM: "mobile"
 *   },
 *   macros: {
 *     PI: "3.14159",
 *     TEXTURE_SIZE: "512"
 *   }
 * });
 */
export async function requireWGSLCode(path, options = { 
    cache: true, 
    defines: {},
    importCache: new Map(),
    macros: {}
}) {
    try {
        const basePath = path.startsWith('http')
            ? new URL(path).toString()
            : process.cwd();
        if (!options.cache) {
            options.importCache.clear();
        }
        let source = await fetchContent(path);
        // 添加命令行定义的宏
        if (Object.keys(options.macros).length > 0) {
            source = Object.entries(options.macros)
                .map(([name, value]) => `#define ${name} ${value}`)
                .join('\n') + '\n' + source;
        }
        // 条件编译处理
        source = processConditionalCompilation(source, options.defines);
        // WGSL处理（包含宏处理）
        const finalCode = await processWGSL(source, basePath, options.importCache);
        return finalCode;
    } catch (error) {
        console.error('WGSL preprocessing error:', error);
        throw new Error(`Failed to load WGSL code from ${path}: ${error.message}`);
    }
}