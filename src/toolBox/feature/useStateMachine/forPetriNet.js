/**
 * @fileoverview 动态自适应智能Petri网(DAIPN)状态管理工具
 * 
 * 该模块实现了一个基于Petri网理论的状态管理系统，扩展了传统Petri网，
 * 添加了自适应学习和决策能力，可用于构建复杂的事件驱动系统。
 * 
 * 主要特性：
 * - 基于标准Petri网实现：位置、转换、弧和标记
 * - 动态自适应机制：能够响应事件动态调整网络结构
 * - 内置学习系统：基于历史数据优化网络
 * - 智能决策能力：根据上下文和约束生成最优决策
 * 
 * @module forPetriNet
 */

/**
 * 动态自适应智能Petri网类
 */
export class DAIPN {
    /**
     * 创建一个DAIPN实例
     */
    constructor() {
        // 基本Petri网元素
        this.places = new Map();         // 位置集合
        this.transitions = new Map();    // 转换集合
        this.flowRelations = new Map();  // 流关系 (弧)
        this.currentMarking = new Map(); // 当前标记状态
        
        // 动态自适应智能组件
        this.eventHistory = [];          // 事件历史
        this.adaptiveRules = new Map();  // 自适应规则
        this.learningModel = null;       // 学习模型
        this.decisionStrategies = new Map(); // 决策策略
    }
    
    /**
     * 添加位置
     * @param {string} id - 位置标识符
     * @param {number} [initialTokens=0] - 初始标记数
     * @returns {DAIPN} 当前实例，支持链式调用
     */
    addPlace(id, initialTokens = 0) {
        this.places.set(id, { id, description: id });
        this.currentMarking.set(id, initialTokens);
        return this;
    }
    
    /**
     * 添加转换
     * @param {string} id - 转换标识符
     * @param {Function} [guardFunction=null] - 转换守卫函数，返回布尔值表示是否允许转换
     * @returns {DAIPN} 当前实例，支持链式调用
     */
    addTransition(id, guardFunction = null) {
        this.transitions.set(id, { 
            id, 
            guard: guardFunction || (() => true),
            priority: 1
        });
        return this;
    }
    
    /**
     * 添加弧（从位置到转换或从转换到位置）
     * @param {string} sourceId - 源节点ID
     * @param {string} targetId - 目标节点ID
     * @param {number} [weight=1] - 弧权重
     * @returns {DAIPN} 当前实例，支持链式调用
     */
    addArc(sourceId, targetId, weight = 1) {
        const arcId = `${sourceId}->${targetId}`;
        this.flowRelations.set(arcId, { sourceId, targetId, weight });
        return this;
    }
    
    /**
     * 检查转换是否启用
     * @param {string} transitionId - 转换ID
     * @returns {boolean} 转换是否可触发
     */
    isTransitionEnabled(transitionId) {
        const inputArcs = [...this.flowRelations.values()]
            .filter(arc => arc.targetId === transitionId);
            
        return inputArcs.every(arc => {
            const tokens = this.currentMarking.get(arc.sourceId) || 0;
            return tokens >= arc.weight;
        });
    }
    
    /**
     * 执行转换
     * @param {string} transitionId - 要执行的转换ID
     * @returns {boolean} 转换是否成功执行
     */
    fireTransition(transitionId) {
        if (!this.isTransitionEnabled(transitionId)) {
            return false;
        }
        
        const transition = this.transitions.get(transitionId);
        if (!transition.guard()) {
            return false;
        }
        
        // 消耗输入标记
        const inputArcs = [...this.flowRelations.values()]
            .filter(arc => arc.targetId === transitionId);
            
        inputArcs.forEach(arc => {
            const currentTokens = this.currentMarking.get(arc.sourceId);
            this.currentMarking.set(arc.sourceId, currentTokens - arc.weight);
        });
        
        // 产生输出标记
        const outputArcs = [...this.flowRelations.values()]
            .filter(arc => arc.sourceId === transitionId);
            
        outputArcs.forEach(arc => {
            const currentTokens = this.currentMarking.get(arc.targetId) || 0;
            this.currentMarking.set(arc.targetId, currentTokens + arc.weight);
        });
        
        return true;
    }
    
    /**
     * 处理外部事件
     * @param {Object} event - 事件对象
     * @returns {DAIPN} 当前实例，支持链式调用
     */
    handleEvent(event) {
        // 记录事件
        this.eventHistory.push({
            timestamp: Date.now(),
            event: event
        });
        
        // 执行响应函数
        const applicableTransitions = this.getApplicableTransitions(event);
        applicableTransitions.forEach(transId => this.fireTransition(transId));
        
        // 执行自适应功能 - 根据事件动态调整网络
        this.adapt(event);
        
        return this;
    }
    
    /**
     * 自适应函数 - 根据事件调整网络结构
     * @param {Object} event - 事件对象
     * @returns {DAIPN} 当前实例，支持链式调用
     */
    adapt(event) {
        const adaptiveRule = this.adaptiveRules.get(event.type);
        if (adaptiveRule) {
            adaptiveRule(this, event);
        }
        
        // 定期学习优化
        if (this.eventHistory.length % 10 === 0) {
            this.learn();
        }
        
        return this;
    }
    
    /**
     * 学习函数 - 基于历史优化网络
     * @returns {DAIPN} 当前实例，支持链式调用
     */
    learn() {
        if (this.learningModel) {
            const optimizations = this.learningModel.analyze(this.eventHistory);
            optimizations.forEach(opt => this.applyOptimization(opt));
        }
        return this;
    }
    
    /**
     * 获取适用于当前事件的转换
     * @param {Object} event - 事件对象
     * @returns {string[]} 适用转换ID数组，按优先级排序
     */
    getApplicableTransitions(event) {
        // 实现响应函数R逻辑
        return [...this.transitions.keys()]
            .filter(transId => {
                const transition = this.transitions.get(transId);
                return this.isTransitionEnabled(transId) && 
                       transition.guard(event, this.currentMarking);
            })
            .sort((a, b) => {
                // 按优先级排序
                return this.transitions.get(b).priority - 
                       this.transitions.get(a).priority;
            });
    }
    
    /**
     * 决策函数 - 智能决策生成操作
     * @param {Object} context - 上下文信息
     * @param {Object} constraints - 约束条件
     * @returns {string|null} 最佳行动ID或null
     */
    makeDecision(context, constraints) {
        // 实现决策函数D逻辑
        let bestAction = null;
        let bestScore = -Infinity;
        
        for (const [actionId, strategy] of this.decisionStrategies.entries()) {
            const score = strategy.evaluate(
                context, 
                this.currentMarking,
                constraints
            );
            
            if (score > bestScore) {
                bestScore = score;
                bestAction = actionId;
            }
        }
        
        return bestAction;
    }
    
    /**
     * 获取系统当前状态的快照
     * @returns {Object} 状态快照
     */
    getSnapshot() {
        return {
            marking: Object.fromEntries(this.currentMarking),
            places: [...this.places.keys()],
            transitions: [...this.transitions.keys()],
            relations: [...this.flowRelations.keys()]
        };
    }
    
    /**
     * 从状态快照恢复
     * @param {Object} snapshot - 状态快照
     * @returns {DAIPN} 当前实例，支持链式调用
     */
    restoreFromSnapshot(snapshot) {
        if (snapshot.marking) {
            this.currentMarking = new Map(Object.entries(snapshot.marking));
        }
        return this;
    }
}

/**
 * 创建适用于交互系统的Petri网实例
 * @returns {DAIPN} 配置好的DAIPN实例
 */
export function createInteractivePetriNet() {
    const petriNet = new DAIPN();
    
    // 配置基础网络
    petriNet
        .addPlace('idle', 1)
        .addPlace('waiting', 0)
        .addPlace('processing', 0)
        .addPlace('completed', 0)
        .addTransition('receiveInput', (event) => event?.type === 'input')
        .addTransition('processData', () => true)
        .addTransition('finishProcess', () => true)
        .addArc('idle', 'receiveInput')
        .addArc('receiveInput', 'waiting')
        .addArc('waiting', 'processData')
        .addArc('processData', 'processing')
        .addArc('processing', 'finishProcess')
        .addArc('finishProcess', 'completed')
        .addArc('finishProcess', 'idle');
    
    // 配置自适应规则
    petriNet.adaptiveRules.set('highLoad', (net, event) => {
        // 负载高时动态添加更多处理分支
        if (!net.places.has('processing2')) {
            net.addPlace('processing2', 0)
              .addTransition('alternativeProcess')
              .addArc('waiting', 'alternativeProcess')
              .addArc('alternativeProcess', 'processing2')
              .addArc('processing2', 'finishProcess');
        }
    });
    
    return petriNet;
}

/**
 * 创建带有持久化功能的Petri网实例
 * @param {string} id - 网络唯一标识符
 * @param {Function} [setup] - 设置函数
 * @returns {Object} 带有持久化功能的DAIPN实例及相关方法
 */
export function createPersistentPetriNet(id, setup) {
    const net = new DAIPN();
    
    // 如果提供了设置函数，执行它
    if (typeof setup === 'function') {
        setup(net);
    }
    
    return {
        net,
        
        // 持久化方法
        async save() {
            try {
                const snapshot = net.getSnapshot();
                localStorage.setItem(`petri_${id}`, JSON.stringify(snapshot));
                return true;
            } catch (error) {
                console.error('保存Petri网状态失败:', error);
                return false;
            }
        },
        
        async load() {
            try {
                const data = localStorage.getItem(`petri_${id}`);
                if (data) {
                    const snapshot = JSON.parse(data);
                    net.restoreFromSnapshot(snapshot);
                    return true;
                }
                return false;
            } catch (error) {
                console.error('加载Petri网状态失败:', error);
                return false;
            }
        },
        
        clear() {
            localStorage.removeItem(`petri_${id}`);
        }
    };
} 