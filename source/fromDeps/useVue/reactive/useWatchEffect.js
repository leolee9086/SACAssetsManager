import { watchEffect, ref, onUnmounted } from './fromVue.js'

/**
 * 创建一个带防抖功能的watchEffect
 * @param {Number} delay - 防抖延迟时间(毫秒)
 * @returns {Function} - 接收effect函数并返回停止函数的高阶函数
 */
export const useDebounceEffect = (delay = 300) => effect => {
  let timer = null
  
  const stop = watchEffect((onCleanup) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      effect()
    }, delay)
    
    onCleanup(() => {
      clearTimeout(timer)
    })
  })
  
  onUnmounted(() => {
    clearTimeout(timer)
  })
  
  return stop
}

/**
 * 创建一个带节流功能的watchEffect
 * @param {Number} delay - 节流延迟时间(毫秒)
 * @returns {Function} - 接收effect函数并返回停止函数的高阶函数
 */
export const useThrottleEffect = (delay = 300) => effect => {
  let lastTime = 0
  let timer = null
  
  const stop = watchEffect((onCleanup) => {
    const now = Date.now()
    const remaining = delay - (now - lastTime)
    
    if (remaining <= 0) {
      clearTimeout(timer)
      lastTime = now
      effect()
    } else if (!timer) {
      timer = setTimeout(() => {
        lastTime = Date.now()
        timer = null
        effect()
      }, remaining)
    }
    
    onCleanup(() => {
      clearTimeout(timer)
    })
  })
  
  return stop
}

/**
 * 创建一个处理异步操作的watchEffect
 * @returns {Function} - 接收异步effect函数并返回状态和停止函数的高阶函数
 */
export const useAsyncEffect = () => asyncEffect => {
  const loading = ref(false)
  const error = ref(null)
  
  const stop = watchEffect(async (onCleanup) => {
    let isCancelled = false
    onCleanup(() => {
      isCancelled = true
    })
    
    try {
      loading.value = true
      error.value = null
      
      await asyncEffect(isCancelled)
    } catch (err) {
      if (!isCancelled) {
        error.value = err
      }
    } finally {
      if (!isCancelled) {
        loading.value = false
      }
    }
  })
  
  return {
    loading,
    error,
    stop
  }
}

/**
 * 创建一个自动与localStorage同步的watchEffect
 * @param {String} key - localStorage键名
 * @param {Function} serializer - 序列化函数
 * @param {Function} deserializer - 反序列化函数
 * @returns {Function} - 接收响应式值并返回停止函数的高阶函数
 */
export const useLocalStorageEffect = (
  key, 
  serializer = JSON.stringify, 
  deserializer = JSON.parse
) => valueRef => {
  // 初始化时从localStorage读取值
  try {
    const storedValue = localStorage.getItem(key)
    if (storedValue) {
      valueRef.value = deserializer(storedValue)
    }
  } catch (e) {
    console.error('读取localStorage失败:', e)
  }
  
  // 监听变化并更新localStorage
  const stop = watchEffect(() => {
    try {
      const value = valueRef.value
      if (value === undefined || value === null) {
        localStorage.removeItem(key)
      } else {
        localStorage.setItem(key, serializer(value))
      }
    } catch (e) {
      console.error('更新localStorage失败:', e)
    }
  })
  
  return stop
}

/**
 * 创建一个用于数据获取的watchEffect
 * @param {Function} fetchFn - 获取数据的函数
 * @returns {Function} - 接收依赖数组并返回数据状态的高阶函数
 */
export const useFetchEffect = fetchFn => deps => {
  const data = ref(null)
  const loading = ref(true)
  const error = ref(null)
  
  const stop = watchEffect(async (onCleanup) => {
    let isCancelled = false
    onCleanup(() => {
      isCancelled = true
    })
    
    loading.value = true
    error.value = null
    
    try {
      const result = await fetchFn(...deps.map(dep => dep.value))
      if (!isCancelled) {
        data.value = result
      }
    } catch (err) {
      if (!isCancelled) {
        error.value = err
      }
    } finally {
      if (!isCancelled) {
        loading.value = false
      }
    }
  })
  
  return {
    data,
    loading,
    error,
    stop
  }
}

/**
 * 创建一个表单验证的watchEffect
 * @param {Object} validationRules - 验证规则对象
 * @returns {Function} - 接收表单字段refs并返回验证状态的高阶函数
 */
export const useValidationEffect = validationRules => formRefs => {
  const errors = ref({})
  const isValid = ref(true)
  
  const stop = watchEffect(() => {
    const newErrors = {}
    let valid = true
    
    // 遍历所有字段并应用验证规则
    for (const field in validationRules) {
      if (Object.prototype.hasOwnProperty.call(validationRules, field)) {
        const value = formRefs[field].value
        const fieldRules = validationRules[field]
        
        newErrors[field] = []
        
        // 应用该字段的所有规则
        for (const rule of fieldRules) {
          const error = rule(value, formRefs)
          if (error) {
            newErrors[field].push(error)
            valid = false
          }
        }
      }
    }
    
    errors.value = newErrors
    isValid.value = valid
  })
  
  return {
    errors,
    isValid,
    stop
  }
}

/**
 * 创建一个窗口事件监听的watchEffect
 * @param {String} eventName - 事件名称
 * @param {Object} options - addEventListener选项
 * @returns {Function} - 接收回调函数并返回停止函数的高阶函数
 */
export const useEventEffect = (eventName, options = {}) => callback => {
  const stop = watchEffect((onCleanup) => {
    window.addEventListener(eventName, callback, options)
    
    onCleanup(() => {
      window.removeEventListener(eventName, callback, options)
    })
  })
  
  return stop
}
