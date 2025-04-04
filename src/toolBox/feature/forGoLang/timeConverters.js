/**
 * 将JavaScript时间格式化模板转换为Go语言时间格式化模板
 * @param {string} jsFormat - JavaScript时间格式字符串
 * @returns {string} Go语言时间格式字符串
 * @example
 * // 返回 "2006-01-02 15:04:05"
 * convertJsToGoTimeFormat("YYYY-MM-DD HH:mm:ss")
 */
export const convertJsTimeFormatToGoTimeFormat = (jsFormat) => {
    if (!jsFormat) return "";
    
    return jsFormat
        .replace(/YYYY/g, '2006')
        .replace(/YY/g, '06')
        .replace(/MM/g, '01')
        .replace(/DD/g, '02')
        .replace(/HH/g, '15')
        .replace(/hh/g, '03')
        .replace(/mm/g, '04')
        .replace(/ss/g, '05')
        .replace(/SSS/g, '000')
        .replace(/A/g, 'PM')
        .replace(/a/g, 'pm');
};

/**
 * 将Go语言时间格式化模板转换为JavaScript时间格式化模板
 * @param {string} goFormat - Go语言时间格式字符串
 * @returns {string} JavaScript时间格式字符串
 */
export const convertGoToJsTimeFormat = (goFormat) => {
    if (!goFormat) return "";
    
    return goFormat
        .replace(/2006/g, 'YYYY')
        .replace(/06/g, 'YY')
        .replace(/01/g, 'MM')
        .replace(/02/g, 'DD')
        .replace(/15/g, 'HH')
        .replace(/03/g, 'hh')
        .replace(/04/g, 'mm')
        .replace(/05/g, 'ss')
        .replace(/000/g, 'SSS')
        .replace(/PM/g, 'A')
        .replace(/pm/g, 'a');
};