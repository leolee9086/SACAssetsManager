import { UltraFastFingerprint } from '../utils/hash/fastBlake.js';

const hasher = new UltraFastFingerprint();

/**
 * 生成基于内容的唯一标识符
 * @param {Object} content - 需要生成ID的内容对象
 * @param {string} [prefix='urt'] - ID前缀
 * @returns {string} 唯一标识符
 */
export function generateContentId(content, prefix = 'urt') {
    // 创建规范化的内容字符串
    const normalized = normalizeContent(content);
    // 使用fastBlake计算哈希
    const hash = hasher.hashFunction(Buffer.from(normalized));
    // 返回带前缀的标识符
    return `${prefix}_${hash}`;
}

/**
 * 规范化内容对象，确保生成一致的哈希
 * @param {Object} content - 需要规范化的内容
 * @returns {string} 规范化后的JSON字符串
 */
function normalizeContent(content) {
    const normalized = {
        type: content.type || '',
        name: content.name || '',
        path: content.path || '',
        url: content.url || '',
        modified: content.meta?.modified || Date.now(),
        extra: content.extra || {}
    };

    // 递归排序所有对象的键
    return JSON.stringify(normalized, (key, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return Object.keys(value).sort().reduce((sorted, key) => {
                sorted[key] = value[key];
                return sorted;
            }, {});
        }
        return value;
    });
}
