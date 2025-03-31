/**
 * 日志格式化模块
 * 提供日志格式化和序列化功能
 */

// 用于检测循环引用
const seen = new WeakSet();

/**
 * 检测字符串是否为图片URL
 * @param {string} 内容 - 要检测的字符串
 * @returns {boolean} 是否为图片URL
 */
export const 是否为图片URL = (内容) => {
    if (typeof 内容 !== 'string') return false;
    
    // 检查是否为URL
    try {
        const url = new URL(内容);
        
        // 检查是否为图片扩展名
        const 图片扩展名 = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
        return 图片扩展名.some(ext => url.pathname.toLowerCase().endsWith(ext));
    } catch (e) {
        // 不是有效URL
        return false;
    }
};

/**
 * 检测字符串是否为Base64编码的图片
 * @param {string} 内容 - 要检测的字符串
 * @returns {boolean} 是否为Base64编码的图片
 */
export const 是否为Base64图片 = (内容) => {
    if (typeof 内容 !== 'string') return false;
    
    // 检查是否为Base64编码的图片数据
    return /^data:image\/(jpeg|png|gif|webp|svg\+xml|bmp);base64,/.test(内容);
};

/**
 * 格式化对象参数
 * @param {any} 参数 - 需要格式化的参数
 * @returns {string|Object} 格式化后的字符串或对象（图片情况下）
 */
export const 格式化参数 = (参数) => {
    if (参数 === undefined) return 'undefined';
    if (参数 === null) return 'null';
    
    if (typeof 参数 === 'string') {
        // 检测是否为图片URL或Base64
        if (是否为图片URL(参数) || 是否为Base64图片(参数)) {
            return {
                类型: '图片',
                值: 参数,
                描述: 是否为Base64图片(参数) ? 'Base64图片' : '图片URL'
            };
        }
        
        // 尝试检测已经是JSON字符串的情况，避免重复转义
        if (参数.startsWith('{') && 参数.endsWith('}') || 
            参数.startsWith('[') && 参数.endsWith(']')) {
            try {
                // 尝试解析，如果成功，说明已经是有效的JSON字符串
                JSON.parse(参数);
                return 参数; // 直接返回原始字符串，不再二次转义
            } catch (e) {
                // 解析失败，说明不是有效JSON，按普通字符串处理
            }
        }
        // 检测是否已有连续多个反斜杠，可能已经被转义过
        if (参数.includes('\\\\')) {
            try {
                // 尝试解除一层转义
                return JSON.parse(`"${参数}"`);
            } catch (e) {
                // 解析失败，保持原样
            }
        }
        return 参数;
    }
    
    if (typeof 参数 === 'number' || typeof 参数 === 'boolean') return 参数.toString();
    
    try {
        // 对于对象和数组，限制其内容长度，避免超大对象
        if (typeof 参数 === 'object' && 参数 !== null) {
            // 如果是Error对象，特殊处理
            if (参数 instanceof Error) {
                return `Error: ${参数.message}\n${参数.stack || ''}`;
            }
            
            // 处理包含可能是图片URL的属性
            if (参数.url && typeof 参数.url === 'string' && 是否为图片URL(参数.url)) {
                return {
                    类型: '图片',
                    值: 参数.url,
                    描述: '对象中的图片URL',
                    原始对象: 参数
                };
            }
            
            // 处理可能包含图片Base64的对象
            if (参数.base64 && typeof 参数.base64 === 'string' && 是否为Base64图片(参数.base64)) {
                return {
                    类型: '图片',
                    值: 参数.base64,
                    描述: '对象中的Base64图片',
                    原始对象: 参数
                };
            }
            
            // 限制数组长度
            if (Array.isArray(参数) && 参数.length > 100) {
                参数 = 参数.slice(0, 100);
                参数.push('...(已截断)');
            }
            
            // 清空用于循环引用检测的Set
            seen.clear();
            
            // 避免循环引用和复杂对象导致的问题
            return JSON.stringify(参数, (key, value) => {
                // 忽略特别长的字符串值
                if (typeof value === 'string' && value.length > 500) {
                    return value.substring(0, 500) + '...(已截断)';
                }
                
                // 处理特殊值
                if (value !== value) return 'NaN'; // 处理NaN
                if (value === Infinity) return 'Infinity';
                if (value === -Infinity) return '-Infinity';
                if (typeof value === 'function') return '[Function]';
                if (typeof value === 'symbol') return value.toString();
                
                // 检测循环引用
                if (typeof value === 'object' && value !== null) {
                    if (seen.has(value)) {
                        return '[循环引用]';
                    }
                    seen.add(value);
                    
                    // 限制对象的属性数量
                    if (Object.keys(value).length > 20) {
                        const limitedObj = {};
                        let count = 0;
                        for (const k in value) {
                            if (count >= 20) break;
                            limitedObj[k] = value[k];
                            count++;
                        }
                        limitedObj['...(已截断)'] = `还有${Object.keys(value).length - 20}个属性`;
                        return limitedObj;
                    }
                }
                
                return value;
            }, 2);
        }
        
        return String(参数);
    } catch (e) {
        return `[无法序列化的对象: ${e.message}]`;
    }
};

/**
 * 格式化元数据对象
 * @param {Object} 元数据 - 要格式化的元数据对象
 * @returns {Object} 格式化后的元数据对象
 */
export const 格式化元数据 = (元数据) => {
    if (!元数据 || typeof 元数据 !== 'object') return null;
    
    try {
        // 清空用于循环引用检测的Set
        seen.clear();
        
        // 处理特殊类型
        const 处理后元数据 = {};
        for (const 键 in 元数据) {
            let 值 = 元数据[键];
            
            // 处理特殊类型
            if (值 instanceof Error) {
                处理后元数据[键] = {
                    错误类型: 值.name,
                    错误消息: 值.message,
                    错误栈: 值.stack
                };
            } else if (typeof 值 === 'object' && 值 !== null) {
                // 避免循环引用
                if (seen.has(值)) {
                    处理后元数据[键] = '[循环引用]';
                } else {
                    seen.add(值);
                    
                    // 处理数组
                    if (Array.isArray(值) && 值.length > 20) {
                        处理后元数据[键] = [...值.slice(0, 20), `...还有${值.length - 20}项`];
                    } else {
                        // 递归处理嵌套对象
                        处理后元数据[键] = 格式化元数据(值);
                    }
                }
            } else {
                // 基本类型直接复制
                处理后元数据[键] = 值;
            }
        }
        
        return 处理后元数据;
    } catch (e) {
        return { 错误: `元数据格式化失败: ${e.message}` };
    }
};

/**
 * 格式化日志对象
 * @param {string} 级别 - 日志级别：info, warn, error, debug
 * @param {any} 内容 - 日志内容
 * @param {string} 来源 - 日志来源
 * @param {Object} 选项 - 额外选项，包含元数据和标签
 * @returns {Object} 格式化后的日志对象
 */
export const 格式化日志 = (级别, 内容, 来源 = '', 选项 = {}) => {
    const 时间 = new Date().toISOString();
    let 格式化内容 = 内容;
    let 元数据 = 选项?.元数据 || null;
    let 标签 = 选项?.标签 || [];
    let 包含图片 = false;
    let 包含结构化数据 = !!元数据;
    
    // 处理结构化内容对象
    if (typeof 内容 === 'object' && 内容 !== null && 内容.消息 && 内容.元数据) {
        元数据 = 内容.元数据;
        格式化内容 = 内容.消息;
        标签 = 内容.标签 || 标签;
        包含结构化数据 = true;
    }
    
    // 格式化元数据
    if (元数据) {
        元数据 = 格式化元数据(元数据);
    }
    
    // 检查内容类型并格式化
    if (typeof 格式化内容 !== 'string') {
        try {
            if (格式化内容 instanceof Error) {
                // 为错误添加元数据
                元数据 = {
                    ...(元数据 || {}),
                    错误类型: 格式化内容.name,
                    错误消息: 格式化内容.message,
                    错误栈: 格式化内容.stack
                };
                格式化内容 = `${格式化内容.message}\n${格式化内容.stack || ''}`;
                包含结构化数据 = true;
            } else if (Array.isArray(格式化内容)) {
                // 处理数组参数
                const 格式化结果 = 格式化内容.map(格式化参数);
                
                // 检查结果中是否包含图片对象
                包含图片 = 格式化结果.some(项 => 项 && typeof 项 === 'object' && 项.类型 === '图片');
                
                if (包含图片) {
                    // 如果包含图片，保留原始对象结构
                    格式化内容 = 格式化结果;
                    元数据 = {
                        ...(元数据 || {}),
                        类型: '包含图片的数组',
                        长度: 格式化内容.length
                    };
                } else {
                    // 不包含图片，转为普通字符串
                    格式化内容 = 格式化结果.join(' ');
                }
            } else {
                // 使用通用参数格式化
                const 格式化结果 = 格式化参数(格式化内容);
                
                // 检查结果是否为图片对象
                if (格式化结果 && typeof 格式化结果 === 'object' && 格式化结果.类型 === '图片') {
                    包含图片 = true;
                    格式化内容 = 格式化结果;
                    元数据 = {
                        ...(元数据 || {}),
                        类型: '图片数据',
                        描述: 格式化结果.描述
                    };
                } else {
                    格式化内容 = 格式化结果;
                }
            }
        } catch (错误) {
            格式化内容 = String(格式化内容) + ' [无法完全序列化]';
            元数据 = {
                ...(元数据 || {}),
                类型: '序列化错误',
                错误: 错误.message
            };
        }
    } else {
        // 检查字符串是否为图片URL或Base64
        if (是否为图片URL(格式化内容) || 是否为Base64图片(格式化内容)) {
            包含图片 = true;
            格式化内容 = {
                类型: '图片',
                值: 格式化内容,
                描述: 是否为Base64图片(格式化内容) ? 'Base64图片' : '图片URL'
            };
            元数据 = {
                ...(元数据 || {}),
                类型: '图片数据',
                描述: 是否为Base64图片(格式化内容) ? 'Base64图片' : '图片URL'
            };
        }
    }
    
    // 生成唯一ID，用于数据库存储
    const id = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    return {
        id,
        时间,
        级别,
        内容: 格式化内容,
        来源,
        包含图片,
        元数据,
        标签,
        包含结构化数据
    };
};

/**
 * 格式化时间戳为可读时间
 * @param {string} 时间戳 - ISO格式的时间戳
 * @param {boolean} 包含日期 - 是否包含日期部分
 * @returns {string} 格式化后的时间字符串
 */
export const 格式化时间 = (时间戳, 包含日期 = false) => {
    try {
        const 日期 = new Date(时间戳);
        if (包含日期) {
            return 日期.toLocaleString();
        } else {
            return 日期.toLocaleTimeString();
        }
    } catch (e) {
        return 时间戳;
    }
};

/**
 * 将日志对象格式化为可导出的文本
 * @param {Object} 日志 - 日志对象
 * @returns {string} 格式化后的文本
 */
export const 日志转文本 = (日志) => {
    let 内容文本 = 日志.内容;
    
    // 处理包含图片或对象的情况
    if (日志.包含图片 && 日志.内容 && typeof 日志.内容 === 'object') {
        if (日志.内容.类型 === '图片') {
            内容文本 = `[图片]: ${日志.内容.描述 || ''}`;
            if (日志.内容.值 && 日志.内容.值.length < 100) {
                内容文本 += ' ' + 日志.内容.值;
            }
        } else {
            try {
                内容文本 = JSON.stringify(日志.内容);
            } catch (e) {
                内容文本 = '[复杂对象]';
            }
        }
    }
    
    // 添加标签信息
    const 标签信息 = 日志.标签?.length > 0 ? ` [标签:${日志.标签.join(',')}]` : '';
    
    // 添加结构化数据提示
    const 结构化提示 = 日志.包含结构化数据 ? ' [包含结构化数据]' : '';
    
    return `[${日志.时间 || ''}] ${(日志.级别 || '').toUpperCase()}: [${日志.来源 || ''}] ${内容文本}${标签信息}${结构化提示}`;
};

/**
 * 将多个日志对象格式化为可导出的文本
 * @param {Array} 日志列表 - 日志对象数组
 * @returns {string} 格式化后的文本
 */
export const 日志列表转文本 = (日志列表) => {
    return 日志列表.map(日志转文本).join('\n');
}; 