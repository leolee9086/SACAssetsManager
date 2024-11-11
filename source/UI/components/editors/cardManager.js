import { 校验并补齐卡片设置,解析卡片类型 } from './manager/validate.js';
import { 创建运行时卡片对象,获取卡片组件定义 } from './manager/cardFactory.js';
export class CardManager {
  constructor() {
    this.cards = [];
    this.卡片类型定义表 = {};
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
      校验并补齐卡片设置(cardConfig);
      const type = await 解析卡片类型(cardConfig);
      const controller = await 获取卡片组件定义(type, cardConfig);
      const newCard = 创建运行时卡片对象(cardConfig, controller);
      return this.校验卡片是否已经存在(newCard, cardConfig, options);
    } catch (error) {
      console.error('添加或更新卡片失败:', error);
      throw error;
    }
  }
  /**
   * 处理已存在的卡片
   * @private
   */
  校验卡片是否已经存在(newCard, cardConfig, options) {
    const existingIndex = this.cards.findIndex(card => card.id === cardConfig.id);
    if (existingIndex !== -1) {
      if (options.skipExisting) {
        return this.cards[existingIndex];
      }
      return this.更新已经存在的卡片(existingIndex, newCard, cardConfig);
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
  更新已经存在的卡片(existingIndex, newCard, cardConfig) {
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