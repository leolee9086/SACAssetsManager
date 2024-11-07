import * as parser from '../../../../static/@babel_parser.js'

// 解析代码为AST
function parseCodeToAST(code) {
    return parser.parse(code, {
        sourceType: 'module',
        plugins: ['typescript']  // 如果需要支持TS
    });
}

// 处理变量声明
function handleVariableDeclaration(declarations, node) {
    node.declarations.forEach(decl => {
        if (decl.id.type === 'Identifier') {
            declarations.add(decl.id.name);
        }
    });
}

// 处理函数声明
function handleFunctionDeclaration(declarations, node) {
    if (node.id) {
        declarations.add(node.id.name);
    }
}

// 处理导入声明
function handleImportDeclaration(declarations, node) {
    node.specifiers.forEach(spec => {
        declarations.add(spec.local.name);
    });
}

// 处理导出声明
function handleExportDeclaration(declarations, node) {
    if (node.declaration?.type === 'VariableDeclaration') {
        handleVariableDeclaration(declarations, node.declaration);
    }
}

// 过滤声明
function filterDeclarations(declarations) {
    const VUE_RUNTIME_INJECTIONS = new Set([
        'defineProps',
        'defineEmits',
        'defineExpose',
        'defineOptions',
        'defineSlots',
        'defineModel',
        'withDefaults',
        'useSlots',
        'useAttrs'
    ]);

    return Array.from(declarations)
        .filter(name =>
            !name.startsWith('_') &&
            !VUE_RUNTIME_INJECTIONS.has(name) &&
            name !== 'undefined' &&
            name !== 'null'
        )
        .join(', ');
}

// 主函数
export function extractDeclaredVarsInNodeDefine(code) {
    try {
        const ast = parseCodeToAST(code);
        const declarations = new Set();

        ast.program.body.forEach(node => {
            switch (node.type) {
                case 'VariableDeclaration':
                    handleVariableDeclaration(declarations, node);
                    break;
                case 'FunctionDeclaration':
                    handleFunctionDeclaration(declarations, node);
                    break;
                case 'ImportDeclaration':
                    handleImportDeclaration(declarations, node);
                    break;
                case 'ExportNamedDeclaration':
                    handleExportDeclaration(declarations, node);
                    break;
            }
        });

        return filterDeclarations(declarations);
    } catch (error) {
        console.error('解析声明失败:', error);
        return '';
    }
}
