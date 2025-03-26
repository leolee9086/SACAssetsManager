/**
 * 获取值的类型
 * @param {Object} options - 选项对象
 * @param {*} options.value - 需要检查类型的值
 * @returns {string} 类型名称
 */
function getValueType({ value }) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

/**
 * 检查路径是否在忽略列表中
 * @param {Object} options - 选项对象
 * @param {string} options.path - 要检查的路径
 * @param {string[]} options.ignorePaths - 忽略路径列表
 * @returns {boolean} 是否应该忽略
 */
function shouldIgnorePath({ path, ignorePaths }) {
    return ignorePaths.some(ignorePath => 
        path === ignorePath || path.startsWith(ignorePath + '.'));
}

/**
 * 比较简单类型值
 * @param {Object} context - 上下文对象
 * @param {*} context.source - 源值
 * @param {*} context.target - 目标值
 * @param {string} context.sourceType - 源值类型
 * @param {string} context.sourceLabel - 源标签
 * @param {string} context.targetLabel - 目标标签
 * @param {Object} context.summary - 统计对象
 * @returns {Object} 比较结果
 */
function compareSimpleValues({ source, target, sourceType, sourceLabel, targetLabel, summary }) {
    const isEqual = source === target;
    summary[isEqual ? 'identical' : 'modified']++;
    
    return isEqual
        ? { isIdentical: true, status: 'identical', type: sourceType }
        : {
            isIdentical: false,
            status: 'modified',
            type: sourceType,
            valuePair: {
                [sourceLabel]: source,
                [targetLabel]: target
            }
        };
}

/**
 * 比较数组值（忽略顺序）
 * @param {Object} context - 上下文对象
 * @param {Array} context.source - 源数组
 * @param {Array} context.target - 目标数组
 * @param {string} context.sourceLabel - 源标签
 * @param {string} context.targetLabel - 目标标签
 * @param {Object} context.summary - 统计对象
 * @returns {Object} 比较结果
 */
function compareArraysIgnoreOrder({ source, target, sourceLabel, targetLabel, summary }) {
    if (source.length !== target.length) {
        summary.modified++;
        return {
            isIdentical: false,
            status: 'modified',
            type: 'array',
            valuePair: {
                [sourceLabel]: source,
                [targetLabel]: target
            }
        };
    }
    
    // 简化实现，对简单数组有效
    const sortedSource = [...source].sort();
    const sortedTarget = [...target].sort();
    const serializedSource = JSON.stringify(sortedSource);
    const serializedTarget = JSON.stringify(sortedTarget);
    
    const isEqual = serializedSource === serializedTarget;
    summary[isEqual ? 'identical' : 'modified']++;
    
    return isEqual
        ? { isIdentical: true, status: 'identical', type: 'array' }
        : {
            isIdentical: false,
            status: 'modified',
            type: 'array',
            valuePair: {
                [sourceLabel]: source,
                [targetLabel]: target
            }
        };
}

/**
 * 递归比较对象或数组
 * @param {Object} context - 上下文对象
 * @param {*} context.source - 源值
 * @param {*} context.target - 目标值
 * @param {string} context.path - 当前路径
 * @param {string} context.sourceLabel - 源标签
 * @param {string} context.targetLabel - 目标标签
 * @param {Object} context.options - 配置选项
 * @param {Object} context.summary - 统计对象
 * @returns {Object} 比较结果
 */
function compareDeepValues({ source, target, path, sourceLabel, targetLabel, options, summary }) {
    const { ignoreArrayOrder, ignorePaths, customCompare } = options;
    
    // 检查是否应该忽略此路径
    if (shouldIgnorePath({ path, ignorePaths })) {
        return { isIdentical: true, status: 'identical', type: getValueType({ value: source }) };
    }
    
    // 如果提供了自定义比较函数，则使用它
    if (customCompare && typeof customCompare === 'function') {
        const isEqual = customCompare(source, target);
        if (isEqual) {
            summary.identical++;
            return { isIdentical: true, status: 'identical', type: getValueType({ value: source }) };
        }
    }
    
    // 获取类型
    const sourceType = getValueType({ value: source });
    const targetType = getValueType({ value: target });
    
    // 类型不同，直接返回不相等
    if (sourceType !== targetType) {
        summary.modified++;
        return {
            isIdentical: false,
            status: 'modified',
            type: `${sourceType}→${targetType}`,
            valuePair: {
                [sourceLabel]: source,
                [targetLabel]: target
            }
        };
    }
    
    // 简单类型的比较
    if (sourceType !== 'object' && sourceType !== 'array') {
        return compareSimpleValues({ source, target, sourceType, sourceLabel, targetLabel, summary });
    }
    
    // 数组的特殊处理
    if (sourceType === 'array') {
        if (ignoreArrayOrder) {
            return compareArraysIgnoreOrder({ source, target, sourceLabel, targetLabel, summary });
        } else {
            return compareArraysWithOrder({ source, target, path, sourceLabel, targetLabel, options, summary });
        }
    }
    
    // 对象比较
    return compareObjects({ source, target, path, sourceLabel, targetLabel, options, summary });
}

/**
 * 比较数组（考虑顺序）
 * @param {Object} context - 上下文对象
 * @param {Array} context.source - 源数组
 * @param {Array} context.target - 目标数组
 * @param {string} context.path - 当前路径
 * @param {string} context.sourceLabel - 源标签
 * @param {string} context.targetLabel - 目标标签
 * @param {Object} context.options - 配置选项
 * @param {Object} context.summary - 统计对象
 * @returns {Object} 比较结果
 */
function compareArraysWithOrder({ source, target, path, sourceLabel, targetLabel, options, summary }) {
    if (source.length !== target.length) {
        summary.modified++;
        return {
            isIdentical: false,
            status: 'modified',
            type: 'array',
            valuePair: {
                [sourceLabel]: source,
                [targetLabel]: target
            }
        };
    }
    
    const arrayDiff = {};
    let isArrayIdentical = true;
    
    for (let i = 0; i < source.length; i++) {
        const itemPath = path ? `${path}[${i}]` : `[${i}]`;
        const comparison = compareDeepValues({
            source: source[i], 
            target: target[i], 
            path: itemPath, 
            sourceLabel, 
            targetLabel, 
            options, 
            summary
        });
        
        if (!comparison.isIdentical) {
            isArrayIdentical = false;
            arrayDiff[i] = comparison;
        }
    }
    
    return isArrayIdentical
        ? { isIdentical: true, status: 'identical', type: 'array' }
        : {
            isIdentical: false,
            status: 'modified',
            type: 'array',
            details: arrayDiff,
            valuePair: {
                [sourceLabel]: source,
                [targetLabel]: target
            }
        };
}

/**
 * 比较对象
 * @param {Object} context - 上下文对象
 * @param {Object} context.source - 源对象
 * @param {Object} context.target - 目标对象
 * @param {string} context.path - 当前路径
 * @param {string} context.sourceLabel - 源标签
 * @param {string} context.targetLabel - 目标标签
 * @param {Object} context.options - 配置选项
 * @param {Object} context.summary - 统计对象
 * @returns {Object} 比较结果
 */
function compareObjects({ source, target, path, sourceLabel, targetLabel, options, summary }) {
    const sourceKeys = Object.keys(source);
    const targetKeys = Object.keys(target);
    const allKeys = [...new Set([...sourceKeys, ...targetKeys])];
    
    const objectDiff = {};
    let isObjectIdentical = true;
    
    for (const key of allKeys) {
        const keyPath = path ? `${path}.${key}` : key;
        
        // 检查键是否存在于两个对象中
        if (!sourceKeys.includes(key)) {
            isObjectIdentical = false;
            summary.added++;
            objectDiff[key] = {
                isIdentical: false,
                status: 'added',
                type: getValueType({ value: target[key] }),
                valuePair: {
                    [sourceLabel]: undefined,
                    [targetLabel]: target[key]
                }
            };
            continue;
        }
        
        if (!targetKeys.includes(key)) {
            isObjectIdentical = false;
            summary.removed++;
            objectDiff[key] = {
                isIdentical: false,
                status: 'removed',
                type: getValueType({ value: source[key] }),
                valuePair: {
                    [sourceLabel]: source[key],
                    [targetLabel]: undefined
                }
            };
            continue;
        }
        
        // 递归比较子属性
        const comparison = compareDeepValues({
            source: source[key], 
            target: target[key], 
            path: keyPath, 
            sourceLabel, 
            targetLabel, 
            options, 
            summary
        });
        if (!comparison.isIdentical) {
            isObjectIdentical = false;
            objectDiff[key] = comparison;
        }
    }
    
    return isObjectIdentical
        ? { isIdentical: true, status: 'identical', type: 'object' }
        : {
            isIdentical: false,
            status: 'modified',
            type: 'object',
            details: objectDiff
        };
}

/**
 * 处理比较的边缘情况
 * @param {Object} options - 选项对象
 * @param {*} options.sourceObject - 源对象
 * @param {*} options.targetObject - 目标对象
 * @param {string} options.sourceLabel - 源标签
 * @param {string} options.targetLabel - 目标标签
 * @returns {Object|null} 如果是边缘情况则返回结果,否则返回null
 */
function handleEdgeCases({ sourceObject, targetObject, sourceLabel, targetLabel }) {
    // 都为null的情况
    if (sourceObject === null && targetObject === null) {
        return { 
            areIdentical: true, 
            diffReport: {}, 
            summary: { identical: 0, modified: 0, added: 0, removed: 0 } 
        };
    }
    
    // 一个为null/undefined的情况
    if (sourceObject === null || targetObject === null || 
        sourceObject === undefined || targetObject === undefined) {
        return {
            areIdentical: false,
            diffReport: {
                '': {
                    isIdentical: false,
                    status: 'modified',
                    type: 'root',
                    valuePair: {
                        [sourceLabel]: sourceObject,
                        [targetLabel]: targetObject
                    }
                }
            },
            summary: { identical: 0, modified: 1, added: 0, removed: 0 }
        };
    }
    
    return null;
}

/**
 * 比较两个对象并返回详细差异报告
 * @description 此函数深度比较两个对象的每个属性值,能处理嵌套对象和数组,并生成详细的差异报告
 * @param {Object} options - 选项对象
 * @param {Object} options.sourceObject - 第一个待比较对象
 * @param {Object} options.targetObject - 第二个待比较对象
 * @param {string} [options.sourceLabel='obj1'] - 在结果中表示第一个对象的标签名
 * @param {string} [options.targetLabel='obj2'] - 在结果中表示第二个对象的标签名
 * @param {boolean} [options.ignoreArrayOrder=false] - 是否忽略数组中元素的顺序
 * @param {string[]} [options.ignorePaths=[]] - 忽略比较的路径列表,如 ['user.address', 'metadata']
 * @param {Function} [options.customCompare] - 自定义比较函数,接收(value1,value2)返回布尔值
 * @returns {Object} 比较结果对象
 * @returns {boolean} result.areIdentical - 表示两个对象是否完全一致
 * @returns {Object} result.diffReport - 包含每个属性的详细比较结果
 * @returns {Object} result.diffReport[key] - 每个键的比较结果
 * @returns {boolean} result.diffReport[key].isIdentical - 该键的值是否在两个对象中一致
 * @returns {string} result.diffReport[key].status - 状态: 'identical'|'modified'|'added'|'removed'
 * @returns {Object|undefined} result.diffReport[key].valuePair - 当值不一致时,包含两个对象中该键的值
 * @returns {string} result.diffReport[key].type - 值的类型
 * @returns {Object} [result.summary] - 差异摘要统计
 * @example
 * // 比较两个嵌套对象
 * const sourceObject = { user: { name: '张三', age: 30, address: { city: '北京' } } };
 * const targetObject = { user: { name: '张三', age: 31, address: { city: '上海' } } };
 * const result = compareObjectsDeep({ sourceObject, targetObject });
 */
function compareObjectsDeep({ 
    sourceObject, 
    targetObject, 
    sourceLabel = 'obj1', 
    targetLabel = 'obj2',
    ignoreArrayOrder = false,
    ignorePaths = [],
    customCompare = null
}) {
    // 处理选项
    const options = { 
        ignoreArrayOrder,
        ignorePaths,
        customCompare
    };
    
    // 处理边缘情况
    const edgeCaseResult = handleEdgeCases({ sourceObject, targetObject, sourceLabel, targetLabel });
    if (edgeCaseResult !== null) {
        return edgeCaseResult;
    }
    
    // 统计信息
    const summary = { identical: 0, modified: 0, added: 0, removed: 0 };
    
    // 执行比较
    const result = compareDeepValues({
        source: sourceObject, 
        target: targetObject, 
        path: '', 
        sourceLabel, 
        targetLabel, 
        options, 
        summary
    });
    
    // 构造返回结果
    const diffReport = result.isIdentical ? {} : (result.details || {});
    
    return {
        areIdentical: result.isIdentical,
        diffReport: diffReport,
        summary: summary
    };
}
  