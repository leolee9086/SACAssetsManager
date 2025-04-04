/**
 * 节点接口管理器 - 基础类定义
 */

// 数据类型验证器
const DEFAULT_TYPE_VALIDATORS = new Map([
  ['string', value => typeof value === 'string'],
  ['number', value => typeof value === 'number'],
  ['boolean', value => typeof value === 'boolean'],
  ['array', value => Array.isArray(value)],
  ['object', value => value !== null && typeof value === 'object'],
  ['any', () => true]
]);

class Card {
  constructor(id, name, type = 'normal') {
    this.id = id;
    this.name = name;
    this.type = type; // normal, branch, loop, merge
    this.interfaces = new Map();
    this.conditions = new Map(); // 分支条件
    this.loopCondition = null;   // 循环条件
    this.iterationData = null;   // 循环数据
    this.onProcess = null;
    this.maxIterations = 100;
    this.currentIteration = 0;
    this.status = 'idle'; // idle, running, completed, error
    this.executionContext = null; // 执行上下文
    this.typeValidators = new Map(DEFAULT_TYPE_VALIDATORS);

    // 执行状态追踪
    this._executionPromise = null;
    this._executionResolver = null;
  }

  // 新增：开始执行
  startExecution(context = {}) {
    this.status = 'running';
    this.executionContext = context;
    console.log('开始执行，状态设置为 running', context);
    this._executionPromise = new Promise(resolve => {
      this._executionResolver = resolve
      console.log('Promise 已创建');
    });
    return this._executionPromise;
  }

  // 新增：完成执行
  completeExecution(result = null) {
    console.log('尝试完成执行');
    this.status = 'completed';
    console.log('执行完成，状态设置为 completed');
    if (this._executionResolver) {
      this._executionResolver(result);
      console.log('Promise 已 resolve');
    } else {
      console.warn('执行完成时，_executionResolver 未定义');
    }
    this.executionContext = null;
  }

  // 新增：执行错误处理
  handleExecutionError(error) {
    console.log('尝试处理执行错误');
    this.status = 'error';
    console.log('执行错误，状态设置为 error');
    if (this._executionResolver) {
      this._executionResolver({ error });
      console.log('Promise 已 resolve with error');
    } else {
      console.warn('执行错误时，_executionResolver 未定义');
    }
    this.executionContext = null;
  }
  /**
   * 添加自定义类型验证器
   * @param {string} typeName - 自定义类型名称
   * @param {Function} validator - 验证函数
   */
  addTypeValidator(typeName, validator) {
    if (typeof validator !== 'function') {
      throw new Error('验证器必须是函数');
    }
    this.typeValidators.set(typeName, validator);
  }

  /**
   * 验证值是否符合指定类型
   * @param {*} value - 要验证的值
   * @param {string} dataType - 期望的数据类型
   * @returns {boolean} 验证结果
   */
  validateType(value, dataType) {
    // 如果类型是 'any'，直接返回 true
    if (dataType === 'any') {
      return true;
    }

    // 如果值是 null 或 undefined
    if (value === null || value === undefined) {
      // 只有 'any' 和 'object' 类型允许 null
      return dataType === 'object';
    }

    const validator = this.typeValidators.get(dataType);
    if (!validator) {
      console.warn(`未找到类型 "${dataType}" 的验证器，将作为 any 类型处理`);
      return true;
    }

    try {
      return validator(value);
    } catch (error) {
      console.error('类型验证错误:', error);
      return false;
    }
  }

  /**
   * 向节点添加新的接口
   * @param {string} id - 接口唯一标识符
   * @param {Object} definition - 接口定义对象
   */
  addInterface(id, definition) {
    // 如果没有指定数据类型，默认为 'any'
    const dataType = definition.dataType || 'any';

    // 验证接口类型
    if (!['input', 'output'].includes(definition.type)) {
      console.log(id, definition)
      throw new Error(`无效的接口类型: ${definition.type}`);
    }

    // 验证位置值
    if (typeof definition.position !== 'number' || definition.position < 0) {
      throw new Error('position必须是非负数');
    }

    const iface = {
      id,
      cardId: this.id,
      ...definition,
      dataType,
      value: definition.value ?? null
    };

    this.interfaces.set(id, iface);
    return iface;
  }

  removeInterface(id) {
    this.interfaces.delete(id);
  }

  getValue(id) {
    return this.interfaces.get(id)?.value ?? null;
  }

  setValue(id, value) {
    const iface = this.interfaces.get(id);
    if (!iface) {
      throw new Error(`接口 "${id}" 不存在`);
    }

    // 使用新的类型验证方法
    if (!this.validateType(value, iface.dataType)) {
      console.error('类型验证失败:', {
        期望类型: iface.dataType,
        实际值: value,
        值类型: typeof value,
        接口: iface
      });
      throw new Error(`值类型不匹配: 期望 ${iface.dataType}, 实际值: ${JSON.stringify(value)}`);
    }

    iface.value = value;
  }

  getInterface(id) {
    return this.interfaces.get(id);
  }

  getInterfaceStatus(id) {
    const iface = this.interfaces.get(id);
    if (!iface) return null;

    return {
      value: iface.value,
      type: iface.type,
      dataType: iface.dataType
    };
  }

  // 添加分支条件
  setCondition(outputId, condition) {
    if (!this.interfaces.has(outputId)) {
      throw new Error(`输出口 "${outputId}" 不存在`);
    }
    this.conditions.set(outputId, condition);
  }

  // 设置循环条件
  setLoopCondition(condition) {
    if (this.type !== 'loop') {
      throw new Error('只有循环节点可以设置循环条件');
    }
    this.loopCondition = condition;
  }

  // 评估分支条件
  async evaluateCondition(outputId, context) {
    const condition = this.conditions.get(outputId);
    if (!condition) return true;
    return await condition(context);
  }

  // 评估循环条件
  async evaluateLoopCondition(context) {
    if (!this.loopCondition) return false;
    return await this.loopCondition(context);
  }

  // 添加设置最大循环次数的方法
  setMaxIterations(count) {
    if (typeof count !== 'number' || count < 1) {
      throw new Error('最大循环次数必须是正整数');
    }
    this.maxIterations = count;
  }

  // 重置循环计数
  resetIterationCount() {
    this.currentIteration = 0;
  }

  // 检查是否达到最大循环次数
  isMaxIterationsReached() {
    return this.type === 'loop' && this.currentIteration >= this.maxIterations;
  }

  // 新增：获取节点显示信息
  getDisplayInfo() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: this.status,
      interfaces: Array.from(this.interfaces.values()).map(iface => ({
        id: iface.id,
        type: iface.type,
        dataType: iface.dataType,
        position: iface.position,
        value: iface.value
      }))
    };
  }
}

export class CardInterfaceManager {
  constructor() {
    this.cards = new Map();
    this.connections = new Map();
    this.middlewares = [];
    this.eventHandlers = new Map();
    this.executionQueue = new ExecutionQueue();
    this.executionStatus = 'idle';
  }

  // 新增：执行状态枚举
  static get ExecutionStatus() {
    return {
      IDLE: 'idle',
      RUNNING: 'running',
      COMPLETED: 'completed',
      ERROR: 'error'
    };
  }

  // 新增：节点类型枚举
  static get NodeTypes() {
    return {
      NORMAL: 'normal',
      BRANCH: 'branch',
      LOOP: 'loop',
      MERGE: 'merge'
    };
  }


  async executeTransfer(fromCard, fromInterfaceId, toCard, toCardId, toInterfaceId, value) {
    try {
      console.log(`开始执行传输: ${fromCard.id} -> ${toCard.id}`);

      // 准备执行上下文
      const executionContext = {
        value,
        fromCard,
        fromInterfaceId,
        toCard,
        toInterfaceId,
        iteration: toCard.currentIteration
      };

      // 始节点执行
      let promise = toCard.startExecution(executionContext);
      console.log(promise)
      console.log('节点执行开始');

      // 设置目标节点的值
      toCard.setValue(toInterfaceId, value);
      console.log('目标节点的值已设置');

      // 根据节点类型处理
      let result;
      switch (toCard.type) {
        case CardInterfaceManager.NodeTypes.LOOP:
          result = await this._handleLoopNode(toCard, toInterfaceId, executionContext);
          break;
        case CardInterfaceManager.NodeTypes.BRANCH:
          result = await this._handleBranchNode(toCard, toInterfaceId, executionContext);
          break;
        case CardInterfaceManager.NodeTypes.MERGE:
          result = await this._handleMergeNode(toCard, toInterfaceId, executionContext);
          break;
        default:
          result = await this._handleNormalNode(toCard, executionContext);
      }
      console.log('节点类型处理完成');

      // 完成执行
      toCard.completeExecution(result);
      console.log('执行完成');

      // 触发事件
      this.emitEvent('valueTransferred', { ...executionContext, result });

      return result;
    } catch (error) {
      console.warn('执行传输错误:', error);
      toCard.handleExecutionError(error);
      this.emitEvent('transferError', { error, fromCard, fromInterfaceId, toCard, toInterfaceId, value });
      throw error;
    }
  }

  // 新增：处理循环节点
  async _handleLoopNode(card, interfaceId, context) {
    const results = [];
    while (!card.isMaxIterationsReached()) {
      const shouldContinue = await card.evaluateLoopCondition(context);
      if (!shouldContinue) break;

      if (typeof card.onProcess === 'function') {
        const iterationResult = await card.onProcess(context);
        results.push(iterationResult);
      }

      card.currentIteration++;
      context.iteration = card.currentIteration;
    }
    card.resetIterationCount();
    return results;
  }

  // 新增：处理分支节点
  async _handleBranchNode(card, interfaceId, context) {
    const results = new Map();
    for (const [outputId, condition] of card.conditions.entries()) {
      const shouldExecute = await card.evaluateCondition(outputId, context);
      if (shouldExecute) {
        if (typeof card.onProcess === 'function') {
          const branchResult = await card.onProcess({ ...context, outputId });
          results.set(outputId, branchResult);
        }
      }
    }
    return results;
  }

  // 新增：处理合并节点
  async _handleMergeNode(card, interfaceId, context) {
    if (typeof card.onProcess === 'function') {
      return await card.onProcess(context);
    }
    return context.value;
  }

  // 新增：处理普通节点
  async _handleNormalNode(card, context) {
    if (typeof card.onProcess === 'function') {
      return await card.onProcess(context);
    }
    return context.value;
  }

  // 修改：图执行实现
  async executeGraph(inputValues = {}, options = {}) {
    try {
      this.executionStatus = CardInterfaceManager.ExecutionStatus.RUNNING;
      this.emitEvent('executionStarted', { inputValues, options });

      // 分析网络结构
      const { inputs, outputs } = this._analyzeNetwork();

      // 重置所有节点状态
      for (const card of this.cards.values()) {
        card.status = 'idle';
        card.currentIteration = 0;
        card.executionContext = null;
      }

      // 设置输入值并开始传播
      const inputPromises = [];
      for (const [key, { card, interfaceId }] of inputs.entries()) {
        const value = inputValues[key];
        if (value !== undefined) {
          card.setValue(interfaceId, value);
          inputPromises.push(this.propagateValue(card, interfaceId));
        }
      }

      // 等待所有执行完成
      await Promise.all(inputPromises);

      // 收集输出结果
      const result = {};
      for (const [key, { card, interfaceId }] of outputs.entries()) {
        result[key] = card.getValue(interfaceId);
      }

      this.executionStatus = CardInterfaceManager.ExecutionStatus.COMPLETED;
      this.emitEvent('executionCompleted', { result });

      return result;
    } catch (error) {
      console.warn(error)
      this.executionStatus = CardInterfaceManager.ExecutionStatus.ERROR;
      this.emitEvent('executionError', { error });
      throw error;
    }
  }

  // 修改：连接实现
  async connect(fromCardOrId, fromInterfaceId, toCardOrId, toInterfaceId) {
    try {
      // 获取源节点和目标节点
      const fromCard = this._getCard(fromCardOrId);
      const toCard = this._getCard(toCardOrId);

      // 验证接口存在性和类型匹配
      const fromInterface = fromCard.getInterface(fromInterfaceId);
      const toInterface = toCard.getInterface(toInterfaceId);

      if (!fromInterface || !toInterface) {
        throw new Error('接口不存在');
      }

      if (fromInterface.type !== 'output' || toInterface.type !== 'input') {
        throw new Error(`接口类型不匹配: 源接口(${fromInterface.type}) -> 目标接口(${toInterface.type})`);
      }

      // 检查数据类型兼容性
      if (toInterface.dataType !== 'any' && fromInterface.dataType !== toInterface.dataType) {
        throw new Error(`数据类型不匹配: ${fromInterface.dataType} -> ${toInterface.dataType}`);
      }

      // 检查是否已存在连接
      const connectionKey = `${fromCard.id}:${fromInterfaceId}`;
      if (this.connections.has(connectionKey)) {
        throw new Error('源接口已被连接');
      }

      // 检查循环依赖
      if (this.detectCycle(fromCard.id, fromInterfaceId, toCard.id)) {
        throw new Error('检测到循环依赖');
      }

      // 建立连接
      this.connections.set(
        connectionKey,
        `${toCard.id}:${toInterfaceId}`
      );

      // 触发连接创建事件
      this.emitEvent('connectionCreated', {
        fromCard,
        fromInterfaceId,
        toCard,
        toInterfaceId
      });

      // 如果源接口已有值，立即传播到目标接口
      const value = fromCard.getValue(fromInterfaceId);
      if (value !== null && value !== undefined) {
        await this.propagateValue(fromCard, fromInterfaceId);
      }

      // 返回连接成功
      return true;

    } catch (error) {
      console.warn(error)
      this.emitEvent('connectionError', {
        error,
        fromCard: fromCardOrId,
        fromInterfaceId,
        toCard: toCardOrId,
        toInterfaceId
      });
      throw error;
    }
  }

  // 新增：辅助方法
  _getCard(cardOrId) {
    if (typeof cardOrId === 'string') {
      const card = this.cards.get(cardOrId);
      if (!card) throw new Error(`节点未找到: ${cardOrId}`);
      return card;
    }
    return cardOrId;
  }

  _validateConnection(fromCard, fromInterfaceId, toCard, toInterfaceId) {
    const fromInterface = fromCard.getInterface(fromInterfaceId);
    const toInterface = toCard.getInterface(toInterfaceId);

    if (!fromInterface || !toInterface) {
      throw new Error('接口未找到');
    }

    if (fromInterface.type !== 'output' || toInterface.type !== 'input') {
      throw new Error('接口类型不匹配');
    }

    // 可以添加更多验证逻辑...
  }

  /**
   * 创建新节点
   * @param {string} id - 节点唯一标识符
   * @param {string} name - 节点名称
   * @param {Object[]} interfaces - 接口定数组
   * @returns {Card} 新���的节点实
   */
  createCard(id, name, interfaces = []) {
    // 验证 interfaces 是否为数组
    if (!Array.isArray(interfaces)) {
      throw new Error('interfaces 参数必须是数组');
    }

    const card = new Card(id, name);

    // 自动添加定义的接口
    for (const interfaceDef of interfaces) {
      console.log(interfaceDef, interfaces);
      card.addInterface(interfaceDef.id, interfaceDef);
    }

    this.cards.set(id, card);
    return card;
  }

  removeCard(cardId) {
    const card = this.cards.get(cardId);
    if (card) {
      for (const interfaceId of card.interfaces.keys()) {
        this.removeInterface(cardId, interfaceId);
      }
      this.cards.delete(cardId);
    }
  }

  addInterface(cardId, interfaceId, definition) {
    const card = this.cards.get(cardId);
    if (!card) {
      throw new Error('节点不存在');
    }
    card.addInterface(interfaceId, definition);
  }

  removeInterface(cardId, interfaceId) {
    const card = this.cards.get(cardId);
    if (card) {
      card.removeInterface(interfaceId);
      this.cleanupConnections(cardId, interfaceId);
      this.clearCaches(cardId, interfaceId);
    }
  }

  detectCycle(fromCardId, fromInterfaceId, toCardId) {
    const visited = new Set();

    const dfs = (currentCardId) => {
      if (currentCardId === fromCardId) {
        // 检查是否是允许的循环
        const card = this.cards.get(currentCardId);
        if (card && card.type === 'loop' && card.loopCondition) {
          return false; // 允许循环
        }
        return true; // 不允许的循环
      }

      if (visited.has(currentCardId)) return false;
      visited.add(currentCardId);

      for (const [connFrom, connTo] of this.connections.entries()) {
        const [cardId] = connFrom.split(':');
        if (cardId === currentCardId) {
          const [nextCardId] = connTo.split(':');
          if (dfs(nextCardId)) return true;
        }
      }

      return false;
    };

    return dfs(toCardId);
  }


  async executeMiddlewares(data) {
    let index = 0;

    const next = async () => {
      if (index < this.middlewares.length) {
        console.log(`执行中间件 ${index + 1}/${this.middlewares.length}`);
        try {
          await this.middlewares[index++](data, next);
        } catch (error) {
          console.error(`中间件 ${index} 执行错误:`, error);
          throw error;
        }
      }
    };

    await next();
    console.log('所有中间件执行完成');
  }

  /**
   * 验证源节点和值
   */
  async validateSource(fromCardOrId, fromInterfaceId) {
    const fromCard = (typeof fromCardOrId === 'string') ? this.cards.get(fromCardOrId) : fromCardOrId;

    if (!fromCard) {
      throw new Error(`源节点未找到: ${fromCardOrId}`);
    }

    const value = fromCard.getValue(fromInterfaceId);
    if (value === undefined || value === null) {
      throw new Error(`源节点 ${fromCard.id} 的接口 ${fromInterfaceId} 值为空`);
    }

    return { fromCard, value };
  }

  /**
   * 获取并验证目标节点
   */
  getTargetCard(fromCard, fromInterfaceId) {
    const connectionKey = `${fromCard.id}:${fromInterfaceId}`;
    const targetKey = this.connections.get(connectionKey);

    if (!targetKey) {
      throw new Error(`未找到从 ${connectionKey} 出发的连接`);
    }

    const [toCardId, toInterfaceId] = targetKey.split(':');
    const toCard = this.cards.get(toCardId);

    if (!toCard) {
      throw new Error(`目标节点未找到: ${toCardId}`);
    }

    return { toCard, toCardId, toInterfaceId };
  }

  /**
   * 主传播函数
   */
  async propagateValue(fromCardOrId, fromInterfaceId) {
    try {
      console.log(`开始传播值: ${fromCardOrId}, 接口: ${fromInterfaceId}`);
      // 验证源节点和值
      const { fromCard, value } = await this.validateSource(fromCardOrId, fromInterfaceId);

      // 执行中间件
      await this.executeMiddlewares({ fromCard, fromInterfaceId, value });

      // 获取目标节点信息
      const connectionKey = `${fromCard.id}:${fromInterfaceId}`;
      const targetKey = this.connections.get(connectionKey);

      // 如果没有连接，直接返回
      if (!targetKey) {
        console.log(`没有从 ${connectionKey} 出发的连接`);
        return null;
      }

      const [toCardId, toInterfaceId] = targetKey.split(':');
      const toCard = this.cards.get(toCardId);

      if (!toCard) {
        throw new Error(`目标节点未找到: ${toCardId}`);
      }
      // 执行值传输
      const result = await this.executeTransfer(
        fromCard,
        fromInterfaceId,
        toCard,
        toCardId,
        toInterfaceId,
        value
      );
      console.log(result)

      // 触发值变更事件
      this.emitEvent('valueChange', {
        fromCard,
        fromInterfaceId,
        toCard,
        toInterfaceId,
        value
      });

      console.log(`值传播成功: ${fromCardOrId} -> ${toCardId}`);
      return result;
    } catch (error) {
      console.error('值传播错误:', error);
      this.emitEvent('error', error);
      throw error;
    }
  }

  cleanupConnections(cardId, interfaceId) {
    const connectionKey = `${cardId}:${interfaceId}`;

    // 清理作为源的连接
    if (this.connections.has(connectionKey)) {
      const targetKey = this.connections.get(connectionKey);
      this.connections.delete(connectionKey);

      this.emitEvent('connectionRemoved', {
        fromCardId: cardId,
        fromInterfaceId: interfaceId,
        toKey: targetKey
      });
    }

    // 清理作为目标的连接
    for (const [fromKey, toKey] of this.connections.entries()) {
      if (toKey === `${cardId}:${interfaceId}`) {
        this.connections.delete(fromKey);

        const [fromCardId, fromInterfaceId] = fromKey.split(':');
        this.emitEvent('connectionRemoved', {
          fromCardId,
          fromInterfaceId,
          toKey: `${cardId}:${interfaceId}`
        });
      }
    }
  }

  /**
   * 添加事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 事件回调函数
   */
  addEventListener(event, callback) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event).add(callback);
  }

  removeEventListener(event, callback) {
    this.eventHandlers.get(event)?.delete(callback);
  }

  emitEvent(event, data) {
    this.eventHandlers.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('事处理器错:', error);
      }
    });
  }

  addMiddleware(middleware) {
    this.middlewares.push(middleware);
  }

  /**
   * 将管理器的状态转换为JSON格式
   * @returns {Object} 包含节点和连接信息的对象
   */
  toJSON() {
    return JSON.stringify({
      version: '1.0',
      cards: Array.from(this.cards.entries()).map(([id, card]) => ({
        id,
        name: card.name,
        type: card.type,
        interfaces: Array.from(card.interfaces.entries()).map(([id, iface]) => ({
          id,
          type: iface.type,
          dataType: iface.dataType,
          position: iface.position,
          defaultValue: iface.value
        })),
        conditions: Array.from(card.conditions.entries()).map(([id, condition]) => ({
          id,
          condition: condition.toString()
        })),
        loopCondition: card.loopCondition?.toString(),
        maxIterations: card.maxIterations
      })),
      connections: Array.from(this.connections.entries()).map(([from, to]) => ({
        from: from.split(':'),
        to: to.split(':')
      }))
    });
  }

  /**
   * 从JSON数据恢复管理器状态
   * @param {Object} data - 包含节点和连接信息的对象
   * @returns {CardInterfaceManager} 新的管理器实例
   * @static
   */
  static async fromJSON(json) {
    const manager = new CardInterfaceManager();
    let data;
    try {
      data = JSON.parse(json);
    } catch (error) {
      throw new SyntaxError('无效的 JSON 格式');
    }

    for (const cardData of data.cards) {
      console.log(cardData, cardData.interfaces, Array.isArray(cardData.interfaces))
      if (!Array.isArray(cardData.interfaces)) {
        throw new Error('interfaces 参数必须是数组');
      }


      const card = manager.createCard(cardData.id, cardData.name, cardData.interfaces);


      // 添加接口
      for (const iface of cardData.interfaces) {
        card.addInterface(iface.id, iface);
      }

      // 恢复条件
      if (cardData.conditions) {
        for (const { id, condition } of cardData.conditions) {
          card.setCondition(id, eval(`(${condition})`));
        }
      }

      // 恢复循环条件
      if (cardData.loopCondition) {
        card.setLoopCondition(eval(`(${cardData.loopCondition})`));
      }

      if (cardData.maxIterations) {
        card.setMaxIterations(cardData.maxIterations);
      }
    }

    // 恢复连接
    for (const conn of data.connections) {
      await manager.connect(
        conn.from[0], conn.from[1],
        conn.to[0], conn.to[1]
      );
    }

    return manager;
  }

  /**
   * 获取节点的所有接口
   * @param {Card} card - 节点实例
   * @returns {Array<{id: string, cardId: string, type: string, ...}>} 接口数组
   */
  getCardInterfaces(card) {
    return Array.from(card.interfaces.values());
  }

  /**
   * 获取特定接口
   * @param {Card} card - 节点实例
   * @param {string} interfaceId - 接口ID
   * @returns {Object|null} 接口对对象
   */
  getInterface(card, interfaceId) {
    if (!card || !card.interfaces) {
      throw new Error(`无效的节点对象: ${card?.id}`);
    }
    return card.interfaces.get(interfaceId);
  }

  /**
   * 分析网络结构
   * @private
   */
  _analyzeNetwork() {
    const inputs = new Map();
    const outputs = new Map();
    const connectedCards = new Set();

    // 收集所有被连接的节点
    for (const [fromKey, toKey] of this.connections.entries()) {
      const [toCardId] = toKey.split(':');
      connectedCards.add(toCardId);
    }

    // 遍历所有节点
    for (const card of this.cards.values()) {
      const cardInterfaces = this.getCardInterfaces(card);

      // 如果节点没有被其他节点连接，检查其输出接口
      if (!connectedCards.has(card.id)) {
        for (const iface of cardInterfaces) {
          if (iface.type === 'output') {
            inputs.set(`${card.id}:${iface.id}`, { card, interfaceId: iface.id });
          }
        }
      }

      // 检查是否是最终输出节点
      const hasOutgoingConnection = Array.from(this.connections.keys())
        .some(key => key.startsWith(`${card.id}:`));

      if (!hasOutgoingConnection) {
        for (const iface of cardInterfaces) {
          if (iface.type === 'input') {
            outputs.set(`${card.id}:${iface.id}`, { card, interfaceId: iface.id });
          }
        }
      }
    }

    return { inputs, outputs };
  }

  /**
   * 将节点网络转换为可执行函数
   */
  toFunction() {
    const { inputs, outputs } = this._analyzeNetwork();
    return async (...args) => {
      try {
        if (args.length !== inputs.size) {
          throw new Error(`参数数量不匹配：期望 ${inputs.size} 个参数，实际收到 ${args.length} 个参数`);
        }
        let i = 0;
        for (const [_, { card, interfaceId }] of inputs) {
          await card.setValue(interfaceId, args[i++]);
          await this.propagateValue(card, interfaceId);
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        const result = {};
        for (const [_, { card, interfaceId }] of outputs) {
          result[interfaceId] = card.getValue(interfaceId);
        }

        return result;
      } catch (error) {
        throw new Error(`执行失败: ${error.message}`);
      }
    };
  }

  // 新增：获取节点布局信息
  getNodesLayout() {
    return Array.from(this.cards.values()).map(card => card.getDisplayInfo());
  }

  // 新增：获取连接布局信息
  getConnectionsLayout() {
    return Array.from(this.connections.entries()).map(([fromKey, toKey]) => {
      const [fromCardId, fromInterfaceId] = fromKey.split(':');
      const [toCardId, toInterfaceId] = toKey.split(':');
      return {
        from: { cardId: fromCardId, interfaceId: fromInterfaceId },
        to: { cardId: toCardId, interfaceId: toInterfaceId }
      };
    });
  }

  // 新增：批量连接方法
  async batchConnect(connections) {
    const results = [];
    for (const conn of connections) {
      try {
        await this.connect(conn.from.cardId, conn.from.interfaceId,
          conn.to.cardId, conn.to.interfaceId);
        results.push({ success: true, connection: conn });
      } catch (error) {
        results.push({ success: false, connection: conn, error });
      }
    }
    return results;
  }

  // 新增：断开连接
  disconnect(fromCardId, fromInterfaceId, toCardId, toInterfaceId) {
    const connectionKey = `${fromCardId}:${fromInterfaceId}`;
    const targetKey = `${toCardId}:${toInterfaceId}`;

    if (this.connections.get(connectionKey) === targetKey) {
      this.connections.delete(connectionKey);
      this.emitEvent('connectionRemoved', {
        fromCardId,
        fromInterfaceId,
        toCardId,
        toInterfaceId
      });
      return true;
    }
    return false;
  }

  // 新增：执行控制方法
  async pauseExecution() {
    this.executionStatus = 'paused';
    this.emitEvent('executionPaused');
  }

  async resumeExecution() {
    if (this.executionStatus === 'paused') {
      this.executionStatus = 'running';
      this.emitEvent('executionResumed');
      await this.executionQueue.process();
    }
  }

  async stopExecution() {
    this.executionStatus = 'stopped';
    this.executionQueue.clear();
    this.emitEvent('executionStopped');
  }

  // 新增：图验证方法
  validateGraph() {
    const errors = [];

    // 检查所有节点
    for (const card of this.cards.values()) {
      // 检查必要接口
      if (card.interfaces.size === 0) {
        errors.push(`节点 ${card.id} 没有定义任何接口`);
      }

      // 检查循环节点
      if (card.type === 'loop' && !card.loopCondition) {
        errors.push(`循环节点 ${card.id} 未设置循环条件`);
      }

      // 检查分支节点
      if (card.type === 'branch' && card.conditions.size === 0) {
        errors.push(`分支节点 ${card.id} 未设置任何条件`);
      }
    }

    // 检查连接完整性
    const { inputs, outputs } = this._analyzeNetwork();
    if (inputs.size === 0) {
      errors.push('图中没有输入节点');
    }
    if (outputs.size === 0) {
      errors.push('图中没有输出节点');
    }

    return errors;
  }
}

export class ExecutionQueue {
  constructor() {
    this.queue = [];
    this.running = false;
  }

  async add(task) {
    this.queue.push(task);
    if (!this.running) {
      await this.process();
    }
  }

  clear() {
    this.queue = [];
  }

  async process() {
    this.running = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      await task();
    }
    this.running = false;
  }
}



