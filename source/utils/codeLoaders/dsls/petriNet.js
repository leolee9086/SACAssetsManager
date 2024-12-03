class PetriNetParser {
    constructor() {
        this.ast = {
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

    parse(content) {
        const lines = content.split('\n');
        let currentSection = null;
        let currentBlock = {};

        for (let line of lines) {
            line = line.trim();
            
            // 跳过注释和空行
            if (line.startsWith('//-') || line === '') continue;

            // 解析上下文定义
            if (line.startsWith('ctx:')) {
                this.ast.ctx = line.split('ctx:')[1].trim().replace(/["']/g, '');
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
            this.parseContent(line, currentSection, currentBlock);
        }

        return this.ast;
    }

    parseContent(line, section, block) {
        switch (section) {
            case 'net':
                this.parseNetContent(line);
                break;
            case 'prototype':
                this.parsePrototypeContent(line, block);
                break;
            case 'transitions':
                this.parseTransitionContent(line);
                break;
            case 'flows':
                this.parseFlowContent(line);
                break;
        }
    }

    parseNetContent(line) {
        if (line.startsWith('type:')) {
            this.ast.net.type = line.split('type:')[1].trim();
        } else if (line.startsWith('extensions')) {
            // 解析扩展列表
            const extensions = line.match(/- (\w+)/g);
            if (extensions) {
                this.ast.net.extensions = extensions.map(ext => ext.replace('- ', ''));
            }
        } else if (line.startsWith('loop:')) {
            this.ast.net.loop = line.split('loop:')[1].trim();
        }
    }

    parsePrototypeContent(line, block) {
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
            this.ast.prototypes[block.name] = block;
        }
    }

    parseTransitionContent(line) {
        if (line.startsWith('λ')) {
            const transition = {
                name: line.split('λ')[1].trim(),
                in: [],
                out: [],
                delay: null,
                priority: null
            };
            this.ast.transitions.push(transition);
        }
    }

    parseFlowContent(line) {
        if (line.includes('->')) {
            const [from, to] = line.split('->').map(s => s.trim());
            this.ast.flows.push({
                from,
                to,
                tokens: this.parseTokens(line)
            });
        }
    }

    parseTokens(line) {
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
}

// 使用示例
const parser = new PetriNetParser();
const petriNetDefinition = `你的Petri网定义内容`;
const ast = parser.parse(petriNetDefinition);
