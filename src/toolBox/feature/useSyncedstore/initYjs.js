/**
 * @fileoverview Yjs初始化模块
 * 
 * 该模块提供一个初始化函数，确保在应用启动时
 * 正确加载单一的Yjs实例，并处理相关配置。
 * 
 * @module initYjs
 */

import Y from './yjsInstance.js'

/**
 * 初始化Yjs环境
 * 确保应用使用单一Yjs实例，避免多实例问题
 * @param {Object} options - 初始化选项
 * @returns {Object} 包含Yjs实例和状态的对象
 */
export function initYjs(options = {}) {
  // 检查是否已初始化
  if (typeof window !== 'undefined' && window.YJS_INITIALIZED) {
    console.log('[Yjs] 已经初始化，跳过')
    return { Y, initialized: true, alreadyInitialized: true }
  }
  
  // 在全局对象上设置Yjs实例，确保所有模块使用同一实例
  if (typeof window !== 'undefined') {
    window.Y = Y
    window.YJS_INITIALIZED = true
  }
  
  console.log('[Yjs] 初始化完成')
  return { Y, initialized: true, alreadyInitialized: false }
}

/**
 * 检查Yjs是否已经初始化
 * @returns {boolean} 是否已初始化
 */
export function isYjsInitialized() {
  return typeof window !== 'undefined' && !!window.YJS_INITIALIZED
}

/**
 * 获取全局Yjs实例
 * @returns {Object} Yjs实例
 */
export function getYjsInstance() {
  if (!isYjsInitialized()) {
    console.warn('[Yjs] 获取实例时Yjs尚未初始化，正在自动初始化')
    initYjs()
  }
  return Y
}

export default { initYjs, isYjsInitialized, getYjsInstance, Y } 