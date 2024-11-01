import { 添加动作, 添加连接, 添加节点 } from "../../../../utils/graph/PetriNet.js";
// 工具函数
function getCardFromIdOrInstance(cards, cardOrId) {
    return (typeof cardOrId === 'string') ? cards.get(cardOrId) : cardOrId;
}

function validateCards(fromCard, toCard) {
    if (!fromCard || !toCard) {
        throw new Error('节点未找到');
    }
}
function validateInterfaces(fromInterface, toInterface) {
    if (!fromInterface || !toInterface) {
        throw new Error('接口未找到');
    }

    if (fromInterface.type !== 'output' || toInterface.type !== 'input') {
        throw new Error('无效的连接类型');
    }

    if (fromInterface.dataType !== toInterface.dataType) {
        throw new Error('数据类型不兼容');
    }
}

function createConnectionIds(fromCard, fromInterfaceId, toCard, toInterfaceId) {
    const connectionKey = `${fromCard.id}:${fromInterfaceId}`;
    const connectionId = `${fromCard.id}:${fromInterfaceId}-${toCard.id}:${toInterfaceId}`;
    const transferCardId = `${connectionId}-传输`;
    const transferActionId = `${connectionId}-传输动作`;

    return {
        connectionKey,
        connectionId,
        transferCardId,
        transferActionId
    };
}

function setupTransferNode(processNet, transferCardId, transferActionId, toCard, toInterfaceId) {
    添加节点(processNet, transferCardId, { type: 'process', tokens: 0 });

    添加动作(processNet, transferActionId, async (data) => {
        toCard.setValue(toInterfaceId, data);
        return data;
    });

    添加连接(processNet, '数据传输中', transferActionId);
    添加连接(processNet, transferActionId, transferCardId);
    添加连接(processNet, transferCardId, '完成');
}


// 主函数
export async function connectNodes(manager, fromCardOrId, fromInterfaceId, toCardOrId, toInterfaceId) {
    // 获取节点对象
    const fromCard = getCardFromIdOrInstance(manager.cards, fromCardOrId);
    const toCard = getCardFromIdOrInstance(manager.cards, toCardOrId);
    // 验证节点
    validateCards(fromCard, toCard);
    // 获取并验证接口
    const fromInterface = manager.getInterface(fromCard, fromInterfaceId);
    const toInterface = manager.getInterface(toCard, toInterfaceId);
    validateInterfaces(fromInterface, toInterface);
    // 检查循环依赖
    if (manager.detectCycle(fromCard.id, fromInterfaceId, toCard.id)) {
        throw new Error('检测到循环依赖');
    }
    // 创建连接标识符
    const {
        connectionKey,
        transferCardId,
        transferActionId
    } = createConnectionIds(fromCard, fromInterfaceId, toCard, toInterfaceId);
    // 设置传输节点和动作
    setupTransferNode(
        manager.processNet,
        transferCardId,
        transferActionId,
        toCard,
        toInterfaceId
    );
    // 更新连接映射
    manager.connections.set(connectionKey, `${toCard.id}:${toInterfaceId}`);
    // 触发事件
    manager.emitEvent('connection', {
        fromCard,
        fromInterfaceId,
        toCard,
        toInterfaceId
    });
}




/**
* 处理输出接口的传播
*/
export async function propagateOutputs(toCard, toInterfaceId, propagateValue) {
    const targetInterface = toCard.getInterface(toInterfaceId);

    if (targetInterface && toCard.interfaces) {
        for (const [interfaceId, iface] of toCard.interfaces.entries()) {
            if (iface.type === 'output') {
                const outputValue = toCard.getValue(interfaceId);
                if (outputValue !== null && outputValue !== undefined) {
                    await propagateValue(toCard, interfaceId);
                }
            }
        }
    }
}