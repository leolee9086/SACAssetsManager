import pinyin from "../../../static/pinyin.js";
console.log(pinyin)
export { pinyin as $pinyin }
/**
* 获取文本的所有可能搜索形式（原文、拼音、首字母）
* @param {string} text - 要处理的文本
* @returns {string[]} 返回包含原文、全拼、首字母的数组
*/
export const 构建搜索文字组 = (text) => {
    if (!text) return [''];
    return [
        text.toLowerCase(),
        pinyin.getFullChars(text).toLowerCase(),
        pinyin.getCamelChars(text).toLowerCase()
    ];
};



/**
 * 检查文本是否匹配搜索查询
 * @param {string} query - 搜索查询
 * @param {Object} item - 要搜索的项目
 * @param {string[]} searchFields - 要搜索的字段名数组
 * @returns {boolean} 是否匹配
 */
export const 以关键词匹配对象 = (query, item, searchFields = ['label', 'description']) => {
    if (!query) return true;
    return searchFields.some(field => {
        if (!item[field]) return false;
        const searchableTexts = 构建搜索文字组(item[field]);
        return searchableTexts.some(text => text.includes(query.toLowerCase()));
    });
};