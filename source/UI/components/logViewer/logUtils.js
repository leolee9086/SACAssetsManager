/**
 * 日志查看器工具函数
 * 提供日志处理的公共方法
 */

/**
 * 获取日志内容字段
 * @param {Object} 日志 - 日志对象
 * @returns {*} 处理后的日志内容
 */
export const 获取内容字段 = (日志) => {
    // 先检查内容字段
    if (日志.内容) {
        if (typeof 日志.内容 === 'object' && 日志.内容 !== null) {
            try {
                // 如果是字符串化的JSON，尝试解析
                if (typeof 日志.内容 === 'string' && 
                    (日志.内容.startsWith('{') || 日志.内容.startsWith('['))) {
                    return JSON.parse(日志.内容);
                }
                return 日志.内容;
            } catch (e) {
                return { 错误: '无法解析内容', 原始内容: 日志.内容 };
            }
        }
        return 日志.内容;
    }
    
    // 再检查content字段
    if (日志.content) {
        if (typeof 日志.content === 'object' && 日志.content !== null) {
            try {
                // 如果是字符串化的JSON，尝试解析
                if (typeof 日志.content === 'string' && 
                    (日志.content.startsWith('{') || 日志.content.startsWith('['))) {
                    return JSON.parse(日志.content);
                }
                return 日志.content;
            } catch (e) {
                return { 错误: '无法解析内容', 原始内容: 日志.content };
            }
        }
        return 日志.content;
    }
    
    // 都不存在时返回空对象
    return {};
};

/**
 * 获取唯一的元素ID，用于识别日志元素
 * @param {Object} 日志 - 日志对象
 * @returns {String} 唯一ID
 */
export const 获取元素ID = (日志) => {
    if (!日志._elId) {
        // 使用时间戳+随机数+递增计数器的组合来确保唯一性
        const 时间戳 = Date.now()
        const 随机数 = Math.random().toString(36).substring(2, 8)
        const 计数器 = (Math.floor(Math.random() * 10000)).toString(36).padStart(4, '0')
        日志._elId = `${时间戳.toString(36)}${随机数}${计数器}`
    }
    return 日志._elId;
};

/**
 * 复制文本到剪贴板
 * @param {*} 内容 - 要复制的内容
 * @param {String} 标识 - 内容类型标识
 * @param {Function} 显示消息 - 消息显示函数
 * @returns {Promise<Boolean>} 是否成功复制
 */
export const 复制到剪贴板 = async (内容, 标识 = '内容', 显示消息) => {
    try {
        let 复制文本 = 内容;
        
        // 处理对象
        if (typeof 内容 === 'object' && 内容 !== null) {
            try {
                复制文本 = JSON.stringify(内容, null, 2);
            } catch (e) {
                复制文本 = '[无法序列化的对象]';
                console.error('序列化对象失败:', e);
            }
        }
        
        // 处理undefined和null
        if (内容 === undefined) {
            复制文本 = 'undefined';
        } else if (内容 === null) {
            复制文本 = 'null';
        }
        
        // 创建操作ID
        const 操作ID = Date.now().toString(36).slice(-4) + Math.random().toString(36).substring(2, 4);
        
        // 检查是否有Navigator API
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(复制文本);
            显示消息(`已复制${标识} #${操作ID}`);
            return true;
        } else {
            // 环境不支持clipboard API时使用备用方法
            const textarea = document.createElement('textarea');
            textarea.value = 复制文本;
            textarea.setAttribute('readonly', '');
            textarea.style.position = 'absolute';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            const 成功 = document.execCommand('copy');
            document.body.removeChild(textarea);
            
            if (成功) {
                显示消息(`已复制${标识} #${操作ID}`);
                return true;
            } else {
                显示消息('复制失败，请手动复制');
                console.log('需要复制的内容:', 复制文本);
                return false;
            }
        }
    } catch (e) {
        console.error('复制失败:', e);
        显示消息 && 显示消息('复制失败: ' + e.message);
        return false;
    }
}; 