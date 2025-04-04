/**
 * 将思源笔记的时间戳转换为毫秒时间戳
 * @param {string} timestamp - 思源时间戳(14位数字字符串，格式: YYYYMMDDHHmmSS)
 * @returns {number} 毫秒时间戳，如果输入无效返回0
 */
// 思源特定函数 - 保留
export const 转换思源时间戳为毫秒=(timestamp)=> {
    if (typeof timestamp === 'string' && timestamp.length === 14) {
        const year = parseInt(timestamp.slice(0, 4));
        const month = parseInt(timestamp.slice(4, 6)) - 1; // 月份从0开始
        const day = parseInt(timestamp.slice(6, 8));
        const hour = parseInt(timestamp.slice(8, 10));
        const minute = parseInt(timestamp.slice(10, 12));
        const second = parseInt(timestamp.slice(12, 14));

        return new Date(year, month, day, hour, minute, second).getTime();
    }
    return 0; // 如果时间戳格式不正确，返回0
}

/**
 * 将JavaScript时间格式化模板转换为Go语言时间格式化模板
 * @param {string} jsFormat - JavaScript时间格式字符串
 * @returns {string} Go语言时间格式字符串
 * @example
 * // 返回 "2006-01-02 15:04:05"
 * 转换js时间格式化模板到Go语言时间格式化模板("YYYY-MM-DD HH:mm:ss")
 */
/**
 * 将Go语言时间格式化模板转换为JavaScript时间格式化模板
 * @param {string} goFormat - Go语言时间格式字符串
 * @returns {string} JavaScript时间格式字符串
*/
import {convertJsTimeFormatToGoTimeFormat as 转换js时间格式化模板到思源模板时间格式化模板} from '../../../feature/forGoLang/timeConverters.js'

export  {转换js时间格式化模板到思源模板时间格式化模板}
/**
 * 将毫秒时间戳转换为思源时间戳格式
 * @param {number} milliseconds - 毫秒时间戳
 * @returns {string} 14位思源时间戳(YYYYMMDDHHmmSS)，如果输入无效返回"00000000000000"
 */
// 思源特定函数 - 保留
export const 转换毫秒时间戳为思源时间戳=(milliseconds)=> {
    if (!milliseconds || isNaN(milliseconds)) return "00000000000000";
    
    const date = new Date(milliseconds);
    const year = date.getFullYear().toString().padStart(4, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const second = date.getSeconds().toString().padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}${second}`;
}

/**
 * 获取当前时间的思源时间戳
 * @returns {string} 14位当前时间的思源时间戳(YYYYMMDDHHmmSS)
 */
// 思源特定函数 - 保留
export const 获取当前思源时间戳=()=> {
    return 转换毫秒时间戳为思源时间戳(Date.now());
}

/**
 * 将Date对象转换为思源时间戳
 * @param {Date} date - Date对象
 * @returns {string} 14位思源时间戳(YYYYMMDDHHmmSS)，如果输入无效返回"00000000000000"
 */
// 思源特定函数 - 保留
export const 转换Date对象为思源时间戳=(date)=> {
    if (!(date instanceof Date)) return "00000000000000";
    return 转换毫秒时间戳为思源时间戳(date.getTime());
}

/**
 * 格式化思源时间戳为可读字符串
 * @param {string} timestamp - 思源时间戳(14位)
 * @param {string} [format="YYYY-MM-DD HH:mm:ss"] - 输出格式
 * @returns {string} 格式化后的时间字符串
 */
// 通用函数 - 可抽离
export const 格式化思源时间戳=(timestamp, format="YYYY-MM-DD HH:mm:ss")=> {
    if (!timestamp || timestamp.length !== 14) return "无效时间戳";
    
    const date = new Date(转换思源时间戳为毫秒(timestamp));
    const map = {
        YYYY: date.getFullYear(),
        MM: String(date.getMonth() + 1).padStart(2, '0'),
        DD: String(date.getDate()).padStart(2, '0'),
        HH: String(date.getHours()).padStart(2, '0'),
        mm: String(date.getMinutes()).padStart(2, '0'),
        ss: String(date.getSeconds()).padStart(2, '0')
    };
    
    return format.replace(/YYYY|MM|DD|HH|mm|ss/g, matched=> map[matched]);
}

/**
 * 计算两个思源时间戳之间的时间差(毫秒)
 * @param {string} startTimestamp - 开始时间戳
 * @param {string} endTimestamp - 结束时间戳
 * @returns {number} 时间差(毫秒)
 */
// 通用函数 - 可抽离
export const 计算时间差=(startTimestamp, endTimestamp)=> {
    const start = 转换思源时间戳为毫秒(startTimestamp);
    const end = 转换思源时间戳为毫秒(endTimestamp);
    return end - start;
}

/**
 * 将毫秒数转换为可读的时间字符串
 * @param {number} milliseconds - 毫秒数
 * @returns {string} 格式化的时间字符串(如: 1天 2小时 3分钟)
 */
// 通用函数 - 可抽离
export const 格式化持续时间=(milliseconds)=> {
    if (!milliseconds || milliseconds < 0) return "0秒";
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    const parts = [];
    if (days > 0) parts.push(`${days}天`);
    if (hours % 24 > 0) parts.push(`${hours % 24}小时`);
    if (minutes % 60 > 0) parts.push(`${minutes % 60}分钟`);
    if (seconds % 60 > 0 || parts.length === 0) parts.push(`${seconds % 60}秒`);
    
    return parts.join(' ');
}

/**
 * 检查思源时间戳是否在有效范围内
 * @param {string} timestamp - 待检查的时间戳
 * @returns {boolean} 是否有效
 */
// 思源特定函数 - 保留
export const 验证思源时间戳=(timestamp)=> {
    if (typeof timestamp !== 'string' || timestamp.length !== 14) return false;
    return !isNaN(转换思源时间戳为毫秒(timestamp));
}

