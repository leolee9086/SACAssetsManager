import { parseNodeDefine } from "./containers/nodeDefineParser.js";
import { parseJSDocConfigFromURL } from "../../../utils/codeLoaders/js/jsDoc.js";
import * as 向量 from '/plugins/SACAssetsManager/source/UI/components/editors/geometry/geometryCalculate/vector.js'
import { jsDoc2NodeDefine, wrapSFCStringFromNodeDefine } from "./nodes/wraper/jsWraper.js";
import { writeFile } from "../../../polyfills/fs.js";

// 定义全局Symbol
const COMPONENT_MAP_SYMBOL = Symbol.for('SACComponentMap');

// 初始化默认组件映射
const defaultComponentMap = {
    'math/number': "/plugins/SACAssetsManager/source/UI/components/editors/nodes/math/number.vue",
    'note/protyle': "/plugins/SACAssetsManager/source/UI/components/common/assetCard/protyleCell.vue",
    'image/brightness': "/plugins/SACAssetsManager/source/UI/components/editors/nodes/image/brightness.vue",
    localImageInput: '/plugins/SACAssetsManager/source/UI/components/editors/localImageInput.vue',
    ImageCompressor: '/plugins/SACAssetsManager/source/UI/components/editors/ImageCompressor.vue',
    ImageComparison: '/plugins/SACAssetsManager/source/UI/components/editors/ImageComparison.vue',
};

// 获取或创建全局componentMap
if (!globalThis[COMPONENT_MAP_SYMBOL]) {
    globalThis[COMPONENT_MAP_SYMBOL] = defaultComponentMap;
}
let loadvector = async () => {
    try {
        const exportNames = Object.keys(向量);
        const url = '/plugins/SACAssetsManager/source/UI/components/editors/geometry/geometryCalculate/vector.js';
        
        for (const exportName of exportNames) {
            try {
                // 解析JSDoc配置
                const result = await parseJSDocConfigFromURL(url, exportName);
                const module = await import(url);
                const nodeDefine = jsDoc2NodeDefine(result, module, exportName, url);
                // 生成SFC文件
                const { sfcString, blobUrl } = wrapSFCStringFromNodeDefine(nodeDefine, url, exportName);
                // 写入文件并更新组件映射
                const compiledPath = `/data/public/SACCompiled/${exportName}.vue`;
                await writeFile(compiledPath, sfcString);
                
                const sfcUrl = `/public/SACCompiled/${exportName}.vue`;
                defaultComponentMap[`default/${exportName}`] = sfcUrl;
                console.log('处理完成:', exportName, url,sfcUrl);
            } catch (err) {
                console.error(`处理 ${exportName} 时发生错误:`, err);
                // 继续处理下一个，而不是中断整个过程
            }
        }
    } catch (err) {
        console.error('加载向量组件时发生错误:', err);
        throw err;
    }
};

await loadvector()

// 导出getter函数
export const getComponentMap = () => globalThis[COMPONENT_MAP_SYMBOL];

// 为了保持向后兼容，也可以直接导出componentMap对象
export const componentMap = getComponentMap();

export const parseComponentDefinition = async (cardType, cardInfo) => {

    try{
    const componentURL = componentMap[cardType];
    return await parseNodeDefine(componentURL, cardInfo);
    }catch(e){
        console.error(e)
    }
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
