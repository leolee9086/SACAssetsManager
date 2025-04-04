import MagicString from '../../../static/magic-string.mjs'
import { isBuiltinFunction } from './wgsl/isBuiltinFunction.js';
import * as wglsRegs from './wgsl/regex.js'
import { parseWGSLUniformBindings } from './wgsl/uniformParser.js';

// 纯函数：解析导入列表
function parseImportList(importList) {
    return importList.split(',').map(item => {
        const [type, name] = item.trim().split(/\s+/);
        return { type, name, key: `${type}_${name}` };
    });
}

// 纯函数：处理单个导入声明
function processImportDeclaration(content, importItems, declarations) {
    const functionMap = new Map();
    const structMap = new Map();
    const dependencyGraph = new Map();
    
    // 提取结构体定义
    function extractStruct(structName) {
        const structRegex = new RegExp(`struct\\s+${structName}\\s*{[^}]*}`, 'g');
        const match = content.match(structRegex);
        if (!match) {
            throw new Error(`Struct ${structName} not found in imported content`);
        }
        return match[0];
    }
    
    // 递归查找函数及其所有依赖
    function findFunctionAndDependencies(fnName, visited = new Set()) {
        if (functionMap.has(fnName)) return;
        if (visited.has(fnName)) return;
        visited.add(fnName);
        
        try {
            const fnContent = extractFunction(content, fnName);
            functionMap.set(fnName, fnContent);
            
            // 查找所有函数调用和结构体使用
            const fnCallRegex = /\b(\w+)\s*\(/g;
            const structUseRegex = /\b(struct\s+\w+|[A-Z]\w*)\b/g;
            const directDeps = new Set();
            let match;
            
            // 查找函数调用
            while ((match = fnCallRegex.exec(fnContent)) !== null) {
                const calledFn = match[1];
                if (!isBuiltinFunction(calledFn) && calledFn !== fnName) {
                    directDeps.add(calledFn);
                    findFunctionAndDependencies(calledFn, visited);
                }
            }
            
            // 查找结构体使用
            while ((match = structUseRegex.exec(fnContent)) !== null) {
                const structName = match[1].replace('struct ', '');
                if (!structMap.has(structName)) {
                    try {
                        const structDef = extractStruct(structName);
                        structMap.set(structName, structDef);
                    } catch (e) {
                        // 忽略内置类型或找不到的结构体
                    }
                }
            }
            
            dependencyGraph.set(fnName, directDeps);
        } catch (e) {
            dependencyGraph.set(fnName, new Set());
        }
    }
    
    // 处理所有导入项
    for (const { type, name, key } of importItems) {
        if (!declarations.has(key)) {
            switch (type) {
                case 'fn':
                    findFunctionAndDependencies(name);
                    break;
                case 'struct':
                    try {
                        const structDef = extractStruct(name);
                        structMap.set(name, structDef);
                        declarations.add(key);
                    } catch (e) {
                        console.warn(`Failed to extract struct ${name}: ${e.message}`);
                    }
                    break;
                case 'f32':
                case 'i32':
                case 'u32':
                    try {
                        const constDef = extractConstant(content, name);
                        if (constDef) {
                            declarations.add(key);
                            functionMap.set(name, constDef);
                        }
                    } catch (e) {
                        console.warn(`Failed to extract constant ${name}: ${e.message}`);
                    }
                    break;
            }
        }
    }
    
    // 拓扑排序
    const orderedFunctions = [];
    const visited = new Set();
    const processing = new Set();
    
    function visit(fnName) {
        if (processing.has(fnName)) return;
        if (visited.has(fnName)) return;
        
        processing.add(fnName);
        
        const deps = dependencyGraph.get(fnName) || new Set();
        for (const dep of deps) {
            visit(dep);
        }
        
        processing.delete(fnName);
        visited.add(fnName);
        
        if (functionMap.has(fnName)) {
            orderedFunctions.push(fnName);
        }
    }
    
    // 从每个导入函数开始排序
    for (const { type, name } of importItems) {
        if (type === 'fn') {
            visit(name);
        }
    }
    
    // 生成最终代码
    const processedContent = [];
    
    // 首先添加所有结构体定义
    for (const structDef of structMap.values()) {
        processedContent.push(structDef);
    }
    
    // 然后添加函数定义
    for (const fnName of orderedFunctions) {
        const fnContent = functionMap.get(fnName);
        if (fnContent) {
            processedContent.push(fnContent);
            declarations.add(`fn_${fnName}`);
        }
    }
    
    return processedContent.join('\n\n');
}

// 拓扑排序实现
function topologicalSort(graph) {
    const result = [];
    const visited = new Set();
    const temp = new Set();
    
    function visit(node) {
        if (temp.has(node)) {
            // 检测到循环依赖，但继续处理
            return;
        }
        if (visited.has(node)) {
            return;
        }
        
        temp.add(node);
        
        // 访问所有依赖
        const deps = graph.get(node) || new Set();
        for (const dep of deps) {
            visit(dep);
        }
        
        temp.delete(node);
        visited.add(node);
        result.push(node);
    }
    
    // 处理所有节点
    for (const node of graph.keys()) {
        if (!visited.has(node)) {
            visit(node);
        }
    }
    
    return result;
}

// 简化版的函数提取
function extractFunction(source, functionName) {
    const fnDefStart = findFunctionStart(source, functionName);
    if (fnDefStart === -1) {
        throw new Error(`Function ${functionName} not found in imported content`);
    }
    
    const fnDefEnd = findFunctionEnd(source, fnDefStart);
    if (fnDefEnd === -1) {
        throw new Error(`Incomplete function definition for ${functionName}`);
    }
    
    return source.substring(fnDefStart, fnDefEnd).trim();
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


function findFunctionStart(source, fnName) {
    const fnStartRegex = new RegExp(`\\bfn\\s+${fnName}\\s*\\(`);
    const match = source.match(fnStartRegex);
    return match ? match.index : -1;
}

function findFunctionEnd(source, startPos) {
    let bracketCount = 0;
    let foundFirstBracket = false;
    
    for (let i = startPos; i < source.length; i++) {
        const char = source[i];
        
        if (char === '{') {
            foundFirstBracket = true;
            bracketCount++;
        } else if (char === '}') {
            bracketCount--;
            
            if (foundFirstBracket && bracketCount === 0) {
                // 确保包含完整的右括号
                return i + 1;
            }
        }
    }
    
    return -1;
}



function extractConstant(source, constantName) {
    const constRegex = wglsRegs.buildConstRegex(constantName)
    const match = source.match(constRegex);
    if (!match) {
        throw new Error(`Constant ${constantName} not found in imported content`);
    }
    return match[0].replace(/(?:\/\/\s*)?@export\s+/, '').trim();
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

/**
 * 加载并解析 WGSL 代码，包括绑定信息
 * 
 * @param {string} path - WGSL 文件的路径
 * @param {Object} [options] - 预处理选项
 * @returns {Promise<{
 *   code: string,
 *   uniforms: Object,
 *   require: Function,
 *   export: Function,
 *   compile: Function,
 *   link: Function
 * }>} 处理后的代码、绑定信息和模块方法
 */
export async function _load_(path, options = {}) {
    // 设置默认选项
    const defaultOptions = {
        cache: true,
        defines: {},
        importCache: new Map(),
        macros: {}
    };

    // 合并用户选项和默认选项
    const finalOptions = { ...defaultOptions, ...options };
    
    const code = await requireWGSLCode(path, finalOptions);
    const uniforms = parseWGSLUniformBindings(code);
    
    return {
        code,
        uniforms,
        
        /**
         * 从模块中导入其他 WGSL 模块
         * @param {string} modulePath - 要导入的模块路径
         * @throws {Error} 尚未实现
         */
        require(modulePath) {
            throw new Error('WGSL module require() method not implemented');
        },
        
        /**
         * 导出模块中的函数或变量
         * @param {string} name - 要导出的项目名称
         * @throws {Error} 尚未实现
         */
        export(name) {
            throw new Error('WGSL module export() method not implemented');
        },
        
        /**
         * 编译 WGSL 代码
         * @returns {Promise<any>} 编译后的着色器模块
         * @throws {Error} 尚未实现
         */
        async compile() {
            throw new Error('WGSL module compile() method not implemented');
        },
        
        /**
         * 链接多个 WGSL 模块
         * @param {...any} modules - 要链接的模块
         * @throws {Error} 尚未实现
         */
        link(...modules) {
            throw new Error('WGSL module link() method not implemented');
        }
    };
}