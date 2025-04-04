// 创建预览卡片数据
export const createPreviewCard = ({ id, title, position, nodeDefine, content }) => {
    return {
        id,
        title,
        position,
        cardID: id,
        component: () => ({
            template: `<div class="preview-content">${content}</div>`,
            setup() {
                return {};
            }
        }),
        componentProps: {},
        nodeDefine,
        anchors: [] // 预览时不需要锚点
    };
};
// 创建实际卡片数据
export const createActualCard = ({ cardInfo, id, position }) => {
    return {
        ...cardInfo,
        id,
        position
    };
};

// 创建复制事件数据
export const createDuplicationData = ({ previewCard, actualCard, mouseEvent, sourcePosition }) => {
    return {
        previewCard,
        actualCard,
        mouseEvent,
        sourcePosition
    };
};

import { v4 as uuidv4 } from "../../../../../../../static/uuid.mjs";
// 修改复制卡片的方法
export const createDuplicationEventData = (event, title, nodeDefine, cardInfo, currentSize, currentPos, content) => {
    const newCardID = uuidv4();
    const position = {
        ...currentPos,
        width: currentSize.width,
        height: currentSize.height
    };
    const previewCard = createPreviewCard({
        id: newCardID,
        title: title,
        position,
        nodeDefine: nodeDefine,
        content: content
    });
    const actualCard = createActualCard({
        cardInfo: cardInfo,
        id: newCardID,
        position
    });
    const duplicationData = createDuplicationData({
        previewCard,
        actualCard,
        mouseEvent: event,
        sourcePosition: {
            x: currentPos.x,
            y: currentPos.y
        }
    });
    return duplicationData
};