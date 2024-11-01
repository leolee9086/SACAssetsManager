import { 创建流程图, 添加节点, 添加动作, 添加连接, 触发动作 } from '../../../utils/graph/PetriNet.js';
import { connectNodes,propagateOutputs } from './NodeInterfaceManager/utils.js';
class Card {
  constructor(id, name, type = 'normal') {
    this.id = id;
    this.name = name;
    this.type = type; // normal, branch, loop, merge
    this.interfaces = new Map();
    this.conditions = new Map(); // 分支条件
    this.loopCondition = null;   // 循环条件
    this.iterationData = null;   // 循环数据
    this.onProcess = null; // 添加处理回调属性
    // 添加自定义类型验证器
    this.typeValidators = new Map([
      ['number', value => typeof value === 'number'],
      ['string', value => typeof value === 'string'],
      ['boolean', value => typeof value === 'boolean'],
      ['object', value => value === null || typeof value === 'object'],
      ['array', value => Array.isArray(value)],
      ['any', () => true], // 添加 any 类型支持
      // 可以添加更多自定义类型验证器
    ]);
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
    // 如果值是 undefined 或 null，且类型不是 'any'，返回 false
    if ((value === undefined || value === null) && dataType !== 'any') {
      return false;
    }

    const validator = this.typeValidators.get(dataType);
    if (!validator) {
      // 如果没有找到验证器，默认允许任何类型
      console.warn(`未找到类型 "${dataType}" 的验证器，将作为 any 类型处理`);
      return true;
    }

    return validator(value);
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
      console.log(value,iface)
      throw new Error(`值类型不匹配: 期望 ${iface.dataType}, 收到 ${typeof value}`);
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
      throw new Error(`输出接口 "${outputId}" 不存在`);
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
}

export class CardInterfaceManager {
  constructor() {
    this.cards = new Map();
    this.connections = new Map();
    this.processNet = null;
    this.eventListeners = new Map();
    this.middlewares = [];
    this.connectionCache = new Map();
    this.interfaceStatusCache = new Map();
    this.initPetriNet();
  }

  /**
   * 初始化Petri网络，设置基础流程状态和动作
   * @private
   */
  initPetriNet() {
    this.processNet = 创建流程图('节点接口流程');
    
    // 添加基础流程状态
    添加节点(this.processNet, '就绪', { type: 'start', tokens: 1 });
    添加节点(this.processNet, '数据传输中', { type: 'process', tokens: 0 });
    添加节点(this.processNet, '分支评估', { type: 'process', tokens: 0 });
    添加节点(this.processNet, '循环评估', { type: 'process', tokens: 0 });
    添加节点(this.processNet, '完成', { type: 'end', tokens: 0 });
    
    // 添加基础动作
    添加动作(this.processNet, '传输数据', async (data) => {
      return data;
    });
    
    添加动作(this.processNet, '评估分支', async (data) => {
      return await this.evaluateBranchCondition(data);
    });
    
    添加动作(this.processNet, '评估循环', async (data) => {
      return await this.evaluateLoopCondition(data);
    });
    
    // 建立基础连接
    添加连接(this.processNet, '就绪', '传输数据');
    添加连接(this.processNet, '传输数据', '数据传输中');
    添加连接(this.processNet, '数据传输中', '分支评估');
    添加连接(this.processNet, '分支评估', '循环评估');
    添加连接(this.processNet, '循环评估', '完成');
  }

  cacheKey(cardId, interfaceId) {
    return `${cardId}:${interfaceId}`;
  }

  clearCaches(cardId, interfaceId) {
    const cacheKey = this.cacheKey(cardId, interfaceId);
    this.interfaceStatusCache.delete(cacheKey);
    this.connectionCache.delete(cacheKey);
  }
/**
 * 创建新节点
 * @param {string} id - 节点唯一标识符
 * @param {string} name - 节点名称
 * @param {Object[]} interfaces - 接口定义数组
 * @returns {Card} 新创建的节点实例
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
      if (currentCardId === fromCardId) return true;
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

  /**
   * 连接两个节点的接口
   * @param {string|Card} fromCardOrId - 源节点或节点ID
   * @param {string} fromInterfaceId - 源接口ID
   * @param {string|Card} toCardOrId - 目标节点或节点ID
   * @param {string} toInterfaceId - 目标接口ID
   * @throws {Error} 当连接无效或检测到循环依赖时抛出错误
   * @returns {Promise<void>}
   */
  async connect(fromCardOrId, fromInterfaceId, toCardOrId, toInterfaceId) {
    await connectNodes(this, fromCardOrId, fromInterfaceId, toCardOrId, toInterfaceId);
  }

  async executeMiddlewares(data) {
    let index = 0;
    
    const next = async () => {
      if (index < this.middlewares.length) {
        await this.middlewares[index++](data, next);
      }
    };
    
    await next();
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
   * 执行数据传输
   */
  async executeTransfer(fromCard, fromInterfaceId, toCard, toCardId, toInterfaceId, value) {
    // 重置 Petri 网状态
    this.processNet.节点.get('就绪').数值 = 1;
    this.processNet.节点.get('数据传输中').数值 = 0;
    this.processNet.节点.get('完成').数值 = 0;
    // 触发数据传输
    await 触发动作(this.processNet, '传输数据', value);
    
    // 获取连接特定的传输动作 ID
    const connectionId = `${fromCard.id}:${fromInterfaceId}-${toCardId}:${toInterfaceId}`;
    const transferActionId = `${connectionId}-传输动作`;
    // 执行实际的数据传输
    toCard.setValue(toInterfaceId, value);
    // 执行目标节点的处理逻辑
    if (typeof toCard.onProcess === 'function') {
        await toCard.onProcess();
    }
    // 触发连接特定的传输动作
    if (this.processNet.动作.has(transferActionId)) {
        await 触发动作(this.processNet, transferActionId, value);
    }
  }
  /**
   * 主传播函数
   */
  async propagateValue(fromCardOrId, fromInterfaceId) {
    try {
        const { fromCard, value } = await this.validateSource(fromCardOrId, fromInterfaceId);
        await this.executeMiddlewares({ fromCard, fromInterfaceId, value });
        const { toCard, toCardId, toInterfaceId } = this.getTargetCard(fromCard, fromInterfaceId);
        try {
            await this.executeTransfer(
                fromCard,
                fromInterfaceId,
                toCard,
                toCardId,
                toInterfaceId,
                value
            );
            await propagateOutputs(toCard, toInterfaceId, this.propagateValue.bind(this));
            this.emitEvent('valueChange', {
                fromCard,
                fromInterfaceId,
                toCard,
                toInterfaceId,
                value
            });
        } catch (error) {
            throw new Error(
                `数据传输失败:\n` +
                `源: ${fromCard.id}:${fromInterfaceId}\n` +
                `目标: ${toCardId}:${toInterfaceId}\n` +
                `值: ${JSON.stringify(value, null, 2)}\n` +
                `原因: ${error.message}`
            );
        }
    } catch (error) {
        this.emitEvent('error', error);
        throw error;
    }
  }

  cleanupConnections(cardId, interfaceId) {
    const connectionKey = `${cardId}:${interfaceId}`;
    
    if (this.connections.has(connectionKey)) {
      const targetKey = this.connections.get(connectionKey);
      const connectionId = `${connectionKey}-${targetKey}`;
      
      this.processNet.节点.delete(`${connectionId}-传输`);
      this.processNet.动作.delete(`${connectionId}-传输动作`);
      this.connections.delete(connectionKey);
      
      this.emitEvent('disconnection', {
        fromCardId: cardId,
        fromInterfaceId: interfaceId,
        toKey: targetKey
      });
    }
    
    for (const [fromKey, toKey] of this.connections.entries()) {
      if (toKey === connectionKey) {
        const connectionId = `${fromKey}-${connectionKey}`;
        
        this.processNet.节点.delete(`${connectionId}-传输`);
        this.processNet.动作.delete(`${connectionId}-传输动作`);
        this.connections.delete(fromKey);
        
        const [fromCardId, fromInterfaceId] = fromKey.split(':');
        this.emitEvent('disconnection', {
          fromCardId,
          fromInterfaceId,
          toKey: connectionKey
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
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }

  removeEventListener(event, callback) {
    this.eventListeners.get(event)?.delete(callback);
  }

  emitEvent(event, data) {
    this.eventListeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('事件处理器错误:', error);
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
    return {
      cards: Array.from(this.cards.entries()).map(([id, card]) => ({
        id,
        name: card.name,
        interfaces: Array.from(card.interfaces.entries())
      })),
      connections: Array.from(this.connections.entries())
    };
  }

  /**
   * 从JSON数据恢复管理器状态
   * @param {Object} data - 包含节点和连接信息的对象
   * @returns {CardInterfaceManager} 新的管理器实例
   * @static
   */
  static async fromJSON(data) {
    const manager = new CardInterfaceManager();
    
    // 先创建所有节点
    for (const cardData of data.cards) {
        const card = manager.createCard(cardData.id, cardData.name);
        for (const [id, iface] of cardData.interfaces) {
            card.addInterface(id, iface);
        }
    }
    
    // 然后建立连接
    for (const [fromKey, toKey] of data.connections) {
        const [fromCardId, fromInterfaceId] = fromKey.split(':');
        const [toCardId, toInterfaceId] = toKey.split(':');
        
        // 使用 await 确保连接操作完成
        await manager.connect(fromCardId, fromInterfaceId, toCardId, toInterfaceId);
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
}



