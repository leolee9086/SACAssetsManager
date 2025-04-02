/**
 * Petri网定义语言(DSL)解析器
 * 将Petri网文本定义解析为结构化AST对象
 */

/**
 * 创建初始AST结构
 * @returns {Object} 初始AST对象
 */
function createInitialAst() {
    return {
        ctx: null,
        net: {
            type: null,
            extensions: [],
            loop: null,
            panic: {}
        },
        prototypes: {},
        transitions: [],
        flows: []
    };
}

/**
 * 解析网络定义内容
 * @param {string} line 当前解析的行
 * @param {Object} ast AST对象
 */
function parseNetContent(line, ast) {
    if (line.startsWith('type:')) {
        ast.net.type = line.split('type:')[1].trim();
    } else if (line.startsWith('extensions')) {
        // 解析扩展列表
        const extensions = line.match(/- (\w+)/g);
        if (extensions) {
            ast.net.extensions = extensions.map(ext => ext.replace('- ', ''));
        }
    } else if (line.startsWith('loop:')) {
        ast.net.loop = line.split('loop:')[1].trim();
    }
}

/**
 * 解析原型定义内容
 * @param {string} line 当前解析的行
 * @param {Object} block 当前正在构建的块
 * @param {Object} ast AST对象
 */
function parsePrototypeContent(line, block, ast) {
    if (line.startsWith('target:')) {
        block.target = line.split('target:')[1].trim();
    } else if (line.startsWith('place')) {
        const placeName = line.split('place')[1].trim();
        block.places[placeName] = {
            capacity: 'infinity',
            mode: null,
            state: {}
        };
    }
    
    // 将完整的block添加到AST
    if (block.name) {
        ast.prototypes[block.name] = block;
    }
}

/**
 * 解析变迁定义内容
 * @param {string} line 当前解析的行
 * @param {Object} ast AST对象
 */
function parseTransitionContent(line, ast) {
    if (line.startsWith('λ')) {
        const transition = {
            name: line.split('λ')[1].trim(),
            in: [],
            out: [],
            delay: null,
            priority: null
        };
        ast.transitions.push(transition);
    }
}

/**
 * 解析代币信息
 * @param {string} line 包含代币信息的行
 * @returns {Array} 代币数组
 */
function parseTokens(line) {
    const tokenMatch = line.match(/-{(.+?)}->/);
    if (tokenMatch) {
        const tokenStr = tokenMatch[1];
        return tokenStr.split(',').map(t => {
            const [name, count] = t.split(':');
            return {
                name: name.trim(),
                count: parseInt(count) || 1
            };
        });
    }
    return [];
}

/**
 * 解析流转定义内容
 * @param {string} line 当前解析的行
 * @param {Object} ast AST对象
 */
function parseFlowContent(line, ast) {
    if (line.includes('->')) {
        const [from, to] = line.split('->').map(s => s.trim());
        ast.flows.push({
            from,
            to,
            tokens: parseTokens(line)
        });
    }
}

/**
 * 根据当前section处理内容
 * @param {string} line 当前解析的行
 * @param {string} section 当前解析的部分
 * @param {Object} block 当前正在构建的块
 * @param {Object} ast AST对象
 */
function parseContent(line, section, block, ast) {
    switch (section) {
        case 'net':
            parseNetContent(line, ast);
            break;
        case 'prototype':
            parsePrototypeContent(line, block, ast);
            break;
        case 'transitions':
            parseTransitionContent(line, ast);
            break;
        case 'flows':
            parseFlowContent(line, ast);
            break;
    }
}

/**
 * 解析Petri网定义
 * @param {string} content Petri网定义内容
 * @returns {Object} 解析后的AST
 */
function parsePetriNet(content) {
    const ast = createInitialAst();
    const lines = content.split('\n');
    let currentSection = null;
    let currentBlock = {};

    for (let line of lines) {
        line = line.trim();
        
        // 跳过注释和空行
        if (line.startsWith('//-') || line === '') continue;

        // 解析上下文定义
        if (line.startsWith('ctx:')) {
            ast.ctx = line.split('ctx:')[1].trim().replace(/["']/g, '');
            continue;
        }

        // 解析网络声明
        if (line === 'net') {
            currentSection = 'net';
            continue;
        }

        // 解析原型声明
        if (line.startsWith('prototype')) {
            currentSection = 'prototype';
            currentBlock = {
                name: line.split('prototype')[1].trim(),
                places: {},
                target: null
            };
            continue;
        }

        // 解析变迁声明
        if (line === 'transitions') {
            currentSection = 'transitions';
            continue;
        }

        // 解析流转声明
        if (line === 'flows') {
            currentSection = 'flows';
            continue;
        }

        // 根据当前section处理内容
        parseContent(line, currentSection, currentBlock, ast);
    }

    return ast;
}

export {parsePetriNet}
