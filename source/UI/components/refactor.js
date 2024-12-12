/**
 * 这个文件仅仅用于重构中临时集中一些代码
 */
import { getCommonThumbnailsFromAssets } from '../utils/tumbnail.js';
import { getAssetNames, toArray } from './componentUtils.js';

/**
 * 获取资源的显示标签
 * @param {Array} assets - 资源数组
 * @returns {string} 显示标签
 */
export const getAssetsLabel = (assets) => {
    if (assets.length > 0) {
        if (assets.length <= 3) {
            return assets.map(item => getAssetNames(item)).join(', ');
        } else {
            return `${getAssetNames(assets[0])} 等 ${assets.length} 个文件`;
        }
    }
    return '无选择';
}

/**
 * 更新图片源
 * @param {Array} assetsData - 资源数据
 * @param {number} currentIndex - 当前索引
 * @param {string} pluginName - 插件名称
 * @returns {Array} 图片源数组
 */
export const updateImageSource = (assetsData, currentIndex, pluginName) => {
    if (assetsData.length > 0 && assetsData[0]) {
        const sources = getCommonThumbnailsFromAssets(toArray(assetsData[currentIndex]));
        return sources[0] ? sources : [`/plugins/${pluginName}/assets/wechatDonate.jpg`];
    }
    return [`/plugins/${pluginName}/assets/wechatDonate.jpg`];
}