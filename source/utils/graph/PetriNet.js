import { 柯里化 } from "../functions/currying.js"

/**
 * 创建一个新的Petri网结构
 * @param {string} 名称 - 流程图名称
 * @returns {Object} 流程图对象
 */
const 创建流程图 = (名称) => {
    if (typeof 名称 !== 'string' || !名称.trim()) {
        throw new Error('流程图名称必须是非空字符串');
    }
    return {
        名称,
        节点: new Map(),
        动作: new Map(),
        连接: new Map(),
        输入连接索引: new Map(),
        输出连接索引: new Map()
    }
}

/**
 * 添加状态节点
 * @param {Object} 流程图 - 流程图实例
 * @param {string} 节点ID - 节点唯一标识
 * @param {Object} 配置 - 节点配置
 * @param {('start'|'process'|'end')} 配置.type - 节点类型
 * @param {number} 配置.tokens - 初始令牌数
 * @throws {Error} 当节点已存在、类型无效或令牌数无效时抛出错误
 */
const 添加节点 = 柯里化((流程图, 节点ID, 配置) => {
    if (流程图.节点.has(节点ID)) {
        throw new Error(`节点 ${节点ID} 已存在`);
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
        数值: 配置.tokens
    });
});

/**
 * 添加动作节点
 * @param {Object} 流程图 - 流程图实例
 * @param {string} 动作ID - 动作唯一标识
 * @param {Function} 执行动作 - 动作执行的函数，返回Promise
 * @throws {Error} 当动作已存在或参数无效时抛出错误
 */
const 添加动作 = 柯里化((流程图, 动作ID, 执行动作) => {
    if (流程图.动作.has(动作ID)) {
        throw new Error(`动作 ${动作ID} 已存在`);
    }
    
    if (typeof 执行动作 !== 'function') {
        throw new Error(`动作 ${动作ID} 的执行函数必须是一个函数`);
    }

    流程图.动作.set(动作ID, {
        执行: 执行动作
    });
});

/**
 * 添加连接关系
 * @param {Object} 流程图 - 流程图实例
 * @param {string} 起始ID - 起始节点或动作ID
 * @param {string} 目标ID - 目标节点或动作ID
 * @param {number} [数值要求=1] - 连接的令牌要求
 * @throws {Error} 当连接无效或节点/动作不存在时抛出错误
 */
const 添加连接 = 柯里化((流程图, 起始ID, 目标ID, 数值要求 = 1) => {
    // 验证节点/动作存在性
    if (!流程图.节点.has(起始ID) && !流程图.动作.has(起始ID)) {
        throw new Error(`起始节点/动作 ${起始ID} 不存在`);
    }
    if (!流程图.节点.has(目标ID) && !流程图.动作.has(目标ID)) {
        throw new Error(`目标节点/动作 ${目标ID} 不存在`);
    }

    // 验证数值要求
    if (typeof 数值要求 !== 'number' || 数值要求 <= 0) {
        throw new Error('连接的令牌要求必须是正数');
    }

    const 连接ID = `${起始ID}->${目标ID}`;
    if (流程图.连接.has(连接ID)) {
        throw new Error(`连接 ${连接ID} 已存在`);
    }

    const 连接信息 = { 起始: 起始ID, 目标: 目标ID, 数值要求 };
    流程图.连接.set(连接ID, 连接信息);
    
    // 更新索引
    if (!流程图.输入连接索引.has(目标ID)) {
        流程图.输入连接索引.set(目标ID, []);
    }
    流程图.输入连接索引.get(目标ID).push(连接信息);
    
    if (!流程图.输出连接索引.has(起始ID)) {
        流程图.输出连接索引.set(起始ID, []);
    }
    流程图.输出连接索引.get(起始ID).push(连接信息);
})

/**
 * 判断变迁是否可以触发
 * @param {Object} 流程图 - 流程图实例
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

    // 检查所有输入节点的令牌是否足够
    for (const 连接 of 输入连接) {
        const 节点 = 流程图.节点.get(连接.起始);
        if (!节点) {
            return {
                可触发: false,
                原因: `输入节点 ${连接.起始} 不存在`
            };
        }
        if (节点.数值 < 连接.数值要求) {
            return {
                可触发: false,
                原因: `节点 ${连接.起始} 的令牌数不足 (当前: ${节点.数值}, 需要: ${连接.数值要求})`
            };
        }
    }

    // 所有检查都通过
    return {
        可触发: true,
        原因: '所有条件满足'
    };
});

/**
 * 触发变迁执行
 * @param {Object} 流程图 - 流程图实例
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
 * @exports {Object} 导出所有Petri网相关函数
 * @property {Function} 创建流程图 - 创建新的流程图实例
 * @property {Function} 添加节点 - 添加状态节点
 * @property {Function} 添加动作 - 添加动作节点
 * @property {Function} 添加连接 - 添加连接关系
 * @property {Function} 触发变迁 - 触发变迁执行
 * @property {Function} 变迁可触发 - 判断变迁是否可以触发
 */
export {
    创建流程图,
    添加节点,
    添加动作,
    添加连接,
    触发动作,
    动作可触发 
}