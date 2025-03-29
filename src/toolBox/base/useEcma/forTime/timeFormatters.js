/**
 * 时间格式化工具
 * 提供各种格式化时间和日期的工具函数
 */

/**
 * 格式化时间戳为易读的时间字符串
 * @param {number|Date} 时间戳 - 要格式化的时间戳或Date对象
 * @param {Object} [选项] - 格式化选项
 * @param {string} [选项.locale='zh-CN'] - 地区设置
 * @param {Object} [选项.格式] - 时间格式化选项
 * @returns {string} 格式化后的时间字符串
 */
export function 格式化时间戳(时间戳, 选项 = {}) {
  if (!时间戳) return ''
  
  const { locale = 'zh-CN', 格式 = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }} = 选项
  
  const 日期 = 时间戳 instanceof Date ? 时间戳 : new Date(时间戳)
  return 日期.toLocaleTimeString(locale, 格式)
}

/**
 * 格式化时间戳为完整日期时间
 * @param {number|Date} 时间戳 - 要格式化的时间戳或Date对象
 * @param {Object} [选项] - 格式化选项
 * @param {string} [选项.locale='zh-CN'] - 地区设置
 * @param {boolean} [选项.包含秒=true] - 是否包含秒
 * @returns {string} 格式化后的日期时间字符串
 */
export function 格式化完整时间(时间戳, 选项 = {}) {
  if (!时间戳) return ''
  
  const { locale = 'zh-CN', 包含秒 = true } = 选项
  
  const 日期 = 时间戳 instanceof Date ? 时间戳 : new Date(时间戳)
  const 格式 = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }
  
  if (包含秒) {
    格式.second = '2-digit'
  }
  
  return 日期.toLocaleString(locale, 格式)
}

/**
 * 格式化相对时间(如：刚刚、5分钟前等)
 * @param {number|Date} 时间戳 - 要格式化的时间戳或Date对象
 * @param {Object} [选项] - 格式化选项
 * @param {string} [选项.locale='zh-CN'] - 地区设置
 * @param {number} [选项.当前时间=Date.now()] - 当前时间的时间戳
 * @returns {string} 相对时间字符串
 */
export function 格式化相对时间(时间戳, 选项 = {}) {
  if (!时间戳) return ''
  
  const { locale = 'zh-CN', 当前时间 = Date.now() } = 选项
  
  const 目标时间 = 时间戳 instanceof Date ? 时间戳.getTime() : Number(时间戳)
  const 相差毫秒 = 当前时间 - 目标时间
  
  // 时间范围 - 负值表示未来，正值表示过去
  if (相差毫秒 < 0) {
    // 未来时间处理
    const 绝对差值 = Math.abs(相差毫秒)
    if (绝对差值 < 60000) return `即将到来`
    if (绝对差值 < 3600000) return `${Math.floor(绝对差值 / 60000)}分钟后`
    if (绝对差值 < 86400000) return `${Math.floor(绝对差值 / 3600000)}小时后`
    return 格式化时间戳(时间戳)
  } else {
    // 过去时间处理
    if (相差毫秒 < 10000) return `刚刚`
    if (相差毫秒 < 60000) return `${Math.floor(相差毫秒 / 1000)}秒前`
    if (相差毫秒 < 3600000) return `${Math.floor(相差毫秒 / 60000)}分钟前`
    if (相差毫秒 < 86400000) return `${Math.floor(相差毫秒 / 3600000)}小时前`
    if (相差毫秒 < 604800000) return `${Math.floor(相差毫秒 / 86400000)}天前`
    return 格式化时间戳(时间戳)
  }
}

// 为保持兼容性提供英文命名的别名
export const formatTimestamp = 格式化时间戳
export const formatFullTime = 格式化完整时间
export const formatRelativeTime = 格式化相对时间 