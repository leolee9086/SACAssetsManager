import { AnchorTypes } from "../types.js";
export function createAnchorController(anchor, cardInfo) {
    const eventHandlers = {};

    return {
        ...anchor,
        setValue: (newValue) => {
            anchor.value.value = newValue;
        },
        getValue: () => anchor.value.value,
        reset: () => {
            const defaultValue = anchor.type === AnchorTypes.INPUT ? anchor.define.default : null;
            anchor.value.value = defaultValue;
        },
        cardId: cardInfo.id,
        anchorId: anchor.id,
        on: (event, handler) => {
            if (!eventHandlers[event]) {
                eventHandlers[event] = [];
            }
            eventHandlers[event].push(handler);
        },
        emit: (event, ...args) => {
            if (eventHandlers[event]) {
                eventHandlers[event].forEach(handler => handler(...args));
            }
        }
    };
}

export function createAnchorControllers(inputAnchors, outputAnchors, nodeDefine, componentProps, cardInfo) {
    const anchorPoints = inputAnchors.concat(outputAnchors);
    return anchorPoints.map(anchor => createAnchorController(anchor, cardInfo));
}

/**
 * 计算锚点的绝对坐标
 * @param {Object} card 卡片对象
 * @param {Object} anchor 锚点对象
 * @returns {Object} 锚点的绝对坐标
 */
 const calculateAnchorPosition = (card, anchor) => {
    const cardPos = card.position;
    const ANCHOR_OFFSET = 10; // 锚点的偏移量
    // 根据锚点在卡片上的位置计算坐标
    switch (anchor.side) {
      case 'left':
        return {
          x: cardPos.x - ANCHOR_OFFSET,
          y: cardPos.y + (cardPos.height * anchor.position)
        };
      case 'right':
        return {
          x: cardPos.x + cardPos.width + ANCHOR_OFFSET,
          y: cardPos.y + (cardPos.height * anchor.position)
        };
      case 'top':
        return {
          x: cardPos.x + (cardPos.width * anchor.position),
          y: cardPos.y - ANCHOR_OFFSET
        };
      case 'bottom':
        console.log(anchor,cardPos.width)
        return {
          x: cardPos.x + (cardPos.width * anchor.position),
          y: cardPos.y + cardPos.height + ANCHOR_OFFSET
        };
      default:
        console.warn(`未知的锚点方向: ${anchor.side}`);
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