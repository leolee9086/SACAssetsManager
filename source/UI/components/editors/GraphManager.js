import { TransitionQueue } from './petri/queue.js';
import { analyzePath, compilePath } from './petri/pathAnalyzer.js';
import { 创建流程图, 添加节点, 添加动作, 添加连接, 找到入口节点, 找到出口节点, 已经连接 } from '../../../utils/graph/PetriNet.js';

export class GraphManager {
    constructor(mode = 'visual') {
        this.petriNet = null;
        this.mode = mode;
        this.transitionQueue = new TransitionQueue(mode);
        this.compiledFunctions = new Map();
        this.getGlobalInputs = null;
        this.connections = new Map();
        this.parsedCards = null;
        this.eventSubscriptions = new Map(); // 存储事件订阅
    }
    reStartPetriNet(config, parsedCards, getGlobalInputs) {
        let pn = this.buildPetriNet(config, parsedCards, getGlobalInputs)
        pn.exec(undefined, true);
        pn.startAutoExec();
    }
    buildPetriNet(config, parsedCards, getGlobalInputs) {
        if (!parsedCards || !Array.isArray(parsedCards)) {
            console.warn('parsedCards 未准备好，跳过构建');
            return this;
        }
        this.parsedCards = parsedCards;
        this.getGlobalInputs = getGlobalInputs;
        this.petriNet = 创建流程图(`PetriNet_${config.name}`);
        this.connections.clear();
        if (config.connections && Array.isArray(config.connections)) {
            config.connections.forEach(conn => {
                try {
                    const connectionId = this.generateConnectionId(conn);
                    this.connections.set(connectionId, conn);
                    this.handleConnection(conn, parsedCards);
                } catch (error) {
                    console.error('处理连接时出错:', error, conn);
                }
            });
        }
        this.initializeEntryNodes();
        if (this.mode === 'function') {
            this.compileExecutionPath();
        }
        return this;
    }
    compileExecutionPath() {
        if (this.mode !== 'function') return;

        const entryNodes = 找到入口节点(this.petriNet);

        for (const entryNode of entryNodes) {
            const path = analyzePath(this.petriNet, entryNode);
            const compiledFn = compilePath(this.petriNet, path);
            this.compiledFunctions.set(entryNode, compiledFn);
        }
    }

    async executeNode(nodeId, inputs) {
        if (this.mode === 'function') {
            const fn = this.compiledFunctions.get(nodeId);
            if (fn) {
                return await fn(inputs);
            }
        } else {
            await this.transitionQueue.addTask({
                id: `task_${nodeId}_${Date.now()}`,
                transitionId: nodeId,
                priority: 'low',
                execute: async () => {
                    const node = this.petriNet.节点.get(nodeId);
                    if (node?.内容?.process) {
                        await node.内容.process(inputs);
                    }
                }
            });
        }
    }

    async handleUserInput(nodeId, value) {
        await this.transitionQueue.addTask({
            id: `input_${nodeId}_${Date.now()}`,
            transitionId: nodeId,
            priority: 'high',
            execute: async () => {
                await this.triggerNodeUpdate(nodeId, value);
            }
        });
    }

    addConnection(connection) {
        const connectionId = this.generateConnectionId(connection);
        this.connections.set(connectionId, connection);
        this.handleConnection(connection, this.parsedCards);
        return connectionId;
    }

    removeConnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (connection) {
            this.cleanupConnectionNodes(connection);
            this.connections.delete(connectionId);
        }
    }

    generateConnectionId(connection) {
        return `${connection.from.cardId}-${connection.from.anchorId}-${connection.to.cardId}-${connection.to.anchorId}`;
    }

    cleanupConnectionNodes(connection) {
        const fromPlaceId = `place_${connection.from.cardId}_${connection.from.anchorId}`;
        const toPlaceId = `place_${connection.to.cardId}_${connection.to.anchorId}`;
        const splitTransitionId = `split_transition_${fromPlaceId}`;
        const splitPlaceId = `split_place_${fromPlaceId}_${toPlaceId}`;
        const transferTransitionId = `transfer_${connection.from.cardId}-${connection.from.anchorId}_to_${connection.to.cardId}-${connection.to.anchorId}`;

        [fromPlaceId, toPlaceId, splitPlaceId].forEach(nodeId => {
            if (this.petriNet.节点.has(nodeId)) {
                this.petriNet.节点.delete(nodeId);
            }
        });

        [splitTransitionId, transferTransitionId].forEach(transitionId => {
            if (this.petriNet.动作.has(transitionId)) {
                this.petriNet.动作.delete(transitionId);
            }
        });

        // 清理事件订阅
        const eventPlaceId = `event_place_${connection.from.cardId}_${connection.from.anchorId}`;
        const unsubscribe = this.eventSubscriptions.get(eventPlaceId);
        if (unsubscribe) {
            unsubscribe();
            this.eventSubscriptions.delete(eventPlaceId);
        }
    }

    /**
     * 处理单个连接
     * @private
     */
    handleConnection(conn, parsedCards) {
        const fromCard = parsedCards.find(card => card.id === conn.from.cardId);
        const toCard = parsedCards.find(card => card.id === conn.to.cardId);

        if (!fromCard || !toCard) {
            console.warn('找不到连接对应的卡片:', conn);
            return;
        }

        if (!fromCard.controller || !toCard.controller) {
            console.warn('卡片控制器未初始化:', conn);
            return;
        }

        const fromAnchor = fromCard.controller.anchors.find(a => a.id === conn.from.anchorId);
        const toAnchor = toCard.controller.anchors.find(a => a.id === conn.to.anchorId);

        if (!fromAnchor || !toAnchor) {
            console.warn('找不到连接对应的锚点:', conn);
            return;
        }

        // 根据锚点类型选择不同的处理方法
        if (fromAnchor.type === 'event') {
            this.createEventConnectionNodes(fromCard, toCard, fromAnchor, toAnchor);
        } else {
            this.createConnectionNodes(fromCard, toCard, fromAnchor, toAnchor);
        }

        this.构建卡片内部连接结构(fromCard);
        this.构建卡片内部连接结构(toCard);
    }

    /**
     * 创建连接节点
     * @private
     */
    createConnectionNodes(fromCard, toCard, fromAnchor, toAnchor) {
        const fromPlaceId = `place_${fromCard.id}_${fromAnchor.id}`;
        const toPlaceId = `place_${toCard.id}_${toAnchor.id}`;

        // 1. 确保源节点存在
        if (!this.petriNet.节点.has(fromPlaceId)) {
            添加节点(this.petriNet, fromPlaceId, {
                type: 'process',
                tokens: 0,
                content: fromAnchor
            });
        }

        // 2. 确保目标节点存在
        if (!this.petriNet.节点.has(toPlaceId)) {
            添加节点(this.petriNet, toPlaceId, {
                type: 'process',
                tokens: 0,
                content: toAnchor
            });
        }

        // 3. 为这个连接创建分裂结构
        const splitTransitionId = `split_transition_${fromPlaceId}`;
        const splitPlaceId = `split_place_${fromPlaceId}_${toPlaceId}`;
        const transferTransitionId = `transfer_${fromCard.id}-${fromAnchor.id}_to_${toCard.id}-${toAnchor.id}`;

        // 4. 添加分裂转换（如果不存在）
        if (!this.petriNet.动作.has(splitTransitionId)) {
            添加动作(this.petriNet, splitTransitionId, async () => {
                console.log(`执行分裂: ${splitTransitionId}`);
                // 分裂转换只负责令牌的复制，不处理数据
            });
        }

        // 5. 添加分裂后的中间节点
        if (!this.petriNet.节点.has(splitPlaceId)) {
            添加节点(this.petriNet, splitPlaceId, {
                type: 'process',
                tokens: 0,
                content: { value: null }  // 中间节点存储传递的值
            });
        }

        // 6. 添加传输转换
        if (!this.petriNet.动作.has(transferTransitionId)) {
            添加动作(this.petriNet, transferTransitionId, async () => {
                console.log(`执行传输: ${transferTransitionId}`, fromAnchor, toAnchor);
                const value = fromAnchor.getValue();
                await toAnchor.setValue(value);
            });
        }

        // 7. 建立连接关系
        // 源节点到分裂转换
        if (!已经连接(this.petriNet, fromPlaceId, splitTransitionId)) {
            添加连接(this.petriNet, fromPlaceId, splitTransitionId);
        }
        // 分裂转换到中间节点
        if (!已经连接(this.petriNet, splitTransitionId, splitPlaceId)) {
            添加连接(this.petriNet, splitTransitionId, splitPlaceId);
        }
        // 中间节点到传输转换
        if (!已经连接(this.petriNet, splitPlaceId, transferTransitionId)) {
            添加连接(this.petriNet, splitPlaceId, transferTransitionId);
        }
        // 传输转换到目标节点
        if (!已经连接(this.petriNet, transferTransitionId, toPlaceId)) {
            添加连接(this.petriNet, transferTransitionId, toPlaceId);
        }
    }

    /**
     * 创建事件连接节点
     * @private
     */
    createEventConnectionNodes(fromCard, toCard, fromAnchor, toAnchor) {
        const eventPlaceId = `event_place_${fromCard.id}_${fromAnchor.id}`;
        const toPlaceId = `place_${toCard.id}_${toAnchor.id}`;
        const eventTransitionId = `event_transition_${fromCard.id}_${fromAnchor.id}`;

        // 1. 添加事件源节点
        if (!this.petriNet.节点.has(eventPlaceId)) {
            添加节点(this.petriNet, eventPlaceId, {
                type: 'event',
                tokens: 0,
                content: {
                    ...fromAnchor,
                    process: async (value) => {
                        // 当事件触发时，增加令牌并执行
                        const node = this.petriNet.节点.get(eventPlaceId);
                        if (node) {
                            node.数值 += 1;
                            await this.petriNet.exec();
                        }
                    }
                }
            });

            // 订阅事件
            const unsubscribe = fromAnchor.subscribe(async (value) => {
                const node = this.petriNet.节点.get(eventPlaceId);
                if (node?.内容?.process) {
                    await node.内容.process(value);
                }
            });

            // 保存订阅，以便后续清理
            this.eventSubscriptions.set(eventPlaceId, unsubscribe);
        }

        // 2. 添加目标节点
        if (!this.petriNet.节点.has(toPlaceId)) {
            添加节点(this.petriNet, toPlaceId, {
                type: 'process',
                tokens: 0,
                content: toAnchor
            });
        }

        // 3. 添加事件转换动作
        if (!this.petriNet.动作.has(eventTransitionId)) {
            添加动作(this.petriNet, eventTransitionId, async () => {
                const eventNode = this.petriNet.节点.get(eventPlaceId);
                if (eventNode?.内容?.value?.value) {
                    await toAnchor.setValue(eventNode.内容.value.value);
                }
            });
        }

        // 4. 建立连接关系
        if (!已经连接(this.petriNet, eventPlaceId, eventTransitionId)) {
            添加连接(this.petriNet, eventPlaceId, eventTransitionId);
        }
        if (!已经连接(this.petriNet, eventTransitionId, toPlaceId)) {
            添加连接(this.petriNet, eventTransitionId, toPlaceId);
        }
    }

    /**
     * 构建卡片内部连接结构
     * @private
     */
    构建卡片内部连接结构(card) {
        const inputAnchors = card.controller.anchors.filter(a => a.type === 'input');
        const outputAnchors = card.controller.anchors.filter(a => a.type === 'output');
        const eventAnchors = card.controller.anchors.filter(a => a.type === 'event');

        if (inputAnchors.length) {
            this.handleCardWithInputs(card, inputAnchors, outputAnchors);
        } else {
            this.handleCardWithoutInputs(card, outputAnchors);
        }

        // 处理事件锚点
        eventAnchors.forEach(eventAnchor => {
            const eventPlaceId = `event_place_${card.id}_${eventAnchor.id}`;

            // 如果事件节点还不存在，创建它
            if (!this.petriNet.节点.has(eventPlaceId)) {
                添加节点(this.petriNet, eventPlaceId, {
                    type: 'event',
                    tokens: 0,
                    content: eventAnchor
                });
            }
        });
    }

    /**
     * 处理有输入锚点的卡片
     * @private
     */
    handleCardWithInputs(card, inputAnchors, outputAnchors) {
        const internalTransitionId = `internal_transition_${card.id}_${card.title}`;

        if (!this.petriNet.动作.has(internalTransitionId)) {
            添加动作(this.petriNet, internalTransitionId, async () => {
                console.log(`执行内部动作: ${internalTransitionId}`);
                await card.controller.exec();
            });
        }

        // 处理输入锚点
        inputAnchors.forEach(inputAnchor => {
            const inputPlaceId = `place_${card.id}_${inputAnchor.id}`;
            if (!this.petriNet.节点.has(inputPlaceId)) {
                添加节点(this.petriNet, inputPlaceId, { type: 'process', tokens: 0, content: inputAnchor });
            }
            if (!已经连接(this.petriNet, inputPlaceId, internalTransitionId)) {
                添加连接(this.petriNet, inputPlaceId, internalTransitionId);
            }
        });

        // 处理输出锚点
        this.handleOutputAnchors(card, outputAnchors, internalTransitionId);
    }

    /**
     * 处理无输入锚点的卡片
     * @private
     */
    handleCardWithoutInputs(card, outputAnchors) {
        const internalPalaceId = `internal_palace_${card.id}_${card.title}`;
        const internalTransitionId = `internal_transition_${card.id}_${card.title}`;

        // 添加起始节点
        if (!this.petriNet.节点.has(internalPalaceId)) {
            添加节点(this.petriNet, internalPalaceId, {
                type: 'start',
                tokens: 1,
                content: card,
            });
        }

        // 添加转换动作
        if (!this.petriNet.动作.has(internalTransitionId)) {
            添加动作(this.petriNet, internalTransitionId, async () => {
                console.log(`执行无参内部动作: ${internalTransitionId}`);
                const globalInputs = this.getGlobalInputs ? this.getGlobalInputs() : {};
                await card.controller.exec(undefined, globalInputs);
            });
        }

        if (!已经连接(this.petriNet, internalPalaceId, internalTransitionId)) {
            添加连接(this.petriNet, internalPalaceId, internalTransitionId);
        }

        this.handleOutputAnchors(card, outputAnchors, internalTransitionId);
    }

    /**
     * 处理输出锚点
     * @private
     */
    handleOutputAnchors(card, outputAnchors, internalTransitionId) {
        outputAnchors.forEach(outputAnchor => {
            const outputPlaceId = `place_${card.id}_${outputAnchor.id}`;
            if (!this.petriNet.节点.has(outputPlaceId)) {
                添加节点(this.petriNet, outputPlaceId, { type: 'process', tokens: 0, content: outputAnchor });
            }
            if (!已经连接(this.petriNet, internalTransitionId, outputPlaceId)) {
                添加连接(this.petriNet, internalTransitionId, outputPlaceId);
            }
        });
    }

    /**
     * 初始化入口节点
     * @private
     */
    initializeEntryNodes() {

        找到入口节点(this.petriNet).forEach(节点id => {
            const 节点 = this.petriNet.节点.get(节点id);
            let 节点内容 = 节点.内容
            console.log(节点内容)
            节点内容 && 节点内容.define && 节点内容.setValue(节点内容.define.default)
            节点.数值 = 1; // 设置初始令牌
        });
    }

    /**
     * 执行整个网络
     * @param {Object} inputs 可选的全局输入参数
     * @returns {Promise<Object>} 执行结果
     */
    async exec(inputs = {}, force) {
        if (!this.petriNet) {
            throw new Error('Petri网尚未构建');
        }

        try {
            // 设置全局输入
            if (this.getGlobalInputs) {
                Object.assign(inputs, this.getGlobalInputs());
            }

            // 检查入口节点的值是否有变化
            if (!this.hasInputValuesChanged() && !force) {
                console.log('入口节点值未发生变化，跳过执行');
                return this.collectExitOutputs();
            }

            // 重置所有节点状态
            this.resetAllNodes();

            // 初始化入口节点
            this.initializeEntryNodes();

            if (this.mode === 'function') {
                // 函数模式：使用编译好的路径
                const entryNodes = 找到入口节点(this.petriNet);
                const results = {};

                for (const nodeId of entryNodes) {
                    const fn = this.compiledFunctions.get(nodeId);
                    if (fn) {
                        Object.assign(results, await fn(inputs));
                    }
                }

                return results;
            } else {
                // 可视化模式：执行整个网络
                await this.petriNet.exec();
                console.log('执行成功,正在收集结果')
                // 获取当前所有节点的值的快照
                this.prevNodeValues = this.captureNodeValues();

                // 收集出口节点的结果
                let result = this.collectExitOutputs();
                return result
            }
        } catch (error) {
            console.error('执行失败:', error);
            throw error;
        }
    }

    /**
     * 重置所有节点状态
     * @private
     */
    resetAllNodes() {
        for (const [nodeId, node] of this.petriNet.节点.entries()) {
            // 重置令牌数
            node.数值 = 0;

            // 重置节点内容状态（如果有）
            if (node.内容?.reset) {
                node.内容.reset();
            }
        }
    }

    /**
     * 收集出口节点的输出值
     * @private
     */
    collectExitOutputs() {
        const outputs = {};
        const exitNodes = 找到出口节点(this.petriNet);

        for (const nodeId of exitNodes) {
            const node = this.petriNet.节点.get(nodeId);
            const content = node.内容;
            if (content?.getValue) {
                const cardId = content.cardId;
                const anchorId = content.anchorId;
                outputs[`${cardId}_${anchorId}`] = content.getValue();
            }
        }

        return outputs;
    }

    /**
     * 开始自动执行
     * @param {number} interval - 执行间隔（毫秒）
     * @param {Object} inputs - 可选的全局输入参数
     * @returns {Promise<void>}
     */
    startAutoExec(interval = 1000, inputs = {}) {
        if (this.autoExecInterval) {
            console.warn('自动执行已经在运行中');
            return;
        }

        this.autoExecInterval = setInterval(async () => {
            try {
                await this.exec(inputs);
            } catch (error) {
                console.error('自动执行出错:', error);
                this.stopAutoExec();
            }
        }, interval);
    }

    /**
     * 停止自动执行
     */
    stopAutoExec() {
        if (this.autoExecInterval) {
            clearInterval(this.autoExecInterval);
            this.autoExecInterval = null;
        }
    }

    /**
     * 捕获所有节点的当前值
     * @private
     * @returns {Map<string, any>}
     */
    captureNodeValues() {
        const values = new Map();
        for (const [nodeId, node] of this.petriNet.节点.entries()) {
            values.set(nodeId, node.内容?.value);

        }
        return values;
    }

    /**
     * 收集入口节点的当前值
     * @private
     * @returns {Map<string, any>}
     */
    captureInputValues() {
        const values = new Map();
        const entryNodes = 找到入口节点(this.petriNet);
        for (const nodeId of entryNodes) {
            const node = this.petriNet.节点.get(nodeId);
            //如果入口节点是暴露的裸输入锚点
            if (!node.内容.controller) {
                values.set(nodeId, node.内容?.value);
            } else {
                values.set(nodeId, node.内容.controller.cardInfo.runtimeInputValue);
            }
        }
        return values;
    }

    /**
     * 检查入口节点的值是否发生变化
     * @private
     * @returns {boolean}
     */
    hasInputValuesChanged() {
        const currentValues = this.captureInputValues();

        if (!this.prevInputValues) {
            this.prevInputValues = currentValues;
            return true;
        }

        for (const [nodeId, currentValue] of currentValues) {
            const prevValue = this.prevInputValues.get(nodeId);
            if (currentValue !== prevValue) {
                this.prevInputValues = currentValues;
                return true;
            }
        }

        return false;
    }

    getConnections() {
        return Array.from(this.connections.values());
    }

    validateConnection(connection) {
        return {
            isValid: true,
            error: null
        };
    }

    /**
     * 销毁管理器
     */
    destroy() {
        // 清理所有事件订阅
        for (const unsubscribe of this.eventSubscriptions.values()) {
            unsubscribe();
        }
        this.eventSubscriptions.clear();

        // 清理其他资源
        this.petriNet = null;
        this.connections.clear();
        this.parsedCards = null;
    }
}


/***
 * 这里的查找目标式config,之后需要跟上面操作实际网络结构的函数重构整合
 */
export const findExistingConnection = (connections, newConnection) => {
    return connections.findIndex(conn =>
        conn.to.cardId === newConnection.to.cardId &&
        conn.to.anchorId === newConnection.to.anchorId
    );
};
// 检查是否存在重复连接
export const findDuplicateConnection = (connections, newConnection) => {
    return connections.findIndex(conn =>
        conn.from.cardId === newConnection.from.cardId &&
        conn.from.anchorId === newConnection.from.anchorId &&
        conn.to.cardId === newConnection.to.cardId &&
        conn.to.anchorId === newConnection.to.anchorId
    );
};

