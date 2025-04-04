// 添加验证函数
const validateJsonStructure = (data) => {
    const errors = [];
    const warnings = [];
    
    // 检查 cards 属性（必需）
    if (!data.hasOwnProperty('cards')) {
        errors.push('缺少必要属性: cards');
    } else if (!Array.isArray(data.cards)) {
        errors.push('属性 cards 必须是数组类型');
    }
    
    // 检查其他可选属性
    ['relations', 'connections'].forEach(prop => {
        if (data.hasOwnProperty(prop) && !Array.isArray(data[prop])) {
            warnings.push(`警告: 属性 ${prop} 应该是数组类型`);
        }
    });

    // 如果有错误，抛出异常
    if (errors.length > 0) {
        throw new Error(`JSON 结构验证失败:\n${errors.join('\n')}`);
    }

    // 如果有警告，输出到控制台
    if (warnings.length > 0) {
        console.warn(warnings.join('\n'));
    }

    // 返回验证后的数据
    return {
        cards: data.cards || [],
        relations: data.relations || [],
        connections: data.connections || [],
        ...data
    };
};

export const loadJson = async (jsonDefine) => {

    let data;

    // 如果 jsonDefine 本身是一个对象，直接验证
    if (typeof jsonDefine === 'object' && jsonDefine !== null) {
        data = jsonDefine;
    }
    // 判断 jsonDefine 是否为 URL 或绝对路径
    else if (jsonDefine.startsWith('http://') || jsonDefine.startsWith('https://') || jsonDefine.startsWith('/')) {
        const response = await fetch(jsonDefine);
        data = await response.json();
    }
    // 判断 jsonDefine 是否为本地文件路径
    else if (jsonDefine.endsWith('.json') || jsonDefine.endsWith('.js')) {
        const fileContent = await import(jsonDefine);
        data = fileContent.default || fileContent;
    }
    // 处理 jsonDefine 为 JSON 字符串的情况
    else {
        try {
            data = JSON.parse(jsonDefine);
        } catch (error) {
            throw new Error('无效的 JSON 字符串');
        }
    }

    // 验证数据结构
    try {
        data = validateJsonStructure(data);
    } catch (error) {
        console.error('数据结构验证失败:', error);
        // 返回一个包含基本结构的空对象
        return {
            cards: [],
            relations: [],
            connections: []
        };
    }

    return data;
};
