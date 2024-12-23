// 通用分组函数
export const 按属性名分组 = (array, key, defaultGroups = {}) => {
    return array.reduce((groups, item) => {
        const groupKey = item[key];
        if (!groups[groupKey]) {
            groups[groupKey] = [];
        }
        groups[groupKey].push(item);
        return groups;
    }, { ...defaultGroups });
};

/**
 * 按指定属性值数组进行过滤和分组
 * @param {Array} array - 要分组的数组
 * @param {string} key - 分组的键名
 * @param {Array} allowedValues - 允许的值数组
 * @param {Object} defaultGroups - 默认分组对象
 * @returns {Object} 分组后的对象
 */
export const 按指定值分组 = (array, key, allowedValues, defaultGroups = {}) => {
    // 创建允许值的Set以提高查找效率
    const allowedSet = new Set(allowedValues);
    return array.reduce((groups, item) => {
        const groupKey = item[key];
        // 只有当值在允许列表中时才进行分组
        if (allowedSet.has(groupKey)) {
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(item);
        }
        return groups;
    }, { ...defaultGroups });
};

/**
 * 多级分组函数
 * @param {Array} array - 要分组的数组
 * @param {string[]} keys - 分组的键名数组，按顺序进行多级分组
 * @param {Object} defaultGroups - 默认分组对象
 * @returns {Object} 分组后的对象
 */
export const 多级分组 = (array, keys, defaultGroups = {}) => {
    if (!keys.length) return array;
    
    return keys.reduce((result, key) => {
        if (Array.isArray(result)) {
            // 第一次分组
            return 按属性名分组(result, key);
        } else {
            // 递归处理每个子组
            return Object.entries(result).reduce((acc, [groupKey, groupArray]) => {
                acc[groupKey] = 按属性名分组(groupArray, key);
                return acc;
            }, {});
        }
    }, array);
};
