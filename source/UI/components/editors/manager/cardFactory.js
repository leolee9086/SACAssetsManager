import { parseComponentDefinition } from "../componentMapLoader.js";

export {parseComponentDefinition as 获取卡片组件定义}
/**
 * 创建卡片副本对象
 * @param {Object} originalCard 原始卡片对象
 * @param {string} newId 新卡片ID
 * @returns {Object} 卡片副本对象
 * @private
 */
export const 创建运行时卡片副本 = (originalCard, newId) => {
  let object = {
    controller: originalCard.controller, // 共享同一个controller
    id: newId,
    position: {
      x: originalCard.position.x + 20, // 稍微偏移以区分副本
      y: originalCard.position.y + 20,
      width: originalCard.position.width,
      height: originalCard.position.height
    },
    title: `${originalCard.title} (副本)`,
    originalCardId: originalCard.id  // 添加对原始卡片的引用
  };
  
  return object;
};

/**
 * 从节点定义中获取几何信息
 * @private
 */
const 获取节点几何定义 = (controller) => {
  if (controller.nodeDefine?.geom?.size === 'fixed') {
    return {
      width: controller.nodeDefine.geom.width,
      height: controller.nodeDefine.geom.height
    };
  }
  return null;
};

/**
 * 创建卡片对象
 * @private
 */
export const 创建运行时卡片对象 = (cardConfig, controller) => {
  let object = {
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

  const 几何定义 = 获取节点几何定义(controller);
  if (几何定义) {
    object.position.width = 几何定义.width;
    object.position.height = 几何定义.height;
  }

  return object;
};