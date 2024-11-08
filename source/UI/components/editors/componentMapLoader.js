import { parseNodeDefine } from "./containers/nodeDefineParser.js";
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
