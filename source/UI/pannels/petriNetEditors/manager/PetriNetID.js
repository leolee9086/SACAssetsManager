import { 柯里化 } from "../../../../../src/utils/functions/currying.js"

/**
 * 生成节点ID
 */
export const 生成锚点节点ID = 柯里化((卡片ID, 锚点ID) => 
    `place_${卡片ID}_${锚点ID}`
);

/**
 * 生成分裂转换ID
 */
export const 生成分裂转换ID = 柯里化((节点ID) => 
    `split_transition_${节点ID}`
);

/**
 * 生成分裂节点ID
 */
export const 生成分裂节点ID = 柯里化((起始节点ID, 目标节点ID) => 
    `split_place_${起始节点ID}_${目标节点ID}`
);

/**
 * 生成传输转换ID
 */
export const 生成传输转换ID = 柯里化((起始卡片ID, 起始锚点ID, 目标卡片ID, 目标锚点ID) => 
    `transfer_${起始卡片ID}-${起始锚点ID}_to_${目标卡片ID}-${目标锚点ID}`
);

/**
 * 生成事件节点ID
 */
export const 生成事件节点ID = 柯里化((卡片ID, 锚点ID) => 
    `event_place_${卡片ID}_${锚点ID}`
);

/**
 * 生成事件转换ID
 */
export const 生成事件转换ID = 柯里化((卡片ID, 锚点ID) => 
    `event_transition_${卡片ID}_${锚点ID}`
);

/**
 * 生成连接ID
 */
export const 生成连接ID = 柯里化((connection) => 
    `${connection.from.cardId}-${connection.from.anchorId}-${connection.to.cardId}-${connection.to.anchorId}`
);

/**
 * 生成清理节点ID
 */
export const 生成清理节点ID = 柯里化((connection) => {
    const fromPlaceId = 生成锚点节点ID(connection.from.cardId)(connection.from.anchorId);
    const toPlaceId = 生成锚点节点ID(connection.to.cardId)(connection.to.anchorId);
    const splitTransitionId = 生成分裂转换ID(fromPlaceId);
    const splitPlaceId = 生成分裂节点ID(fromPlaceId)(toPlaceId);
    const transferTransitionId = 生成传输转换ID(connection.from.cardId)(connection.from.anchorId)(connection.to.cardId)(connection.to.anchorId);
    const eventPlaceId = 生成事件节点ID(connection.from.cardId)(connection.from.anchorId);

    return {
        节点列表: [fromPlaceId, toPlaceId, splitPlaceId],
        转换列表: [splitTransitionId, transferTransitionId],
        事件节点: eventPlaceId
    };
});