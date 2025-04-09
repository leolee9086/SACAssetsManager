export class AbstractBase {
    // 私有符号
    static #constrainedProps = Symbol('constrainedProps');
    static #abstractMethods = Symbol('abstractMethods');
    static #stateConstraints = Symbol('stateConstraints');
    static #methodChains = Symbol('methodChains');
    static #relationConstraints = Symbol('relationConstraints');

    // 私有字段
    #state = {};
    #lifecycleState = 'created';
    #methodCalled = new Set();
    #stateHistory = [];
    #relations = new Map();
    #stateSubscribers = new Map();
    #globalStateSubscribers = new Set();
    #stateChangeQueue = [];
    #isNotifying = false;

    constructor() {
        // 防止直接实例化
        if (this.constructor === AbstractBase) {
            throw new Error('AbstractBase 类不能被直接实例化');
        }

        // 初始化各种约束集合
        this._initializeConstraints();

        // 验证
        this._validateImplementation();
        this._validatePropertyTypes();
        this._validateConstrainedProps();
    }

    // 初始化约束集合
    _initializeConstraints() {
        const constructor = this.constructor;
        if (!constructor[AbstractBase.#constrainedProps]) {
            constructor[AbstractBase.#constrainedProps] = new Set(['id']);
        }
        if (!constructor[AbstractBase.#abstractMethods]) {
            constructor[AbstractBase.#abstractMethods] = new Set(['initialize', 'process']);
        }
        if (!constructor[AbstractBase.#stateConstraints]) {
            constructor[AbstractBase.#stateConstraints] = new Map();
        }
        if (!constructor[AbstractBase.#methodChains]) {
            constructor[AbstractBase.#methodChains] = new Map();
        }
        if (!constructor[AbstractBase.#relationConstraints]) {
            constructor[AbstractBase.#relationConstraints] = new Map();
        }
    }

    // 静态方法 - 约束管理
    static constrain(propName) {
        this[AbstractBase.#constrainedProps].add(propName);
    }

    static abstract(methodName) {
        this[AbstractBase.#abstractMethods].add(methodName);
    }

    static constrainState(stateName, validator) {
        this[AbstractBase.#stateConstraints].set(stateName, validator);
    }

    static defineChain(chainName, methods) {
        this[AbstractBase.#methodChains].set(chainName, methods);
    }

    static defineRelation(relationName, validator) {
        this[AbstractBase.#relationConstraints].set(relationName, validator);
    }

    // 获取器方法
    static getConstrainedProps() {
        return new Set(this[AbstractBase.#constrainedProps]);
    }

    static getAbstractMethods() {
        return new Set(this[AbstractBase.#abstractMethods]);
    }

    // 验证方法
    _validateConstrainedProps() {
        const currentProto = Object.getPrototypeOf(this);
        const parentProto = Object.getPrototypeOf(currentProto);
        const parentClass = parentProto.constructor;

        const parentConstraints = parentClass.getConstrainedProps();
        for (const prop of parentConstraints) {
            const currentValue = this[prop];
            const parentValue = parentProto[prop]?.call?.(this);

            if (currentValue !== parentValue) {
                throw new Error(
                    `属性 ${prop} 已被约束，不能被修改。` +
                    `期望值: ${parentValue}, 当前值: ${currentValue}`
                );
            }
        }
    }

    _validatePropertyTypes() {
        const currentProto = Object.getPrototypeOf(this);
        const properties = Object.getOwnPropertyDescriptors(currentProto);
        const constrainedProps = this.constructor.getConstrainedProps();

        for (const [name, descriptor] of Object.entries(properties)) {
            if (name === 'constructor' ||
                name.startsWith('_') ||
                constrainedProps.has(name)) {
                continue;
            }

            this._validatePropertyType(name, descriptor);
        }
    }

    _validatePropertyType(name, descriptor) {
        if (descriptor.get || descriptor.set) {
            if (descriptor.get) {
                try {
                    const value = this[name];
                    if (typeof value !== 'function') {
                        throw new Error(
                            `属性 ${name} 必须返回一个函数，` +
                            `当前返回类型: ${typeof value}`
                        );
                    }
                } catch (error) {
                    throw new Error(`属性 ${name} 验证失败: ${error.message}`);
                }
            }
            return;
        }

        if (typeof descriptor.value !== 'function') {
            throw new Error(
                `属性 ${name} 必须是一个函数，` +
                `当前类型: ${typeof descriptor.value}`
            );
        }
    }

    _validateState(state) {
        const constraints = this.constructor[AbstractBase.#stateConstraints];
        if (!constraints) return true;

        for (const [name, validator] of constraints) {
            if (name in state && !validator(state[name])) {
                throw new Error(`状态 ${name} 验证失败: ${state[name]}`);
            }
        }
    }

    _validateMethodCall(methodName) {
        const chains = this.constructor[AbstractBase.#methodChains];
        if (!chains) return true;

        for (const [chainName, methods] of chains) {
            const index = methods.indexOf(methodName);
            if (index > 0) {
                const prevMethod = methods[index - 1];
                if (!this.#methodCalled.has(prevMethod)) {
                    throw new Error(
                        `方法 ${methodName} 必须在 ${prevMethod} 之后调用`
                    );
                }
            }
        }
        this.#methodCalled.add(methodName);
    }

    _validateLifecycleTransition(from, to) {
        const validTransitions = {
            created: ['initializing'],
            initializing: ['ready', 'error'],
            ready: ['processing', 'disposing'],
            processing: ['ready', 'error'],
            error: ['disposing'],
            disposing: ['disposed']
        };

        if (!validTransitions[from]?.includes(to)) {
            throw new Error(`非法的生命周期转换: ${from} -> ${to}`);
        }
    }

    // 状态管理
    setState(updater) {
        const newState = updater(structuredClone(this.#state));
        this._validateState(newState);
        this.#stateHistory.push({
            timestamp: Date.now(),
            previousState: { ...this.#state },
            newState: { ...newState }
        });
        if (this.#stateHistory.length > this.constructor.#MAX_HISTORY_LENGTH) {
            this.#stateHistory.shift();
        }
        this.#state = newState;
        this._notifyStateChange();
    }

    getState() {
        return structuredClone(this.#state);
    }

    getStateHistory() {
        return [...this.#stateHistory];
    }

    // 关系管理
    addRelation(targetResource, relationName) {
        this._validateRelation(targetResource, relationName);
        if (!this.#relations.has(relationName)) {
            this.#relations.set(relationName, new Set());
        }
        this.#relations.get(relationName).add(targetResource);
    }

    getRelations(relationName) {
        return new Set(this.#relations.get(relationName) || []);
    }
    _validateRelation(targetResource, relationName) {
        const validator = this.constructor[AbstractBase.#relationConstraints].get(relationName);
        if (!validator) {
            throw new Error(`未定义的关系类型: ${relationName}`);
        }
        if (!validator(targetResource)) {
            throw new Error(`关系验证失败: ${relationName}`);
        }
    }

    // 生命周期方法
    async create() {
        this._setLifecycleState('initializing');
        try {
            await this._beforeInit();
            await this.initialize();
            await this._afterInit();
            this._setLifecycleState('ready');
        } catch (error) {
            const errorInfo = {
                message: error.message,
                stack: error.stack,
                timestamp: Date.now()
            };
            this.setState(state => ({ ...state, lastError: errorInfo }));
            this._setLifecycleState('error');
            throw error;
        }
    }

    async dispose() {
        this._setLifecycleState('disposing');
        try {
            await this._beforeDispose();
            // 清理资源
            this.#relations.clear();
            this.#methodCalled.clear();
            this._setLifecycleState('disposed');
        } catch (error) {
            this._setLifecycleState('error');
            throw error;
        }
    }
    getLifecycleState() {
        return this.#lifecycleState;
    }
    
    _checkNotDisposed() {
        if (this.#lifecycleState === 'disposed') {
            throw new Error('对象已被销毁，不能执行操作');
        }
    }
    // 生命周期钩子
    async _beforeInit() { }
    async _afterInit() { }
    async _beforeDispose() { }

    // 工具方法
    _setLifecycleState(newState) {
        this._validateLifecycleTransition(this.#lifecycleState, newState);
        this.#lifecycleState = newState;
    }

    // 订阅特定状态变更
    subscribeToState(stateKey, callback) {
        if (!this.#stateSubscribers.has(stateKey)) {
            this.#stateSubscribers.set(stateKey, new Set());
        }
        this.#stateSubscribers.get(stateKey).add(callback);

        // 返回取消订阅函数
        return () => {
            const subscribers = this.#stateSubscribers.get(stateKey);
            if (subscribers) {
                subscribers.delete(callback);
                if (subscribers.size === 0) {
                    this.#stateSubscribers.delete(stateKey);
                }
            }
        };
    }

    // 订阅所有状态变更
    subscribeToAllStates(callback) {
        this.#globalStateSubscribers.add(callback);

        // 返回取消订阅函数
        return () => {
            this.#globalStateSubscribers.delete(callback);
        };
    }

    // 状态变更通知逻辑
    _notifyStateChange() {
        // 如果已经在通知过程中，将变更加入队列
        if (this.#isNotifying) {
            this.#stateChangeQueue.push({
                previousState: this.#stateHistory[this.#stateHistory.length - 2]?.newState || {},
                currentState: this.getState()
            });
            return;
        }

        this.#isNotifying = true;
        try {
            this._processStateChange();
        } finally {
            this.#isNotifying = false;

            // 处理队列中的其他状态变更
            while (this.#stateChangeQueue.length > 0) {
                const nextChange = this.#stateChangeQueue.shift();
                this._processStateChangeWithStates(nextChange.previousState, nextChange.currentState);
            }
        }
    }

    // 处理状态变更
    _processStateChange() {
        const currentState = this.getState();
        const previousState = this.#stateHistory[this.#stateHistory.length - 2]?.newState || {};

        this._processStateChangeWithStates(previousState, currentState);
    }

    // 处理具体的状态变更
    _processStateChangeWithStates(previousState, currentState) {
        // 创建变更描述对象
        const changeDescription = {
            timestamp: Date.now(),
            source: this,
            previousState,
            currentState,
            changes: this._getStateChanges(previousState, currentState)
        };

        // 通知特定状态的订阅者
        for (const [key, value] of Object.entries(currentState)) {
            if (previousState[key] !== value) {
                const subscribers = this.#stateSubscribers.get(key);
                if (subscribers) {
                    for (const callback of subscribers) {
                        try {
                            callback(value, previousState[key], changeDescription);
                        } catch (error) {
                            console.error(`状态订阅者回调出错 (${key}):`, error);
                        }
                    }
                }
            }
        }

        // 通知全局状态订阅者
        for (const callback of this.#globalStateSubscribers) {
            try {
                callback(changeDescription);
            } catch (error) {
                console.error('全局状态订阅者回调出错:', error);
            }
        }
    }

    // 获取状态变更详情
    _getStateChanges(previousState, currentState) {
        const changes = new Map();

        // 检查修改和新增的属性
        for (const [key, value] of Object.entries(currentState)) {
            if (!(key in previousState)) {
                changes.set(key, {
                    type: 'added',
                    value
                });
            } else if (previousState[key] !== value) {
                changes.set(key, {
                    type: 'modified',
                    previousValue: previousState[key],
                    currentValue: value
                });
            }
        }

        // 检查删除的属性
        for (const key of Object.keys(previousState)) {
            if (!(key in currentState)) {
                changes.set(key, {
                    type: 'removed',
                    previousValue: previousState[key]
                });
            }
        }

        return changes;
    }

    // 序列化
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            state: this.getState(),
            lifecycleState: this.#lifecycleState
        };
    }

    toString() {
        return `${this.constructor.name}(id=${this.id}, type=${this.type})`;
    }

    // 抽象属性和方法
    get id() {
        throw new Error('必须实现 id 属性');
    }

    get type() {
        throw new Error('必须实现 type 属性');
    }

    initialize() {
        throw new Error('必须实现 initialize 方法');
    }

    process() {
        throw new Error('必须实现 process 方法');
    }
}