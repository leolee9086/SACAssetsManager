import { parseNodeDefine } from "./containers/nodeDefineParser.js";
import RBush from '../../../../static/rbush.js';

export const componentMap = {
    'math/number':"/plugins/SACAssetsManager/source/UI/components/editors/nodes/math/number.vue",
    'note/protyle':"/plugins/SACAssetsManager/source/UI/components/common/assetCard/protyleCell.vue",

    localImageInput: '/plugins/SACAssetsManager/source/UI/components/editors/localImageInput.vue',
    ImageCompressor: '/plugins/SACAssetsManager/source/UI/components/editors/ImageCompressor.vue',
    ImageComparison: '/plugins/SACAssetsManager/source/UI/components/editors/ImageComparison.vue',
};
export const parseComponentDefinition = async (cardType,cardInfo) => {
    const componentURL = componentMap[cardType];
    return await parseNodeDefine(componentURL,cardInfo);
};

// 添加验证函数
const validateJsonStructure = (data) => {
    const errors = [];
    
    // 检查必要属性是否存在
    const requiredProps = ['cards', 'relations', 'connections'];
    requiredProps.forEach(prop => {
        if (!data.hasOwnProperty(prop)) {
            errors.push(`缺少必要属性: ${prop}`);
        } else if (!Array.isArray(data[prop])) {
            errors.push(`属性 ${prop} 必须是数组类型`);
        }
    });

    // 如果有错误，抛出异常
    if (errors.length > 0) {
        throw new Error(`JSON 结构验证失败:\n${errors.join('\n')}`);
    }

    // 返回验证后的数据，确保所有必要属性都存在
    return {
        cards: data.cards || [],
        relations: data.relations || [],
        connections: data.connections || [],
        ...data // 保留其他可能存在的属性
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
