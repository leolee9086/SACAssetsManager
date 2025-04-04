import { watch } from './vue.js'

export const useWatchWithExtractFn = (data, { 
  extractFn, 
  watchFn,
  immediate = false,  // 新增立即执行选项
  deep = false        // 新增深度监听选项
}) => {
  const stop = watch(
    () => extractFn(data),
    (newVal, oldVal) => {
      watchFn(newVal, oldVal)
    },
    { immediate, deep }  // 传递Vue watch选项
  ) 
  return () => stop()  // 返回清理函数
}
export const useEnhancedWatcher = (data, {
  extractFn,
  watchFn,
  immediate = false,
  deep = false,
  debounce = 0,
  throttle = 0,
  onCleanup = null
}) => {
  let stopWatcher = null
  let lastArgs = null
  let timeoutId = null
  let throttleLastCalled = 0

  const executeWatchFn = (...args) => {
    lastArgs = args
    if (debounce > 0) {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => watchFn(...args), debounce)
    } else if (throttle > 0) {
      const now = Date.now()
      if (now - throttleLastCalled >= throttle) {
        watchFn(...args)
        throttleLastCalled = now
      }
    } else {
      watchFn(...args)
    }
  }

  stopWatcher = useWatchWithExtractFn(data, {
    extractFn,
    watchFn: executeWatchFn,
    immediate,
    deep
  })

  // 新增手动触发函数
  const trigger = () => {
    if (lastArgs) watchFn(...lastArgs)
  }

  // 返回增强的清理和控制接口
  return {
    stop: () => {
      stopWatcher?.()
      onCleanup?.()
      clearTimeout(timeoutId)
    },
    trigger,
    restart: () => {
      stopWatcher?.()
      stopWatcher = useWatchWithExtractFn(data, {
        extractFn,
        watchFn: executeWatchFn,
        immediate,
        deep
      })
    }
  }
}