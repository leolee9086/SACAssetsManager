/**
 * 获取值的类型
 * @param {*} value 需要检测类型的值
 * @returns {string} 类型名称
 */
export function getValueType(value) {
    if (Array.isArray(value)) return 'array';
    if (value === null) return 'null';
    return (typeof value).toLowerCase();
  }
  