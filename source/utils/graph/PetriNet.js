import { 柯里化 } from "../functions/currying.js"

/**
 * @typedef {Object} 节点配置
 * @property {'start'|'process'|'end'} type - 节点类型
 * @property {number} tokens - 初始令牌数
 * @property {*} [content] - 节点内容
 */

/**
 * @typedef {Object} 连接信息
 * @property {string} 起始 - 起始节点/动作ID
 * @property {string} 目标 - 目标节点/动作ID
 * @property {number} 数值要求 - 连接需要的令牌数
 */

/**
 * @typedef {Object} PetriNet
 * @property {string} 名称 - 流程图名称
 * @property {Map<string, Object>} 节点 - 节点集合
 * @property {Map<string, Object>} 动作 - 动作集合
 * @property {Map<string, 连接信息>} 连接 - 连接关系
 * @property {Map<string, 连接信息[]>} 输入连接索引 - 按目标节点索引的连接
 * @property {Map<string, 连接信息[]>} 输出连接索引 - 按起始节点索引的连接
 * @property {Set<string>} 入口节点索引 - 入口节点集合
 * @property {Set<string>} 出口节点索引 - 出口节点集合
 */

/**
 * 创建一个新的Petri网结构
 * @param {string} 名称 - 流程图名称
 * @returns {PetriNet} 流程图对象
 */
const 创建流程图 = (名称) => {
    if (typeof 名称 !== 'string' || !名称.trim()) {
        throw new Error('流程图名称必须是非空字符串');
    }
    const petriNet = {
        名称,
        节点: new Map(),
        动作: new Map(),
        连接: new Map(),
        输入连接索引: new Map(),
        输出连接索引: new Map(),
        入口节点索引: new Set(),
        出口节点索引: new Set()
    }
    // 添加 exec 方法
    petriNet.exec = async function () {
        await 执行Petri网(this);
    };

    return petriNet;

}

/**
 * 添加状态节点
 * @param {PetriNet} 流程图 - 流程图实例
 * @param {string} 节点ID - 节点唯一标识
 * @param {节点配置} 配置 - 节点配置
 * @throws {Error} 当节点已存在、类型无效或令牌数无效时抛出错误
 */
const 添加节点 = 柯里化((流程图, 节点ID, 配置) => {
    if (流程图.节点.has(节点ID)) {
        console.warn(`节点 ${节点ID} 已存在,添加未执行,请确保这符合你的预期`);
        return
    }

    if (!配置 || typeof 配置 !== 'object') {
        throw new Error(`节点 ${节点ID} 的配置必须是一个对象`);
    }

    if (!['start', 'process', 'end'].includes(配置.type)) {
        throw new Error(`节点 ${节点ID} 的类型 ${配置.type} 无效`);
    }

    if (typeof 配置.tokens !== 'number' || 配置.tokens < 0) {
        throw new Error(`节点 ${节点ID} 的令牌数必须是非负数`);
    }

    流程图.节点.set(节点ID, {
        type: 配置.type,
        数值: 配置.tokens,
        内容: 配置.content,
    });

    // 初始时将节点标记为入口和出口
    流程图.入口节点索引.add(节点ID);
    流程图.出口节点索引.add(节点ID);
});

/**
 * 添加动作节点
 * @param {PetriNet} 流程图 - 流程图实例
 * @param {string} 动作ID - 动作唯一标识
 * @param {Function} 执行动作 - 动作执行的函数，返回Promise
 * @throws {Error} 当动作已存在或参数无效时抛出错误
 */
const 添加动作 = 柯里化((流程图, 动作ID, 执行动作) => {
    if (流程图.动作.has(动作ID)) {
        console.warn(`动作 ${动作ID} 已存在,添加未执行,请确保这符合你的预期`);
        return
    }

    if (typeof 执行动作 !== 'function') {
        throw new Error(`动作 ${动作ID} 的执行函数必须是一个函数`);
    }

    流程图.动作.set(动作ID, {
        执行: 执行动作
    });
});

const 已经连接 = 柯里化((流程图, 起始ID, 目标ID) => {
    const 连接ID = `${起始ID}->${目标ID}`;
    return 流程图.连接.has(连接ID);
});

/**
 * 验证节点ID是否存在
 * @private
 */
const 验证节点存在 = (流程图, 节点ID, 类型 = '节点') => {
    if (!流程图.节点.has(节点ID) && !流程图.动作.has(节点ID)) {
        throw new Error(`${类型} ${节点ID} 不存在`);
    }
};

/**
 * 更新连接索引
 * @private
 */
const 更新连接索引 = (流程图, 连接信息) => {
    const { 起始, 目标 } = 连接信息;
    
    // 更新输入索引
    if (!流程图.输入连接索引.has(目标)) {
        流程图.输入连接索引.set(目标, []);
    }
    流程图.输入连接索引.get(目标).push(连接信息);

    // 更新输出索引
    if (!流程图.输出连接索引.has(起始)) {
        流程图.输出连接索引.set(起始, []);
    }
    流程图.输出连接索引.get(起始).push(连接信息);

    // 更新入口出口标记
    流程图.出口节点索引.delete(起始);
    流程图.入口节点索引.delete(目标);
};

/**
 * 添加连接关系
 * @param {PetriNet} 流程图 - Petri网实例
 * @param {string} 起始ID - 起始节点/动作ID
 * @param {string} 目标ID - 目标节点/动作ID
 * @param {number} [数值要求=1] - 连接需要的令牌数
 */
const 添加连接 = 柯里化((流程图, 起始ID, 目标ID, 数值要求 = 1) => {
    验证节点存在(流程图, 起始ID, '起始节点/动作');
    验证节点存在(流程图, 目标ID, '目标节点/动作');
    
    if (typeof 数值要求 !== 'number' || 数值要求 <= 0) {
        throw new Error('连接的令牌要求必须是正数');
    }

    const 连接ID = `${起始ID}->${目标ID}`;
    if (流程图.连接.has(连接ID)) {
        console.warn(`连接 ${连接ID} 已存在,添加未执行,请确保这符合你的预期`);
        return;
    }

    const 连接信息 = { 起始: 起始ID, 目标: 目标ID, 数值要求 };
    流程图.连接.set(连接ID, 连接信息);
    更新连接索引(流程图, 连接信息);
});

/**
 * 判断变迁是否可以触发
 * @param {PetriNet} 流程图 - Petri网实例
 * @param {string} 动作ID - 要判断的动作ID
 * @returns {Object} 判断结果，包含是否可触发及原因
 * @property {boolean} 可触发 - 是否可以触发
 * @property {string} 原因 - 不可触发时的原因
 */
const 动作可触发 = 柯里化((流程图, 动作ID) => {
    // 检查动作是否存在
    if (!流程图.动作.has(动作ID)) {
        return {
            可触发: false,
            原因: `动作 ${动作ID} 不存在`
        };
    }

    const 输入连接 = 流程图.输入连接索引.get(动作ID) || [];

    // 检查是否有输入连接
    if (输入连接.length === 0) {
        return {
            可触发: false,
            原因: `动作 ${动作ID} 没有输入连接`
        };
    }
    let token满足 = true
    let 原因 = []
    // 检查所有输入节点的令牌是否足够
    for (const 连接 of 输入连接) {
        const 节点 = 流程图.节点.get(连接.起始);
        if (!节点) {
            token满足 = false

            原因.push(`输入节点 ${连接.起始} 不存在`)

        }
        if (节点.数值 < 连接.数值要求) {
            token满足 = false

            原因.push(`节点 ${连接.起始} 的令牌数不足 (当前: ${节点.数值}, 需要: ${连接.数值要求})`)

        }
    }
    // 所有检查都通过
    return {
        可触发: token满足,
        原因: 原因.join('\n')
    };
});

/**
 * 触发变迁执行
 * @param {PetriNet} 流程图 - Petri网实例
 * @param {string} 动作ID - 要触发的动作ID
 * @param {...any} 参数 - 传递给动作执行函数的参数
 * @returns {Promise<any>} 动作执行的结果
 * @throws {Error} 当动作不存在或执行失败时抛出错误
 */
const 触发动作 = 柯里化(async (流程图, 动作ID, ...参数) => {
    const 检查结果 = 动作可触发(流程图, 动作ID);
    if (!检查结果.可触发) {
        throw new Error(`无法触发动作${动作ID}: ${检查结果.原因}`);
    }

    const 动作 = 流程图.动作.get(动作ID);
    const 输入连接 = 流程图.输入连接索引.get(动作ID) || [];
    const 输出连接 = 流程图.输出连接索引.get(动作ID) || [];

    try {
        // 扣除输入节点的令牌
        for (const 连接 of 输入连接) {
            const 节点 = 流程图.节点.get(连接.起始);
            节点.数值 -= 连接.数值要求;
        }

        // 执行动作
        const 结果 = await 动作.执行(...参数);

        // 增加输出节点的令牌
        for (const 连接 of 输出连接) {
            const 节点 = 流程图.节点.get(连接.目标);
            节点.数值 += 连接.数值要求;
        }

        return 结果;
    } catch (错误) {
        // 执行失败时回滚令牌变化
        for (const 连接 of 输入连接) {
            const 节点 = 流程图.节点.get(连接.起始);
            节点.数值 += 连接.数值要求;
        }
        throw new Error(`执行动作 ${动作ID} 失败: ${错误.message}`);
    }
});

/**
 * 找到入口节点
 * @param {PetriNet} 流程图 - Petri网实例
 * @returns {Array} 入口节点ID数组
 */
const 找到入口节点 = (流程图) => {
    return Array.from(流程图.入口节点索引);
}

/**
 * 找到出口节点
 * @param {PetriNet} 流程图 - Petri网实例
 * @returns {Array} 出口节点ID数组
 */
const 找到出口节点 = (流程图) => {
    return Array.from(流程图.出口节点索引);
}

/**
 * 执行 Petri 网
 * @param {PetriNet} petriNet Petri网实例
 */
async function 执行Petri网(petriNet) {
    let hasEnabled = true;

    while (hasEnabled) {
        hasEnabled = false;

        // 检查所有变迁
        for (const [transitionId, transition] of petriNet.动作.entries()) {
            if (await 可以执行(petriNet, transitionId)) {
                await 执行变迁(petriNet, transitionId);
                hasEnabled = true;
            }
        }
    }
}

/**
 * 检查变迁是否可以执行
 */
function 可以执行(petriNet, transitionId) {
    // 检查所有输入库所是否有足够的令牌
    for (const [connId, conn] of petriNet.连接.entries()) {
        if (conn.目标 === transitionId) {
            const place = petriNet.节点.get(conn.起始);
            if (!place || place.数值 < conn.数值要求) {
                return false;
            }
        }
    }
    return true;
}

/**
 * 执行单个变迁
 */
async function 执行变迁(petriNet, transitionId) {
    // 消耗输入库所的令牌
    for (const [connId, conn] of petriNet.连接.entries()) {
        if (conn.目标 === transitionId) {
            const place = petriNet.节点.get(conn.起始);
            if (place) {
                place.数值 -= conn.数值要求;
            }
        }
    }

    // 执行变迁动作
    const transition = petriNet.动作.get(transitionId);
    if (transition?.执行) {
        await transition.执行();
    }

    // 产生输出库所的令牌
    for (const [connId, conn] of petriNet.连接.entries()) {
        if (conn.起始 === transitionId) {
            const place = petriNet.节点.get(conn.目标);
            if (place) {
                place.数值 += conn.数值要求;
            }
        }
    }
}

/**
 * 验证连接的合法性
 * @param {Array} connections 所有连接
 * @param {Object} newConnection 新的连接
 * @param {Array} cards 所有卡片
 * @returns {Object} 验证结果 {isValid: boolean, error: string}
 */
export function validateConnection(connections, newConnection, cards) {
    // 1. 检查是否是自环
    if (newConnection.from.cardId === newConnection.to.cardId) {
        return {
            isValid: false,
            error: '不能连接到自己'
        };
    }

    // 2. 检查是否存在重复连接
    const isDuplicate = connections.some(conn => 
        conn.from.cardId === newConnection.from.cardId &&
        conn.from.anchorId === newConnection.from.anchorId &&
        conn.to.cardId === newConnection.to.cardId &&
        conn.to.anchorId === newConnection.to.anchorId
    );
    if (isDuplicate) {
        return {
            isValid: false,
            error: '连接已存在'
        };
    }

    // 3. 检查类型匹配
    const fromCard = cards.find(card => card.id === newConnection.from.cardId);
    const toCard = cards.find(card => card.id === newConnection.to.cardId);
    const fromAnchor = fromCard?.controller.anchors.find(a => a.id === newConnection.from.anchorId);
    const toAnchor = toCard?.controller.anchors.find(a => a.id === newConnection.to.anchorId);

    if (!fromAnchor || !toAnchor) {
        return {
            isValid: false,
            error: '无效的锚点'
        };
    }

    if (fromAnchor.type !== 'output' || toAnchor.type !== 'input') {
        return {
            isValid: false,
            error: '锚点类型不匹配'
        };
    }

    return {
        isValid: true,
        error: null
    };
}

// 在导出中添加新函数
export {
    创建流程图,
    添加节点,
    添加动作,
    添加连接,
    触发动作,
    动作可触发,
    已经连接,
    执行变迁,
    可以执行,
    找到入口节点,
    找到出口节点,
    执行Petri网
}