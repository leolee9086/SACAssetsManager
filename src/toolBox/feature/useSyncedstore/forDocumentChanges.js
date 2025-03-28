/**
 * 记录文档变更并计算变更频率
 * @param {Array} changeHistory 变更历史记录数组
 * @param {Object} options 配置选项
 * @returns {number} 变更频率(次数/分钟)
 */
export const recordDocumentChangeWithContext = (changeHistory, options = {}) => {
  let changeFrequency = 0
  const { MAX_CHANGE_HISTORY = 10 } = options
  const now = Date.now()
  
  // 记录变更时间
  changeHistory.push(now)
  
  // 保持历史记录在限定范围内
  if (changeHistory.length > MAX_CHANGE_HISTORY) {
    changeHistory.shift()
  }
  
  // 计算变更频率 (次数/分钟)
  if (changeHistory.length >= 2) {
    const oldestChange = changeHistory[0]
    const timeSpan = now - oldestChange
    // 防止除零错误
    if (timeSpan > 0) {
      // 转换为每分钟变更次数
      changeFrequency = (changeHistory.length - 1) / (timeSpan / 60000)
    }
  }
  
  return changeFrequency
}

/**
 * 监听Y.Doc文档变更
 * @param {Y.Doc} doc Yjs文档实例
 * @param {Function} callback 回调函数
 * @returns {Function|null} 清理函数
 */
export const observeDocChangesWithContext = (doc, callback) => {
  if (!doc) return null
  
  // 设置更新观察者
  doc.on('update', (update, origin) => {
    callback(update, origin)
  })
  
  // 返回清理函数
  return () => {
    doc.off('update', callback)
  }
}

/**
 * 创建文档变更记录器
 * @param {Object} options 配置选项
 * @returns {Object} 变更记录器及其方法
 */
export const createDocumentChangeRecorderWithContext = (options = {}) => {
  const changeHistory = []
  const MAX_CHANGE_HISTORY = options.maxHistory || 10
  let currentFrequency = 0
  
  const recordChange = () => {
    currentFrequency = recordDocumentChangeWithContext(changeHistory, {
      MAX_CHANGE_HISTORY
    })
    return currentFrequency
  }
  
  const getChangeFrequency = () => currentFrequency
  
  const getChangeHistory = () => [...changeHistory]
  
  const reset = () => {
    changeHistory.length = 0
    currentFrequency = 0
  }
  
  return {
    recordChange,
    getChangeFrequency,
    getChangeHistory,
    reset
  }
}

/**
 * 设置文档变更监听
 * @param {Y.Doc} doc Yjs文档实例
 * @param {Object} recorder 变更记录器实例
 * @returns {Function} 清理函数
 */
export const setupDocumentChangeMonitoringWithContext = (doc, recorder) => {
  const unobserve = observeDocChangesWithContext(doc, () => {
    recorder.recordChange()
  })
  
  return () => {
    if (unobserve) {
      unobserve()
    }
    recorder.reset()
  }
} 