export const ensureUniqueCardIds = (cards) => {
    const usedIds = new Set();
    const idMap = new Map();
    return {
        updatedCards: cards.map(card => {
            const oldId = card.id;
            if (usedIds.has(oldId)) {
                const newId = `${oldId}_${Date.now()}`;
                console.warn(`发现重复卡片ID，已修正: ${oldId} -> ${newId}`);
                idMap.set(oldId, newId);
                usedIds.add(newId);
                return { ...card, id: newId };
            }
            usedIds.add(oldId);
            return card;
        }),
        idMap
    };
};
// 更新连接中的卡片ID
export const updateConnectionIds = (connections, idMap) => {
    if (idMap.size === 0) return connections;
    const oldConnections = [...connections];
    const updatedConnections = oldConnections.map(conn => ({
        from: {
            cardId: idMap.get(conn.from.cardId) || conn.from.cardId,
            anchorId: conn.from.anchorId
        },
        to: {
            cardId: idMap.get(conn.to.cardId) || conn.to.cardId,
            anchorId: conn.to.anchorId
        }
    }));
    // 记录修改的连接
    const modifiedConnections = updatedConnections.filter((conn, index) => {
        const oldConn = oldConnections[index];
        return conn.from.cardId !== oldConn.from.cardId ||
            conn.to.cardId !== oldConn.to.cardId;
    });
    if (modifiedConnections.length > 0) {
        console.warn('已更新以下连接的卡片ID:', modifiedConnections);
    }
    return updatedConnections;
};
// 验证连接的有效性
export const validateConnections = (connections, cards) => {
    return connections.filter(conn => {
        const fromCard = cards.find(card => card.id === conn.from.cardId);
        const toCard = cards.find(card => card.id === conn.to.cardId);

        if (!fromCard || !toCard) {
            console.warn('移除无效连接:', conn);
            return false;
        }
        const fromAnchor = fromCard.controller.anchors.find(a => a.id === conn.from.anchorId);
        const toAnchor = toCard.controller.anchors.find(a => a.id === conn.to.anchorId);
        if (!fromAnchor || !toAnchor) {
            console.warn('移除无效锚点连接:', conn);
            return false;
        }
        return true;
    });
};