/**
 * 工具函数集合
 * 提供各种编辑器和协作功能所需的通用工具函数
 */

/**
 * 通用工具函数
 */

/**
 * 节流函数 - 限制函数在指定时间内只执行一次
 * @param {Function} fn 要执行的函数
 * @param {number} delay 延迟时间（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(fn, delay = 300) {
  let lastCall = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      return fn.apply(this, args)
    }
  }
}

/**
 * 防抖函数 - 延迟执行函数，如果在延迟时间内再次调用则重新计时
 * @param {Function} fn 要执行的函数
 * @param {number} delay 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(fn, delay = 300) {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
      timer = null
    }, delay)
  }
}

/**
 * 生成随机颜色
 * @param {Number} opacity 透明度，0-1之间的小数
 * @returns {String} 颜色字符串，格式为 rgba(r,g,b,a)
 */
export function randomColor(opacity = 1) {
  const r = Math.floor(Math.random() * 256)
  const g = Math.floor(Math.random() * 256)
  const b = Math.floor(Math.random() * 256)
  
  return `rgba(${r},${g},${b},${opacity})`
}

/**
 * 生成唯一ID
 * @param {String} prefix ID前缀
 * @returns {String} 唯一ID
 */
export function generateId(prefix = '') {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`
}

/**
 * 深拷贝对象
 * @param {Object} obj 需要拷贝的对象
 * @returns {Object} 拷贝后的对象
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  
  const clone = Array.isArray(obj) ? [] : {}
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clone[key] = deepClone(obj[key])
    }
  }
  
  return clone
}

/**
 * 等待指定时间
 * @param {Number} ms 等待时间，单位为毫秒
 * @returns {Promise} Promise对象
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 格式化日期时间
 * @param {Date|Number} date 日期对象或时间戳
 * @param {String} format 格式化字符串，默认为 'YYYY-MM-DD HH:mm:ss'
 * @returns {String} 格式化后的日期时间字符串
 */
export function formatDateTime(date, format = 'YYYY-MM-DD HH:mm:ss') {
  const d = new Date(date)
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 检测浏览器类型
 * @returns {Object} 包含浏览器类型信息的对象
 */
export function detectBrowser() {
  const userAgent = navigator.userAgent
  
  const browsers = {
    chrome: /chrome/i.test(userAgent) && !/edge|edg/i.test(userAgent),
    firefox: /firefox/i.test(userAgent),
    safari: /safari/i.test(userAgent) && !/chrome/i.test(userAgent),
    edge: /edge|edg/i.test(userAgent),
    ie: /msie|trident/i.test(userAgent),
    opera: /opera|opr/i.test(userAgent)
  }
  
  const os = {
    windows: /win/i.test(userAgent),
    mac: /mac/i.test(userAgent),
    linux: /linux/i.test(userAgent),
    ios: /iphone|ipad|ipod/i.test(userAgent),
    android: /android/i.test(userAgent)
  }
  
  return { browsers, os }
}

/**
 * 计算文本宽度
 * @param {String} text 文本内容
 * @param {String} font 字体样式
 * @returns {Number} 文本宽度（像素）
 */
export function measureTextWidth(text, font = '14px monospace') {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  context.font = font
  const metrics = context.measureText(text)
  return metrics.width
}

/**
 * 生成相对房间ID，避免不同人创建相同ID的房间
 * @param {string} baseName 基础房间名
 * @returns {string} 相对房间ID
 */
export function getRelativeRoomId(baseName = 'room') {
  // 可以根据用户ID、插件ID等生成唯一ID
  return `${baseName}-${Date.now()}`
}

/**
 * 根据ID生成随机颜色
 * @param {string|number} id 用户ID或其他标识
 * @returns {string} HSL格式的颜色
 */
export function generateRandomColor(id) {
  // 将ID转换为字符串
  const idStr = String(id)
  
  // 计算哈希值
  let hash = 0
  for (let i = 0; i < idStr.length; i++) {
    hash = idStr.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // 生成HSL颜色，确保色调分布均匀，饱和度和亮度合适
  const h = Math.abs(hash) % 360
  const s = 70 + (Math.abs(hash >> 8) % 30) // 70-100% 饱和度
  const l = 45 + (Math.abs(hash >> 16) % 10) // 45-55% 亮度
  
  return `hsl(${h}, ${s}%, ${l}%)`
}

/**
 * 格式化文件大小
 * @param {number} bytes 字节数
 * @returns {string} 格式化后的大小
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 复制文本到剪贴板
 * @param {string} text 要复制的文本
 * @returns {Promise<boolean>} 成功返回true，失败返回false
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // 回退方法
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const success = document.execCommand('copy')
      textArea.remove()
      return success
    }
  } catch (err) {
    console.error('复制失败:', err)
    return false
  }
} 