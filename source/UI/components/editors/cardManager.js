import { componentMap, parseComponentDefinition } from './componentMapLoader.js';
export class CardManager {
  constructor() {
    this.cards = [];
    this.componentDefinitions = {};
    this.config = {
      cards: [],
      connections: []
    };
  }

  /**
   * 添加或更新卡片
   * @param {Object} cardConfig 卡片配置
   * @param {Object} [options] 额外选项
   * @param {boolean} [options.skipExisting=false] 是否跳过已存在的卡片
   * @returns {Promise<Object>} 添加或更新的卡片对象
   */
  async addCard(cardConfig, options = {}) {
    try {
      // 验证必要参数
      const requiredFields = ['id', 'type', 'title', 'position'];
      const missingFields = requiredFields.filter(field => !cardConfig[field]);
      if (missingFields.length > 0) {
        throw new Error(`缺少必要的卡片配置: ${missingFields.join(', ')}`);
      }

      // 检查组件类型是否支持
      if (!componentMap[cardConfig.type]) {
        throw new Error(`不支持的卡片类型: ${cardConfig.type}`);
      }

      // 获取或解析组件定义
      let controller = await this.getComponentDefinition(cardConfig.type,cardConfig);

      // 创建新卡片对象
      const newCard = this.createCardObject(cardConfig, controller);

      // 处理已存在的卡片
      return this.handleExistingCard(newCard, cardConfig, options);
    } catch (error) {
      console.error('添加或更新卡片失败:', error);
      throw error;
    }
  }

 /**
 * 获取组件定义
 * @private
 * @param {string} type 组件类型
 * @param {Object} cardConfig 卡片配置
 * @returns {Promise<Object>} 组件控制器
 */
async getComponentDefinition(type, cardConfig) {
  // 使用Map存储每个type的controller实例
  if (!this.componentDefinitions[type]) {
    this.componentDefinitions[type] = new Map();
  }

  // 使用cardConfig.id作为唯一标识
  const controllerId = cardConfig.id;
  
  // 创建新的controller实例
  const controller = await parseComponentDefinition(type, cardConfig);
  this.componentDefinitions[type].set(controllerId, controller);
  
  return controller;
}
  /**
   * 创建卡片对象
   * @private
   */
  createCardObject(cardConfig, controller) {
    let object= {
      controller,
      id: cardConfig.id,
      position: {
        x: cardConfig.position.x || 0,
        y: cardConfig.position.y || 0,
        width: cardConfig.position.width || 300,
        height: cardConfig.position.height || 200
      },
      title: cardConfig.title
    };
    if(controller.nodeDefine&&controller.nodeDefine.geom?.size==='fixed'){
      object.position.width=controller.nodeDefine.geom.width
      object.position.height=controller.nodeDefine.geom.height

    }
    return object
  }

  /**
   * 处理已存在的卡片
   * @private
   */
  handleExistingCard(newCard, cardConfig, options) {
    const existingIndex = this.cards.findIndex(card => card.id === cardConfig.id);
    console.error(existingIndex)
    if (existingIndex !== -1) {
      if (options.skipExisting) {
        return this.cards[existingIndex];
      }
      return this.updateExistingCard(existingIndex, newCard, cardConfig);
    }

    // 添加新卡片
    this.cards.push(newCard);
    this.config.cards.push(cardConfig);
    return newCard;
  }

  /**
   * 更新已存在的卡片
   * @private
   */
  updateExistingCard(existingIndex, newCard, cardConfig) {
    const existingCard = this.cards[existingIndex];
    
    // 更新属性
    existingCard.title = newCard.title;
    existingCard.position = newCard.position;
    
    // 更新配置
    const configIndex = this.config.cards.findIndex(card => card.id === cardConfig.id);
    if (configIndex !== -1) {
      this.config.cards[configIndex] = { ...cardConfig };
    } else {
      this.config.cards.push(cardConfig);
    }

    return existingCard;
  }
}