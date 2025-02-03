import { DummySys } from '../personas/DummySys.js'
import { EventEmitter } from 'events'

export class NERV extends EventEmitter {
  constructor() {
    super()
    this.ghosts = new Map()       // 人格容器
    this.activeStack = []         // 激活栈
    this.personaStates = new Map() // 人格状态
    this.syncMonitor = null       // 同步率监控
  }

  // 增强型人格创建
  createPersona(name, traits, config = {}) {
    try {
      if (!name || typeof name !== 'string') {
        throw new Error('人格名称无效')
      }

      if (this.ghosts.has(name)) {
        throw new Error(`人格${name}已存在`)
      }

      const persona = DummySys.fake(name, {
        ...traits,
        meta: {
          created: Date.now(),
          version: '2.0',
          dependencies: config.dependencies || []
        }
      })
      
      this.ghosts.set(name, {
        core: persona,
        state: 'inactive',
        activationCount: 0,
        lastUsed: null,
        config
      })
      
      this.emit('personaCreated', { name, traits })
      return this.#wrapPersonaAPI(name)
    } catch (error) {
      this.emit('error', { type: 'creation', name, error })
      throw error
    }
  }

  // 人格生命周期管理
  manageLifecycle() {
    if (this.lifecycleTimer) {
      clearInterval(this.lifecycleTimer)
    }

    this.lifecycleTimer = setInterval(() => {
      try {
        this.ghosts.forEach((ghost, name) => {
          const inactiveTime = Date.now() - (ghost.lastUsed || ghost.core.meta.created)
          
          if (ghost.activationCount === 0 && inactiveTime > 3600000) {
            this.deactivatePersona(name)
            this.ghosts.delete(name)
            this.emit('personaExpired', { name, inactiveTime })
          }
        })
      } catch (error) {
        this.emit('error', { type: 'lifecycle', error })
      }
    }, 60000)
  }

  // 增强型人格激活
  async activatePersona(name, mode = 'balanced', priority = 5) {
    try {
      const ghost = this.ghosts.get(name)
      if (!ghost) {
        throw new Error(`人格${name}未注册`)
      }

      // 确保使用正确的分裂方法
      const [emotional, logical] = ghost.core.Persona.splitPersona 
        ? ghost.core.Persona.splitPersona() 
        : this.splitPersona(ghost.core.Persona)
        
      const persona = this.#selectPersonaVariant(mode, emotional, logical)

      // 使用filter替代remove
      this.activeStack = this.activeStack.filter(p => p.name !== name)
      
      this.activeStack.push({ 
        name, 
        persona,
        priority,
        activated: Date.now()
      })
      
      // 按优先级排序
      this.activeStack.sort((a, b) => b.priority - a.priority)

      ghost.state = 'active'
      ghost.activationCount++
      ghost.lastUsed = Date.now()
      
      const report = await this.#generateActivationReport(name)
      this.emit('personaActivated', { name, mode, report })
      return report
    } catch (error) {
      this.emit('error', { type: 'activation', name, error })
      throw error
    }
  }

  // 停用人格
  async deactivatePersona(name) {
    try {
      const ghost = this.ghosts.get(name)
      if (!ghost) return

      ghost.state = 'inactive'
      this.activeStack = this.activeStack.filter(p => p.name !== name)
      
      await this.#savePersonaState(name)
      this.emit('personaDeactivated', { name })
    } catch (error) {
      this.emit('error', { type: 'deactivation', name, error })
    }
  }

  // 改进协同工作流
  async collaborativeProcess(task, config = {}) {
    try {
      const workflow = config.workflow || ['Melchior', 'Balthazar', 'Casper']
      const results = []
      const context = { 
        startTime: Date.now(),
        previousResults: [],  // 添加前序结果
        workflowPosition: 0   // 添加工作流位置
      }

      for (const personaName of workflow) {
        const [name, mode] = personaName.split('#')
        if (mode) {
          await this.activatePersona(name, mode)
        }

        context.workflowPosition = workflow.indexOf(personaName)
        const result = await this.#executeWithPersona(name, task, context)
        
        // 更新上下文
        context.previousResults.push({
          persona: name,
          result: result
        })

        results.push({
          persona: name,
          result: this.#applyPersonaFilter(name, result)
        })

        if (result.terminate) {
          this.emit('workflowTerminated', { 
            name, 
            reason: result.terminateReason,
            position: context.workflowPosition 
          })
          break
        }
      }
      
      const mergedResults = this.#mergeResults(results)
      this.emit('workflowCompleted', { 
        task, 
        results: mergedResults,
        executionTime: Date.now() - context.startTime 
      })
      return mergedResults
    } catch (error) {
      this.emit('error', { type: 'workflow', task, error })
      throw error
    }
  }

  // 高级人格分裂算法
  splitPersona(original, depth = 0) {
    try {
      const variants = []
      const TRAIT_VARIATION = 0.15
      
      for (let i = 0; i < 2; i++) {
        const variant = JSON.parse(JSON.stringify(original))
        for (const trait in variant.personalityTraits) {
          const delta = (Math.random() * TRAIT_VARIATION) * (i === 0 ? 1 : -1)
          variant.personalityTraits[trait] = Math.min(1, 
            Math.max(0, variant.personalityTraits[trait] + delta))
        }
        variants.push(variant)
        
        if (depth < 2) {
          variants.push(...this.splitPersona(variant, depth + 1))
        }
      }
      
      return variants
    } catch (error) {
      this.emit('error', { type: 'split', error })
      return [original, original]
    }
  }

  // 状态监控增强
  startSyncMonitoring(interval = 5000) {
    if (this.syncMonitor) {
      clearInterval(this.syncMonitor)
    }

    this.syncMonitor = setInterval(() => {
      try {
        this.activeStack.forEach(({name}) => {
          const syncStatus = this.#calculateSyncStatus(name)
          this.emit('syncUpdate', { name, ...syncStatus })
          
          if (syncStatus.status === 'desynced') {
            this.#rebalancePersona(name)
          }
        })
      } catch (error) {
        this.emit('error', { type: 'monitoring', error })
      }
    }, interval)
  }

  // 停止监控
  stopSyncMonitoring() {
    if (this.syncMonitor) {
      clearInterval(this.syncMonitor)
      this.syncMonitor = null
    }
  }

  // 私有辅助方法
  #selectPersonaVariant(mode, emotional, logical) {
    switch (mode) {
      case 'emotional': return emotional
      case 'logical': return logical
      case 'balanced': return this.#mergePersonaTraits(emotional, logical)
      default: return logical
    }
  }

  #mergePersonaTraits(a, b) {
    const merged = JSON.parse(JSON.stringify(a))
    for (const trait in merged.personalityTraits) {
      merged.personalityTraits[trait] = 
        (a.personalityTraits[trait] + b.personalityTraits[trait]) / 2
    }
    return merged
  }

  async #generateActivationReport(name) {
    const ghost = this.ghosts.get(name)
    return {
      name,
      state: ghost.state,
      activations: ghost.activationCount,
      lastUsed: ghost.lastUsed,
      syncStatus: await this.#calculateSyncStatus(name)
    }
  }

  // 改进状态监控
  #calculateSyncStatus(name) {
    const ghost = this.ghosts.get(name)
    if (!ghost) return { status: 'error', ratio: 0 }

    const uptime = Date.now() - ghost.lastUsed
    const baseSync = Math.max(0, 100 - (uptime / 3600000) * 10)
    
    // 使用Ghost的状态信息
    const ghostStatus = ghost.core.getStatus()
    const confidenceFactor = ghostStatus.confidence * 20
    const personalityFactor = ghost.core.Persona.personalityTraits.conscientiousness * 20

    return {
      status: baseSync + personalityFactor + confidenceFactor >= 80 ? 'synced' : 'desynced',
      ratio: Math.min(100, baseSync + personalityFactor + confidenceFactor),
      confidence: ghostStatus.confidence,
      lastExecution: ghostStatus.lastExecution
    }
  }

  async #executeWithPersona(name, task, context) {
    const ghost = this.ghosts.get(name)
    if (!ghost) throw new Error(`人格${name}未注册`)

    try {
      const result = await ghost.core.execute(task, context)
      ghost.lastUsed = Date.now()
      return result
    } catch (error) {
      this.emit('error', { type: 'execution', name, task, error })
      throw error
    }
  }

  #applyPersonaFilter(name, data) {
    const filters = {
      Melchior: d => d.filter(item => item.score >= 7),
      Balthazar: d => d.sort((a,b) => b.emotionalScore - a.emotionalScore),
      Casper: d => d.map(item => ({...item, risk: this.#calculateRisk(item)}))
    }
    return filters[name]?.(data) || data
  }

  #calculateRisk(item) {
    return {
      level: item.score < 5 ? 'high' : item.score < 7 ? 'medium' : 'low',
      factors: ['complexity', 'uncertainty', 'impact']
        .filter(f => item[f] && item[f] > 0.7)
    }
  }

  // 改进结果合并
  #mergeResults(results) {
    const summary = results.map(r => ({
      persona: r.persona,
      confidence: r.result.confidence || 0,
      timestamp: r.result.timestamp
    }))

    // 按置信度加权的建议合并
    const consensus = results.reduce((acc, r) => {
      const weight = r.result.confidence || 0.5
      Object.entries(r.result.recommendations || {}).forEach(([key, value]) => {
        if (!acc[key]) {
          acc[key] = { ...value, weight }
        } else {
          // 加权合并
          acc[key] = {
            ...acc[key],
            score: (acc[key].score * acc[key].weight + value.score * weight) / (acc[key].weight + weight),
            weight: acc[key].weight + weight
          }
        }
      })
      return acc
    }, {})

    return {
      summary,
      consensus,
      timestamp: Date.now(),
      averageConfidence: summary.reduce((acc, s) => acc + s.confidence, 0) / summary.length
    }
  }

  async #savePersonaState(name) {
    const ghost = this.ghosts.get(name)
    if (!ghost) return

    const state = {
      activationCount: ghost.activationCount,
      lastUsed: ghost.lastUsed,
      traits: ghost.core.Persona.personalityTraits
    }

    this.personaStates.set(name, state)
  }

  #wrapPersonaAPI(name) {
    return {
      execute: (task) => this.#executeWithPersona(name, task, {}),
      getStatus: () => this.#calculateSyncStatus(name),
      addDependency: (dep) => {
        const ghost = this.ghosts.get(name)
        if (ghost) {
          ghost.core.meta.dependencies.push(dep)
        }
      },
      createSnapshot: () => this.personaStates.get(name) || null
    }
  }

  async #rebalancePersona(name) {
    const ghost = this.ghosts.get(name)
    if (!ghost) return

    // 重新平衡人格特质
    const [emotional, logical] = this.splitPersona(ghost.core.Persona)
    ghost.core.Persona = this.#mergePersonaTraits(emotional, logical)
    
    await this.#savePersonaState(name)
    this.emit('personaRebalanced', { name })
  }
}