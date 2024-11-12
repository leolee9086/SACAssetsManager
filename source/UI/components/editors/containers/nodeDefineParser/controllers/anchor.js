import { addMethods } from "../../../../../../utils/object/addMethod.js";
import { AnchorTypes, Sides } from "../types.js";
import { addEvents } from "../../../../../../utils/events/addEvents.js";
import { getAnchorConfig } from "./anchorConfig.js";

/**
 * 创建锚点控制器
 * @param {Object} anchor - 原始锚点配置
 * @param {Object} cardInfo - 卡片信息
 * @returns {Object} 增强的锚点控制器
 */
export function createAnchorController(anchor, cardInfo) {
    // 获取该类型的配置
    const visualConfig = getAnchorConfig(anchor.type, anchor.visualConfig);
    
    // 创建控制器基础结构
    const controller = {
        ...anchor,
        cardId: cardInfo.id,
        anchorId: anchor.id,
        visualConfig,          // 添加视觉配置
        connected: false,      // 连接状态
        isVisible: true,       // 可见性状态
        isFolded: visualConfig.foldWhileNoConnect, // 折叠状态
        theme: visualConfig.theme // 确保主题配置可访问
    };
    
    // 定义控制器的方法集
    const methods = {
        // 保持原有方法的签名和行为
        setValue: (newValue) => {
            anchor.value.value = newValue;
            controller.trigger?.('value', newValue);
        },
        
        getValue: () => anchor.value.value,
        
        reset: () => {
            const defaultValue = anchor.type === AnchorTypes.INPUT 
                ? anchor.define.default 
                : null;
            anchor.value.value = defaultValue;
            controller.trigger?.('reset');
        },

        // 新增方法 - 但不影响原有接口
        setConnected: (state) => {
            controller.connected = state;
            if (visualConfig.foldWhileNoConnect) {
                controller.isFolded = !state;
            }
            controller.trigger?.('connectionChange', state);
        },

        getState: () => ({
            value: anchor.value.value,
            connected: controller.connected,
            visible: controller.isVisible,
            folded: controller.isFolded
        })
    };

    // 添加方法到控制器
    const controllerWithMethods = addMethods(controller, methods);
    // 添加事件功能
    return addEvents(controllerWithMethods);
}

/**
 * 创建锚点控制器集合
 * @param {Array} inputAnchors - 输入锚点配置
 * @param {Array} outputAnchors - 输出锚点配置
 * @param {Object} nodeDefine - 节点定义
 * @param {Object} componentProps - 组件属性
 * @param {Object} cardInfo - 卡片信息
 * @returns {Array} 锚点控制器数组
 */
export function createAnchorControllers(inputAnchors, outputAnchors, nodeDefine, componentProps, cardInfo) {
    const controllers = [];
    
    // 处理常规输入输出锚点
    const anchorPoints = inputAnchors.concat(outputAnchors);
    controllers.push(...anchorPoints.map(anchor => createAnchorController(anchor, cardInfo)));

    // 处理事件锚点 (如果存在)
    if (nodeDefine.events) {
        const eventAnchors = Object.entries(nodeDefine.events).map(([id, define], index) => ({
            id,
            type: AnchorTypes.EVENT,
            label: define.label || id,
            define,
            value: { value: null },  // 保持与现有锚点结构一致
            position: (index + 1) / (Object.keys(nodeDefine.events).length + 1)
        }));

        controllers.push(...eventAnchors.map(anchor => createAnchorController(anchor, cardInfo)));
    }

    return controllers;
}

// 锚点常量
const ANCHOR_CONSTANTS = {
    OFFSET: 10,
    DEFAULT_POSITION: { x: 0, y: 0 }
};

/**
 * 锚点位置计算策略
 * @type {Object.<string, function(Object, Object): {x: number, y: number}>}
 */
const positionStrategies = {
    [Sides.LEFT]: (cardPos, anchor) => ({
        x: cardPos.x - ANCHOR_CONSTANTS.OFFSET,
        y: cardPos.y + (cardPos.height * anchor.position)
    }),
    
    [Sides.RIGHT]: (cardPos, anchor) => ({
        x: cardPos.x + cardPos.width + ANCHOR_CONSTANTS.OFFSET,
        y: cardPos.y + (cardPos.height * anchor.position)
    }),
    
    [Sides.TOP]: (cardPos, anchor) => ({
        x: cardPos.x + (cardPos.width * anchor.position),
        y: cardPos.y - ANCHOR_CONSTANTS.OFFSET
    }),
    
    [Sides.BOTTOM]: (cardPos, anchor) => ({
        x: cardPos.x + (cardPos.width * anchor.position),
        y: cardPos.y + cardPos.height + ANCHOR_CONSTANTS.OFFSET
    })
};

/**
 * 计算锚点的绝对坐标
 * @param {Object} card - 卡片对象
 * @param {Object} card.position - 卡片位置信息
 * @param {number} card.position.x - 卡片X坐标
 * @param {number} card.position.y - 卡片Y坐标
 * @param {number} card.position.width - 卡片宽度
 * @param {number} card.position.height - 卡片高度
 * @param {Object} 锚点ID - 锚点对象
 * @param {string} 锚点ID.side - 锚点方向
 * @param {number} 锚点ID.position - 锚点相对位置
 * @returns {{x: number, y: number}} 锚点的绝对坐标
 * @throws {Error} 当卡片位置信息无效时抛出错误
 */
const calculateAnchorPosition = (card, anchor) => {
    // 参数验证
    if (!card?.position) {
        throw new Error('无效的卡片位置信息');
    }
    
    const { position: cardPos } = card;
    
    // 验证必要的位置属性
    const requiredProps = ['x', 'y', 'width', 'height'];
    const missingProps = requiredProps.filter(prop => 
        typeof cardPos[prop] !== 'number' || isNaN(cardPos[prop])
    );
    
    if (missingProps.length > 0) {
        throw new Error(`卡片缺少必要的位置属性: ${missingProps.join(', ')}`);
    }
    
    // 获取对应的计算策略
    const calculateStrategy = positionStrategies[anchor.side];
    
    if (!calculateStrategy) {
        console.warn(`未知的锚点方向: ${anchor.side}，使用默认位置`);
        return { x: cardPos.x, y: cardPos.y };
    }
    
    try {
        return calculateStrategy(cardPos, anchor);
    } catch (error) {
        console.error('计算锚点位置时发生错误:', error);
        return { x: cardPos.x, y: cardPos.y };
    }
};

export const updateAnchorsPosition = (cardsToUpdate) => {
 cardsToUpdate.forEach(card => {
     if (!card.controller) return;
     card.controller.anchors.forEach(anchor => {
         const pos = calculateAnchorPosition(card, anchor);
         // 更新锚点的绝对坐标
         anchor.absolutePosition = pos;
     });
 });
};

export { calculateAnchorPosition, ANCHOR_CONSTANTS };


export const 根据连接表查找锚点是否有连接 =(连接表,卡片ID,锚点ID)=>{
    return 连接表.some(连接ID组 =>
        (连接ID组.from.cardId === 卡片ID && 连接ID组.from.anchorId === 锚点ID) ||
        (连接ID组.to.cardId === 卡片ID && 连接ID组.to.anchorId === 锚点ID)
      )
}


