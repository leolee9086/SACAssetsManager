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
export const loadJson = async (jsonDefine) => {
    let data;

    // 如果 jsonDefine 本身是一个对象，直接返回
    if (typeof jsonDefine === 'object' && jsonDefine !== null) {
        return jsonDefine;
    }

    // 判断 jsonDefine 是否为 URL 或绝对路径
    if (jsonDefine.startsWith('http://') || jsonDefine.startsWith('https://') || jsonDefine.startsWith('/')) {
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
            throw new Error('Invalid JSON string');
        }
    }

    console.log(data)
    return data;
};
