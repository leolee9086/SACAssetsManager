/**
 * 从剪贴板读取文本内容，并根据指定的选项处理和筛选数据
 * 
 * @param {Object} options - 配置选项
 * @param {RegExp} [options.regex=/./g] - 用于匹配文本行的正则表达式，默认匹配所有非空行
 * @param {boolean} [options.trim=true] - 是否对每行进行修剪
 * @param {boolean} [options.ignoreEmpty=true] - 是否忽略空行
 * @param {number} [options.maxLines=Infinity] - 返回的最大行数
 * @param {boolean} [options.removeDuplicates=false] - 是否移除重复行
 * @param {string} [options.caseTransform=null] - 大小写转换('upper', 'lower', 'capitalize', null)
 * @param {string} [options.dataType=null] - 数据类型提取('url', 'email', 'phone', 'json', null)
 * @param {boolean} [options.sort=false] - 是否对结果进行排序
 * @param {string} [options.sortDirection='asc'] - 排序方向('asc', 'desc')
 * @param {string} [options.filterPrefix=null] - 按前缀筛选
 * @param {string} [options.filterSuffix=null] - 按后缀筛选
 * @param {number} [options.minLength=0] - 最小行长度
 * @param {number} [options.maxLength=Infinity] - 最大行长度
 * @param {RegExp} [options.removePattern=null] - 用于移除内容的正则表达式
 * @param {Object} [options.replacePatterns=null] - 替换模式 {pattern: RegExp, replacement: string}[]
 * @returns {Promise<string[]|Object>} 返回处理后的数据
 * @throws {Error} 如果无法访问剪贴板，将抛出错误
 * @example
 * // 提取剪贴板中的所有URL
 * const urls = await checkClipboardForRegex({
 *   dataType: 'url'
 * });
 */
export const checkClipboardForRegex = async (options = {}) => {
    const defaultOptions = {
        regex: /./g,
        trim: true,
        ignoreEmpty: true,
        maxLines: Infinity,
        removeDuplicates: false,
        caseTransform: null,
        dataType: null,
        sort: false,
        sortDirection: 'asc',
        filterPrefix: null,
        filterSuffix: null,
        minLength: 0,
        maxLength: Infinity,
        removePattern: null,
        replacePatterns: null
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    try {
        const text = await navigator.clipboard.readText();
        const { 
            regex, trim, ignoreEmpty, maxLines, removeDuplicates,
            caseTransform, dataType, sort, sortDirection,
            filterPrefix, filterSuffix, minLength, maxLength,
            removePattern, replacePatterns
        } = mergedOptions;
        
        // 数据类型预处理 - 根据dataType选择适当的正则表达式
        const dataTypeRegexMap = {
            url: /https?:\/\/[^\s]+/g,
            email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
            phone: /(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})/g,
            json: /\{.*\}/g,
        };
        
        const activeRegex = dataType ? dataTypeRegexMap[dataType] || regex : regex;
        
        // 将剪贴板内容按行分割
        let lines = text.split('\n');
        
        // 应用修剪选项
        if (trim) {
            lines = lines.map(item => item.trim());
        }
        
        // 忽略空行选项
        if (ignoreEmpty) {
            lines = lines.filter(line => line.length > 0);
        }
        
        // 进行大小写转换
        if (caseTransform) {
            lines = lines.map(line => {
                switch(caseTransform) {
                    case 'upper': return line.toUpperCase();
                    case 'lower': return line.toLowerCase();
                    case 'capitalize': return line.charAt(0).toUpperCase() + line.slice(1);
                    default: return line;
                }
            });
        }
        
        // 按长度筛选
        if (minLength > 0 || maxLength < Infinity) {
            lines = lines.filter(line => line.length >= minLength && line.length <= maxLength);
        }
        
        // 按前缀后缀筛选
        if (filterPrefix) {
            lines = lines.filter(line => line.startsWith(filterPrefix));
        }
        
        if (filterSuffix) {
            lines = lines.filter(line => line.endsWith(filterSuffix));
        }
        
        // 移除模式
        if (removePattern) {
            lines = lines.map(line => line.replace(removePattern, ''));
        }
        
        // 替换模式
        if (replacePatterns && Array.isArray(replacePatterns)) {
            lines = lines.map(line => {
                let result = line;
                replacePatterns.forEach(({pattern, replacement}) => {
                    if (pattern instanceof RegExp) {
                        result = result.replace(pattern, replacement);
                    }
                });
                return result;
            });
        }
        
        // 对每一行进行正则验证，并返回匹配的行
        const extractMatches = (line) => {
            const matches = [];
            let match;
            while ((match = activeRegex.exec(line)) !== null) {
                matches.push(match[0]);
            }
            return matches.length > 0 ? matches : null;
        };
        
        // 根据数据类型处理
        let validLines;
        if (dataType && dataTypeRegexMap[dataType]) {
            // 特殊数据类型提取正则匹配项
            const allMatches = [];
            lines.forEach(line => {
                const matches = extractMatches(line);
                if (matches) {
                    allMatches.push(...matches);
                }
            });
            validLines = allMatches;
        } else {
            validLines = lines.filter(line => line.match(activeRegex));
        }
        
        // 移除重复项
        if (removeDuplicates) {
            validLines = [...new Set(validLines)];
        }
        
        // 排序
        if (sort) {
            validLines = validLines.sort();
            if (sortDirection === 'desc') {
                validLines = validLines.reverse();
            }
        }
        
        // 应用最大行数限制
        return validLines.slice(0, maxLines);
    } catch (error) {
        console.error("无法读取剪贴板内容:", error);
        throw error; // 重新抛出错误以便调用者处理
    }
};

/**
 * 将处理后的文本写回剪贴板
 * 
 * @param {Object} options - 配置选项
 * @param {string|string[]} options.content - 要写入剪贴板的内容，可以是字符串或字符串数组
 * @param {string} [options.joinWith='\n'] - 将数组连接为字符串时使用的分隔符
 * @param {boolean} [options.appendOriginal=false] - 是否追加到原始剪贴板内容
 * @returns {Promise<void>} 操作完成的Promise
 * @throws {Error} 如果无法访问剪贴板，将抛出错误
 */
export const writeToClipboard = async (options = {}) => {
    const defaultOptions = {
        joinWith: '\n',
        appendOriginal: false
    };
    
    const { content } = options;
    if (content === undefined) {
        throw new Error('写入剪贴板时必须提供content参数');
    }
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    try {
        const { joinWith, appendOriginal } = mergedOptions;
        
        // 处理输入内容
        let finalContent = '';
        
        if (Array.isArray(content)) {
            finalContent = content.join(joinWith);
        } else if (typeof content === 'string') {
            finalContent = content;
        } else {
            finalContent = String(content);
        }
        
        // 如果需要追加到原始内容
        if (appendOriginal) {
            const originalContent = await navigator.clipboard.readText();
            finalContent = originalContent + joinWith + finalContent;
        }
        
        await navigator.clipboard.writeText(finalContent);
    } catch (error) {
        console.error("无法写入剪贴板:", error);
        throw error;
    }
};

/**
 * 解析剪贴板中的结构化数据
 * 
 * @param {Object} options - 配置选项
 * @param {string} [options.format='auto'] - 数据格式 ('json', 'csv', 'tsv', 'auto')
 * @param {string} [options.csvDelimiter=','] - CSV分隔符
 * @param {boolean} [options.csvHeader=true] - CSV是否包含表头
 * @returns {Promise<Object|Array>} 解析后的数据
 * @throws {Error} 如果无法访问剪贴板或数据格式不符，将抛出错误
 */
export const parseClipboardData = async (options = {}) => {
    const defaultOptions = {
        format: 'auto',
        csvDelimiter: ',',
        csvHeader: true
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    try {
        const { format, csvDelimiter, csvHeader } = mergedOptions;
        const text = await navigator.clipboard.readText();
        
        // 自动检测格式
        let detectedFormat = format;
        if (format === 'auto') {
            if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
                detectedFormat = 'json';
            } else if (text.includes(',')) {
                detectedFormat = 'csv';
            } else if (text.includes('\t')) {
                detectedFormat = 'tsv';
            } else {
                return text.split('\n').filter(line => line.trim().length > 0);
            }
        }
        
        switch (detectedFormat) {
            case 'json':
                try {
                    return JSON.parse(text);
                } catch (e) {
                    throw new Error('剪贴板中的内容不是有效的JSON格式');
                }
                
            case 'csv':
            case 'tsv': {
                const delimiter = detectedFormat === 'csv' ? csvDelimiter : '\t';
                const lines = text.split('\n').filter(line => line.trim());
                if (lines.length === 0) return [];
                
                const result = [];
                let headers = [];
                
                const startIndex = csvHeader ? 1 : 0;
                if (csvHeader) {
                    headers = lines[0].split(delimiter).map(h => h.trim());
                }
                
                for (let i = startIndex; i < lines.length; i++) {
                    const values = lines[i].split(delimiter);
                    if (csvHeader) {
                        const row = {};
                        headers.forEach((header, index) => {
                            row[header] = values[index] ? values[index].trim() : '';
                        });
                        result.push(row);
                    } else {
                        result.push(values.map(v => v.trim()));
                    }
                }
                
                return result;
            }
                
            default:
                return text;
        }
    } catch (error) {
        console.error("解析剪贴板数据失败:", error);
        throw error;
    }
};

/**
 * 剪贴板操作与数据处理工具
 */

// ========================
// 基础剪贴板操作
// ========================

/**
 * 从剪贴板读取文本内容
 * 
 * @returns {Promise<string>} 剪贴板中的文本内容
 * @throws {Error} 如果无法访问剪贴板，将抛出错误
 */
export const readFromClipboard = async () => {
    try {
        return await navigator.clipboard.readText();
    } catch (error) {
        console.error("无法读取剪贴板内容:", error);
        throw error;
    }
};

// ========================
// 文本处理工具 - 基础操作
// ========================

/**
 * 分割文本为行并进行基础清理
 * 
 * @param {Object} options - 处理选项
 * @param {string} options.text - 输入文本
 * @param {boolean} [options.trim=true] - 是否对每行进行修剪
 * @param {boolean} [options.ignoreEmpty=true] - 是否忽略空行
 * @returns {string[]} 处理后的文本行
 */
export const splitAndCleanLines = (options = {}) => {
    const defaultOptions = {
        trim: true, 
        ignoreEmpty: true
    };
    
    if (!options.text) {
        throw new Error('必须提供text参数');
    }
    
    const mergedOptions = { ...defaultOptions, ...options };
    const { text, trim, ignoreEmpty } = mergedOptions;
    
    // 分割为行
    let lines = text.split('\n');
    
    // 修剪处理
    if (trim) {
        lines = lines.map(line => line.trim());
    }
    
    // 忽略空行
    if (ignoreEmpty) {
        lines = lines.filter(line => line.length > 0);
    }
    
    return lines;
};

/**
 * 对文本行进行大小写转换
 * 
 * @param {Object} options - 处理选项
 * @param {string[]} options.lines - 文本行数组
 * @param {string} options.caseTransform - 大小写转换类型('upper', 'lower', 'capitalize', null)
 * @returns {string[]} 处理后的文本行
 */
export const transformCase = (options = {}) => {
    const { lines, caseTransform } = options;
    
    if (!lines || !Array.isArray(lines)) {
        throw new Error('必须提供lines数组参数');
    }
    
    if (!caseTransform) return lines;
    
    return lines.map(line => {
        switch(caseTransform) {
            case 'upper': return line.toUpperCase();
            case 'lower': return line.toLowerCase();
            case 'capitalize': return line.charAt(0).toUpperCase() + line.slice(1);
            default: return line;
        }
    });
};

/**
 * 按长度和前缀后缀筛选文本行
 * 
 * @param {Object} options - 筛选选项
 * @param {string[]} options.lines - 文本行数组
 * @param {number} [options.minLength=0] - 最小行长度
 * @param {number} [options.maxLength=Infinity] - 最大行长度
 * @param {string} [options.filterPrefix=null] - 按前缀筛选
 * @param {string} [options.filterSuffix=null] - 按后缀筛选
 * @returns {string[]} 筛选后的文本行
 */
export const filterLinesByProperties = (options = {}) => {
    const defaultOptions = {
        minLength: 0,
        maxLength: Infinity,
        filterPrefix: null,
        filterSuffix: null
    };
    
    const { lines } = options;
    if (!lines || !Array.isArray(lines)) {
        throw new Error('必须提供lines数组参数');
    }
    
    const mergedOptions = { ...defaultOptions, ...options };
    const { minLength, maxLength, filterPrefix, filterSuffix } = mergedOptions;
    
    let result = [...lines];
    
    // 按长度筛选
    if (minLength > 0 || maxLength < Infinity) {
        result = result.filter(line => line.length >= minLength && line.length <= maxLength);
    }
    
    // 按前缀筛选
    if (filterPrefix) {
        result = result.filter(line => line.startsWith(filterPrefix));
    }
    
    // 按后缀筛选
    if (filterSuffix) {
        result = result.filter(line => line.endsWith(filterSuffix));
    }
    
    return result;
};

/**
 * 对文本行内容进行转换（移除和替换）
 * 
 * @param {Object} options - 转换选项
 * @param {string[]} options.lines - 文本行数组
 * @param {RegExp} [options.removePattern=null] - 用于移除内容的正则表达式
 * @param {Array} [options.replacePatterns=null] - 替换模式 {pattern: RegExp, replacement: string}[]
 * @returns {string[]} 转换后的文本行
 */
export const transformContent = (options = {}) => {
    const defaultOptions = {
        removePattern: null,
        replacePatterns: null
    };
    
    const { lines } = options;
    if (!lines || !Array.isArray(lines)) {
        throw new Error('必须提供lines数组参数');
    }
    
    const mergedOptions = { ...defaultOptions, ...options };
    const { removePattern, replacePatterns } = mergedOptions;
    
    let result = [...lines];
    
    // 移除模式
    if (removePattern) {
        result = result.map(line => line.replace(removePattern, ''));
    }
    
    // 替换模式
    if (replacePatterns && Array.isArray(replacePatterns)) {
        result = result.map(line => {
            let processed = line;
            replacePatterns.forEach(({pattern, replacement}) => {
                if (pattern instanceof RegExp) {
                    processed = processed.replace(pattern, replacement);
                }
            });
            return processed;
        });
    }
    
    return result;
};

/**
 * 最终处理文本行（去重、排序、限制数量）
 * 
 * @param {Object} options - 处理选项
 * @param {string[]} options.lines - 文本行数组
 * @param {boolean} [options.removeDuplicates=false] - 是否移除重复行
 * @param {boolean} [options.sort=false] - 是否排序
 * @param {string} [options.sortDirection='asc'] - 排序方向('asc', 'desc')
 * @param {number} [options.maxLines=Infinity] - 最大返回行数
 * @returns {string[]} 最终处理后的文本行
 */
export const finalizeResults = (options = {}) => {
    const defaultOptions = {
        removeDuplicates: false,
        sort: false,
        sortDirection: 'asc',
        maxLines: Infinity
    };
    
    const { lines } = options;
    if (!lines || !Array.isArray(lines)) {
        throw new Error('必须提供lines数组参数');
    }
    
    const mergedOptions = { ...defaultOptions, ...options };
    const { removeDuplicates, sort, sortDirection, maxLines } = mergedOptions;
    
    let result = [...lines];
    
    // 移除重复项
    if (removeDuplicates) {
        result = [...new Set(result)];
    }
    
    // 排序
    if (sort) {
        result = result.sort();
        if (sortDirection === 'desc') {
            result = result.reverse();
        }
    }
    
    // 应用最大行数限制
    return result.slice(0, maxLines);
};

// ========================
// 文本处理工具 - 集成功能
// ========================

/**
 * 文本行处理与转换（整合版）
 * 
 * @param {Object} options - 所有处理选项
 * @param {string} options.text - 输入文本
 * @param {boolean} [options.trim=true] - 是否对每行进行修剪
 * @param {boolean} [options.ignoreEmpty=true] - 是否忽略空行
 * @param {string} [options.caseTransform=null] - 大小写转换类型
 * @param {boolean} [options.removeDuplicates=false] - 是否移除重复行
 * @param {boolean} [options.sort=false] - 是否排序
 * @param {string} [options.sortDirection='asc'] - 排序方向
 * @param {number} [options.maxLines=Infinity] - 最大返回行数
 * @returns {string[]} 处理后的文本行
 */
export const processText = (options = {}) => {
    const { text } = options;
    if (!text) {
        throw new Error('必须提供text参数');
    }
    
    // 1. 分割并清理行
    const lines = splitAndCleanLines({ text, ...options });
    
    // 2. 大小写转换
    const casedLines = transformCase({ lines, caseTransform: options.caseTransform });
    
    // 3. 按属性筛选
    const filteredLines = filterLinesByProperties({ lines: casedLines, ...options });
    
    // 4. 内容转换
    const transformedLines = transformContent({ lines: filteredLines, ...options });
    
    // 5. 最终处理
    return finalizeResults({ lines: transformedLines, ...options });
};

// ========================
// 正则匹配与提取工具
// ========================

/**
 * 获取数据类型对应的正则表达式
 * 
 * @param {Object} options - 提取选项
 * @param {string} options.dataType - 数据类型
 * @param {RegExp} [options.defaultRegex=/./g] - 默认正则表达式
 * @returns {RegExp} 对应的正则表达式
 */
export const getDataTypeRegex = (options = {}) => {
    const { dataType, defaultRegex = /./g } = options;
    
    // 数据类型预设正则
    const dataTypeRegexMap = {
        url: /https?:\/\/[^\s]+/g,
        email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        phone: /(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})/g,
        json: /\{.*\}/g,
    };
    
    return dataType ? dataTypeRegexMap[dataType] || defaultRegex : defaultRegex;
};

/**
 * 从文本行中提取所有匹配项
 * 
 * @param {Object} options - 提取选项
 * @param {string} options.line - 文本行
 * @param {RegExp} options.regex - 用于匹配的正则表达式
 * @returns {string[]|null} 匹配项数组或null
 */
export const extractMatchesFromLine = (options = {}) => {
    const { line, regex } = options;
    
    if (!line) {
        throw new Error('必须提供line参数');
    }
    
    if (!regex || !(regex instanceof RegExp)) {
        throw new Error('必须提供有效的regex参数');
    }
    
    const matches = [];
    // 需要重置正则表达式的lastIndex
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(line)) !== null) {
        matches.push(match[0]);
    }
    return matches.length > 0 ? matches : null;
};

/**
 * 从多行文本中提取所有匹配项
 * 
 * @param {Object} options - 提取选项
 * @param {string[]} options.lines - 文本行数组
 * @param {RegExp} options.regex - 用于匹配的正则表达式
 * @returns {string[]} 所有匹配项数组
 */
export const extractAllMatches = (options = {}) => {
    const { lines, regex } = options;
    
    if (!lines || !Array.isArray(lines)) {
        throw new Error('必须提供lines数组参数');
    }
    
    if (!regex || !(regex instanceof RegExp)) {
        throw new Error('必须提供有效的regex参数');
    }
    
    const allMatches = [];
    lines.forEach(line => {
        const matches = extractMatchesFromLine({ line, regex });
        if (matches) {
            allMatches.push(...matches);
        }
    });
    return allMatches;
};

/**
 * 筛选匹配正则表达式的行
 * 
 * @param {Object} options - 筛选选项
 * @param {string[]} options.lines - 文本行数组
 * @param {RegExp} options.regex - 用于匹配的正则表达式
 * @returns {string[]} 匹配的行
 */
export const filterMatchingLines = (options = {}) => {
    const { lines, regex } = options;
    
    if (!lines || !Array.isArray(lines)) {
        throw new Error('必须提供lines数组参数');
    }
    
    if (!regex || !(regex instanceof RegExp)) {
        throw new Error('必须提供有效的regex参数');
    }
    
    return lines.filter(line => {
        regex.lastIndex = 0;
        return regex.test(line);
    });
};

/**
 * 正则匹配与提取（整合版）
 * 
 * @param {Object} options - 匹配选项
 * @param {string[]} options.lines - 文本行数组
 * @param {RegExp} [options.regex=/./g] - 用于匹配的正则表达式
 * @param {string} [options.dataType=null] - 数据类型
 * @param {boolean} [options.extractAll=false] - 是否提取所有匹配项
 * @returns {string[]} 匹配的行或提取的内容
 */
export const matchAndExtract = (options = {}) => {
    const defaultOptions = {
        regex: /./g,
        dataType: null,
        extractAll: false
    };
    
    const { lines } = options;
    if (!lines || !Array.isArray(lines)) {
        throw new Error('必须提供lines数组参数');
    }
    
    const mergedOptions = { ...defaultOptions, ...options };
    const { regex, dataType, extractAll } = mergedOptions;
    
    // 获取正则表达式
    const activeRegex = getDataTypeRegex({ dataType, defaultRegex: regex });
    
    // 根据需求选择处理方式
    if (extractAll) {
        return extractAllMatches({ lines, regex: activeRegex });
    } else {
        return filterMatchingLines({ lines, regex: activeRegex });
    }
};

// ========================
// 数据格式解析工具
// ========================

/**
 * 检测文本数据的格式
 * 
 * @param {Object} options - 检测选项
 * @param {string} options.text - 文本数据
 * @param {string} [options.defaultFormat='text'] - 默认格式
 * @returns {string} 检测到的格式
 */
export const detectTextFormat = (options = {}) => {
    const { text, defaultFormat = 'text' } = options;
    
    if (!text) {
        throw new Error('必须提供text参数');
    }
    
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        return 'json';
    } else if (text.includes(',')) {
        return 'csv';
    } else if (text.includes('\t')) {
        return 'tsv';
    }
    return defaultFormat;
};

/**
 * 解析JSON格式文本
 * 
 * @param {Object} options - 解析选项
 * @param {string} options.text - JSON格式文本
 * @returns {Object|Array} 解析后的对象
 * @throws {Error} 如果解析失败
 */
export const parseJsonText = (options = {}) => {
    const { text } = options;
    
    if (!text) {
        throw new Error('必须提供text参数');
    }
    
    try {
        return JSON.parse(text);
    } catch (e) {
        throw new Error('无效的JSON格式');
    }
};

/**
 * 解析分隔符格式文本（CSV/TSV）
 * 
 * @param {Object} options - 解析选项
 * @param {string} options.text - 分隔符格式文本
 * @param {string} [options.delimiter=','] - 分隔符
 * @param {boolean} [options.hasHeader=true] - 是否包含表头
 * @returns {Array} 解析后的数据
 */
export const parseDelimitedText = (options = {}) => {
    const defaultOptions = {
        delimiter: ',', 
        hasHeader: true
    };
    
    const { text } = options;
    if (!text) {
        throw new Error('必须提供text参数');
    }
    
    const mergedOptions = { ...defaultOptions, ...options };
    const { delimiter, hasHeader } = mergedOptions;
    
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const result = [];
    let headers = [];
    
    const startIndex = hasHeader ? 1 : 0;
    if (hasHeader) {
        headers = lines[0].split(delimiter).map(h => h.trim());
    }
    
    for (let i = startIndex; i < lines.length; i++) {
        const values = lines[i].split(delimiter);
        if (hasHeader) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] ? values[index].trim() : '';
            });
            result.push(row);
        } else {
            result.push(values.map(v => v.trim()));
        }
    }
    
    return result;
};

/**
 * 解析不同格式的文本数据（整合版）
 * 
 * @param {Object} options - 解析选项
 * @param {string} options.text - 要解析的文本
 * @param {string} [options.format='auto'] - 数据格式
 * @param {string} [options.delimiter=','] - 分隔符
 * @param {boolean} [options.hasHeader=true] - 是否包含表头
 * @returns {Array|Object} 解析后的数据
 */
export const parseTextData = (options = {}) => {
    const defaultOptions = {
        format: 'auto',
        delimiter: ',',
        hasHeader: true
    };
    
    const { text } = options;
    if (!text) {
        throw new Error('必须提供text参数');
    }
    
    const mergedOptions = { ...defaultOptions, ...options };
    const { format, delimiter, hasHeader } = mergedOptions;
    
    // 自动检测格式或使用指定格式
    const detectedFormat = format === 'auto' 
        ? detectTextFormat({ text }) 
        : format;
    
    switch (detectedFormat) {
        case 'json':
            return parseJsonText({ text });
            
        case 'csv':
            return parseDelimitedText({ text, delimiter, hasHeader });
            
        case 'tsv':
            return parseDelimitedText({ text, delimiter: '\t', hasHeader });
            
        default:
            return splitAndCleanLines({ text });
    }
};

// ========================
// 集成功能函数
// ========================

/**
 * 从剪贴板读取并处理文本
 * 
 * @param {Object} options - 所有处理选项的组合
 * @returns {Promise<string[]>} 处理后的结果
 * @example
 * // 提取剪贴板中的所有URL，移除重复项并排序
 * const urls = await processClipboardText({
 *   dataType: 'url',
 *   removeDuplicates: true,
 *   sort: true
 * });
 */
export const processClipboardText = async (options = {}) => {
    // 从剪贴板读取文本
    const text = await readFromClipboard();
    
    // 处理文本为行
    const lines = processText({ text, ...options });
    
    // 如果指定了数据类型或正则表达式，进行匹配和提取
    if (options.dataType || options.regex) {
        return matchAndExtract({
            lines,
            regex: options.regex,
            dataType: options.dataType,
            extractAll: options.dataType != null || options.extractAll === true
        });
    }
    
    return lines;
};

// ========================
// 导出向后兼容的别名
// ========================

// 兼容旧版API
export const readClipboard = readFromClipboard;
export const writeClipboard = writeToClipboard;
export { checkClipboardForRegex };