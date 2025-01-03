/**
 * 通用堆栈处理器基类
 */
export class Stack {
  constructor(type) {
    this.id = crypto.randomUUID()  // 添加唯一标识
    this.type = type || 'generic'    // 堆栈类型标识
    this.processors = []
    this.middleware = []
    this.hooks = {
      beforeProcess: [],
      afterProcess: [],
      onError: []
    }
    this.connections = new Map()     // 存储与其他堆栈的连接
    this.converters = new Map()      // 类型转换器
  }

  /**
   * 注册类型转换器
   * @param {string} fromType 源类型
   * @param {string} toType 目标类型
   * @param {Function} converter 转换函数
   */
  registerConverter(fromType, toType, converter) {
    if (typeof converter !== 'function') {
      throw new Error('转换器必须是函数')
    }
    if (!fromType || !toType) {
      throw new Error('源类型和目标类型不能为空')
    }
    const key = `${fromType}->${toType}`
    this.converters.set(key, converter)
    return this
  }

  /**
   * 获取类型转换器
   */
  getConverter(fromType, toType) {
    const key = `${fromType}->${toType}`
    return this.converters.get(key)
  }

  /**
   * 组合另一个堆栈
   * @param {Stack} otherStack 要组合的堆栈
   * @param {Object} options 组合选项
   */
  combine(otherStack, options = {}) {
    if (!(otherStack instanceof Stack)) {
      throw new Error('只能与Stack实例进行组合')
    }

    // 检查堆栈类型兼容性
    if (this.type === otherStack.type) {
      // 同类型堆栈：直接连接
      this.connections.set(otherStack.id, {
        stack: otherStack,
        type: 'direct',
        options
      })
    } else {
      // 异类型堆栈：检查转换器
      const converter = this.getConverter(this.type, otherStack.type) ||
                       otherStack.getConverter(this.type, otherStack.type)
      
      if (!converter) {
        throw new Error(`未找到从 ${this.type} 到 ${otherStack.type} 的转换器`)
      }

      this.connections.set(otherStack.id, {
        stack: otherStack,
        type: 'converter',
        converter,
        options
      })
    }

    return this
  }

  /**
   * 切换到另一个堆栈
   * @param {string} stackId 目标堆栈ID
   * @param {*} context 当前上下文
   */
  async switchTo(stackId, context) {
    const connection = this.connections.get(stackId)
    if (!connection) {
      throw new Error(`未找到ID为 ${stackId} 的连接堆栈`)
    }

    const { stack, type, converter, options } = connection

    // 根据连接类型处理上下文转换
    let newContext
    if (type === 'direct') {
      newContext = context
    } else if (type === 'converter') {
      try {
        newContext = await converter(context, options)
      } catch (error) {
        throw new Error(`上下文转换失败: ${error.message}`)
      }
    }

    // 切换到新堆栈并处理
    return stack.process(newContext)
  }

  /**
   * 增强的处理管线执行
   */
  async process(context) {
    let current = context
    const snapshots = []
    const processingStart = Date.now()

    // 创建处理上下文
    const processContext = {
      startTime: processingStart,
      snapshots,
      metadata: {},
      metrics: {
        duration: 0,
        processorTimes: []
      }
    }

    // 添加超时控制
    const TIMEOUT = 30000 // 30秒超时
    
    const executeWithTimeout = async (processor, ctx) => {
      return Promise.race([
        processor(ctx),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('处理器执行超时')), TIMEOUT)
        )
      ])
    }

    try {
      // 执行前置钩子
      for (const hook of this.hooks.beforeProcess) {
        await hook(current, processContext)
      }

      // 执行中间件
      for (const middleware of this.middleware) {
        current = await middleware(current, processContext)
      }

      // 执行处理器
      for (const { processor, metadata } of this.processors) {
        const processorStart = Date.now()
        
        // 检查处理器是否包含堆栈切换指令
        if (metadata.switchTo) {
          return this.switchTo(metadata.switchTo, current)
        }

        snapshots.push(current.getState?.() || current)

        try {
          current = await processor(current)
          
          processContext.metrics.processorTimes.push({
            id: metadata.id,
            duration: Date.now() - processorStart
          })
        } catch (error) {
          for (const hook of this.hooks.onError) {
            await hook(error, current, processContext)
          }
          throw error
        }
      }

      // 执行后置钩子
      for (const hook of this.hooks.afterProcess) {
        await hook(current, processContext)
      }

      processContext.metrics.duration = Date.now() - processingStart

      return current
    } catch (error) {
      console.error('处理管线执行失败:', error)
      return snapshots[snapshots.length - 1] || current
    }
  }

  /**
   * 添加处理器
   * @param {Function} processor 处理函数
   * @param {Object} metadata 处理器元数据
   */
  add(processor, metadata = {}) {
    if (typeof processor !== 'function') {
      throw new Error('处理器必须是函数')
    }
    this.processors.push({ processor, metadata })
    return this
  }

  /**
   * 添加中间件支持
   * @param {Function} middleware 中间件函数
   */
  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('中间件必须是函数')
    }
    this.middleware.push(middleware)
    return this
  }

  /**
   * 添加生命周期钩子
   * @param {String} type 钩子类型
   * @param {Function} handler 钩子处理函数
   */
  addHook(type, handler) {
    if (!this.hooks[type]) {
      throw new Error(`未知的钩子类型: ${type}`)
    }
    this.hooks[type].push(handler)
    return this
  }

  /**
   * 清空处理器
   */
  clear() {
    this.processors = []
    return this
  }
}

/**
 * 创建类型安全的堆栈工厂函数
 */
export const createTypedStack = (type, options = {}) => {
  const stack = new Stack(type)
  const {
    converters = {},
    validators = {},
    resultHandlers = {},
    processorRegistry = new Map()
  } = options

  // 注册默认转换器
  Object.entries(converters).forEach(([types, converter]) => {
    const [fromType, toType] = types.split('->')
    stack.registerConverter(fromType, toType, converter)
  })

  // 添加结果和错误追踪
  stack.results = new Map()
  stack.errors = new Map()
  stack.registry = processorRegistry

  // 增强add方法
  const originalAdd = stack.add.bind(stack)
  stack.add = (processor, metadata = {}) => {
    const id = crypto.randomUUID()
    const wrappedProcessor = async (ctx) => {
      try {
        // 1. 验证输入
        if (validators.context && !validators.context(ctx)) {
          throw new Error(`无效的${type}上下文`)
        }

        // 2. 执行处理器
        const result = await processor(ctx)

        // 3. 验证输出
        if (validators.context && !validators.context(result)) {
          throw new Error(`处理器返回了无效的${type}上下文`)
        }

        // 4. 记录结果
        stack.results.set(id, {
          success: true,
          output: result,
          timestamp: Date.now()
        })

        return result
      } catch (error) {
        stack.errors.set(id, {
          error,
          input: ctx.getState?.(),
          timestamp: Date.now(),
          processorId: id
        })
        throw new Error(`处理器 ${metadata.name || id} 执行失败: ${error.message}`)
      }
    }

    return originalAdd(wrappedProcessor, { ...metadata, id, type: `${type}-processor` })
  }

  // 添加辅助方法
  stack.getProcessingResults = () => ({
    results: Array.from(stack.results.entries()),
    errors: Array.from(stack.errors.entries())
  })

  stack.reorder = (newOrder) => {
    const processorMap = new Map(stack.processors.map(p => [p.metadata.id, p]))
    stack.processors = newOrder.map(id => processorMap.get(id)).filter(Boolean)
    return stack
  }

  stack.remove = (processorId) => {
    stack.processors = stack.processors.filter(p => p.metadata.id !== processorId)
    return stack
  }

  return stack
}

