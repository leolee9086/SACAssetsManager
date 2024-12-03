import { 创建流程图, 添加节点, 添加动作, 添加连接, 动作可触发, 触发动作 } from './PetriNet.js';

class 状态管理器 {
    constructor(配置) {
        this.流程图 = 创建流程图('状态管理器');
        this.状态回调 = new Map();
        this.初始化(配置);
    }

    /**
     * @param {Object} 配置
     * @param {Object[]} 配置.状态列表 - [{名称, 初始令牌数}]
     * @param {Object[]} 配置.动作列表 - [{名称, 执行函数}]
     * @param {Object[]} 配置.转换规则 - [{从状态, 到状态, 令牌数}]
     * @param {string[][]} 配置.互斥组 - 互斥状态组列表
     */
    初始化(配置) {
        const { 状态列表 = [], 动作列表 = [], 转换规则 = [], 互斥组 = [] } = 配置;

        // 注册所有状态节点
        状态列表.forEach(状态 => {
            添加节点(this.流程图)(状态.名称, {
                type: 'process',
                tokens: 状态.初始令牌数 || 0,
                content: 状态.名称
            });
        });

        // 注册所有动作
        动作列表.forEach(动作 => {
            添加动作(this.流程图)(动作.名称, async (...参数) => {
                if (动作.执行函数) {
                    await 动作.执行函数(...参数);
                }
                // 触发状态变更回调
                this.触发状态回调();
            });
        });

        // 添加转换规则
        转换规则.forEach(规则 => {
            添加连接(this.流程图)(
                规则.从状态,
                规则.动作名称,
                规则.令牌数 || 1
            );
            添加连接(this.流程图)(
                规则.动作名称,
                规则.到状态,
                规则.令牌数 || 1
            );
        });

        // 处理互斥状态组
        互斥组.forEach(组 => {
            this.添加互斥组(组);
        });
    }

    /**
     * 添加互斥状态组
     * @param {string[]} 状态组 - 互斥的状态名称数组
     */
    添加互斥组(状态组) {
        // 创建一个共享资源节点，初始令牌数为1
        const 资源节点名称 = `互斥资源_${Math.random().toString(36).substr(2, 9)}`;
        添加节点(this.流程图)(资源节点名称, {
            type: 'process',
            tokens: 1,
            content: '互斥资源'
        });

        // 将资源节点连接到状态的转换中
        状态组.forEach(状态名称 => {
            const 相关转换 = Array.from(this.流程图.连接.entries())
                .filter(([_, 连接]) => 连接.目标 === 状态名称)
                .map(([_, 连接]) => 连接.起始);

            相关转换.forEach(转换名称 => {
                添加连接(this.流程图)(资源节点名称, 转换名称, 1);
                添加连接(this.流程图)(转换名称, 资源节点名称, 1);
            });
        });
    }

    /**
     * 获取当前激活的状态
     * @returns {string[]} 激活状态列表
     */
    获取当前状态() {
        return Array.from(this.流程图.节点.entries())
            .filter(([_, 节点]) => 节点.数值 > 0)
            .map(([名称]) => 名称)
            .filter(名称 => !名称.startsWith('互斥资源_'));
    }

    /**
     * 尝试触发状态转换
     * @param {string} 动作名称 
     * @param {Function} 条件函数 - 可选的转换条件
     * @returns {Promise<boolean>} 是否成功触发
     */
    async 触发转换(动作名称, 条件函数) {
        try {
            // 检查转换条件
            if (条件函数 && !await 条件函数(this.获取当前状态())) {
                console.warn('状态转换条件不满足');
                return false;
            }

            const 转换前状态 = this.获取当前状态();
            
            // 使用 PetriNet 的触发动作机制
            const 可触发结果 = 动作可触发(this.流程图)(动作名称);
            if (!可触发结果.可触发) {
                console.warn(`无法触发转换: ${可触发结果.原因}`);
                return false;
            }
            
            await 触发动作(this.流程图)(动作名称);
            
            // 记录状态变更历史
            this.记录状态历史(转换前状态, 动作名称, this.获取当前状态());
            
            return true;
        } catch (错误) {
            console.warn(`触发转换失败: ${错误.message}`);
            return false;
        }
    }

    /**
     * 记录状态变更历史
     * @private
     */
    记录状态历史(前状态, 动作, 后状态) {
        this.状态历史.push({
            时间戳: Date.now(),
            前状态,
            动作,
            后状态
        });

        // 限制历史记录数量
        if (this.状态历史.length > this.最大历史记录数) {
            this.状态历史.shift();
        }
    }

    /**
     * 获取状态历史记录
     * @param {number} 数量 - 可选，获取最近的几条记录
     * @returns {Array} 状态历史记录
     */
    获取状态历史(数量) {
        if (数量) {
            return this.状态历史.slice(-数量);
        }
        return [...this.状态历史];
    }

    /**
     * 验证状态是否有效
     * @param {string} 状态名称
     * @returns {boolean} 是否是有效状态
     */
    验证状态(状态名称) {
        return this.流程图.节点.has(状态名称) && 
               !状态名称.startsWith('互斥资源_');
    }

    /**
     * 添加状态变更回调
     * @param {Function} 回调函数 
     */
    监听状态变更(回调函数) {
        this.状态回调.set(回调函数, true);
    }

    /**
     * 移除状态变更回调
     * @param {Function} 回调函数 
     */
    取消监听(回调函数) {
        this.状态回调.delete(回调函数);
    }

    /**
     * 触发所有状态回调
     * @private
     */
    触发状态回调() {
        const 当前状态 = this.获取当前状态();
        this.状态回调.forEach((_, 回调函数) => {
            回调函数(当前状态);
        });
    }
}

/**
 * @typedef {Object} 状态快照
 * @property {Map<string, number>} 节点令牌 - 各节点的令牌数量
 * @property {string} 时间戳 - 快照时间
 */

class 状态历史管理器 {
    constructor(流程图) {
        this.流程图 = 流程图;
        this.历史记录 = [];
        this.当前位置 = -1;
    }

    创建快照() {
        // 直接使用 PetriNet 的节点数据创建快照
        const 节点令牌 = new Map(
            Array.from(this.流程图.节点.entries())
                .map(([id, 节点]) => [id, 节点.数值])
        );
        return { 节点令牌, 时间戳: Date.now() };
    }

    应用快照(快照) {
        // 直接更新 PetriNet 节点的令牌数
        for (const [节点ID, 令牌数] of 快照.节点令牌.entries()) {
            const 节点 = this.流程图.节点.get(节点ID);
            if (节点) {
                节点.数值 = 令牌数;
            }
        }
    }

    记录状态() {
        // 清除当前位置之后的历史
        this.历史记录 = this.历史记录.slice(0, this.当前位置 + 1);
        this.历史记录.push(this.创建快照());
        this.当前位置++;
    }

    回滚() {
        if (this.当前位置 > 0) {
            this.当前位置--;
            this.应用快照(this.历史记录[this.当前位置]);
        }
    }

    前进() {
        if (this.当前位置 < this.历史记录.length - 1) {
            this.当前位置++;
            this.应用快照(this.历史记录[this.当前位置]);
        }
    }
}

/**
 * 检测状态冲突
 * @param {PetriNet} 流程图
 * @returns {Array<{节点1: string, 节点2: string, 原因: string}>} 冲突列表
 */
const 检测状态冲突 = (流程图) => {
    const 冲突列表 = [];
    
    // 使用 PetriNet 的输入连接索引检查共享资源
    for (const [节点ID1, 节点1] of 流程图.节点.entries()) {
        if (节点ID1.startsWith('互斥资源_')) continue;
        
        const 输入连接1 = 流程图.输入连接索引.get(节点ID1) || [];
        
        for (const [节点ID2, 节点2] of 流程图.节点.entries()) {
            if (节点ID1 === 节点ID2 || 节点ID2.startsWith('互斥资源_')) continue;
            
            const 输入连接2 = 流程图.输入连接索引.get(节点ID2) || [];
            
            // 检查共享输入资源
            const 共享资源 = 输入连接1.filter(连接1 => 
                输入连接2.some(连接2 => 连接1.起始 === 连接2.起始 && 连接1.起始.startsWith('互斥资源_'))
            );
            
            if (共享资源.length > 0 && 节点1.数值 > 0 && 节点2.数值 > 0) {
                冲突列表.push({
                    节点1: 节点ID1,
                    节点2: 节点ID2,
                    原因: `共享资源访问冲突: ${共享资源.map(c => c.起始).join(', ')}`
                });
            }
        }
    }
    
    return 冲突列表;
};

/**
 * 分析状态依赖关系
 * @param {PetriNet} 流程图
 * @param {string} 状态节点ID
 * @returns {Object} 依赖分析结果
 */
const 分析状态依赖 = (流程图, 状态节点ID) => {
    const 依赖图 = new Map();
    const 已访问 = new Set();

    const 深度遍历 = (节点ID, 深度 = 0) => {
        if (已访问.has(节点ID)) return;
        已访问.add(节点ID);

        const 输入连接 = 流程图.输入连接索引.get(节点ID) || [];
        for (const 连接 of 输入连接) {
            依赖图.set(连接.起始, {
                深度,
                类型: 流程图.节点.has(连接.起始) ? '状态' : '动作',
                要求令牌: 连接.数值要求
            });
            深度遍历(连接.起始, 深度 + 1);
        }
    };

    深度遍历(状态节点ID);
    return 依赖图;
};

/**
 * 分析状态迁移路径
 * @param {PetriNet} 流程图
 * @param {string} 起始状态
 * @param {string} 目标状态
 * @returns {Array<{路径: string[], 所需动作: string[]}>} 可能的迁移路径
 */
const 分析迁移路径 = (流程图, 起始状态, 目标状态) => {
    const 路径列表 = [];
    const 已访问 = new Set();

    const 寻找路径 = (当前状态, 当前路径 = [], 已执行动作 = []) => {
        if (当前状态 === 目标状态) {
            路径列表.push({
                路径: [...当前路径, 当前状态],
                所需动作: [...已执行动作]
            });
            return;
        }

        if (已访问.has(当前状态)) return;
        已访问.add(当前状态);

        const 输出连接 = 流程图.输出连接索引.get(当前状态) || [];
        for (const 连接 of 输出连接) {
            if (流程图.动作.has(连接.目标)) {
                const 动作后连接 = 流程图.输出连接索引.get(连接.目标) || [];
                for (const 后续连接 of 动作后连接) {
                    寻找路径(
                        后续连接.目标,
                        [...当前路径, 当前状态],
                        [...已执行动作, 连接.目标]
                    );
                }
            }
        }

        已访问.delete(当前状态);
    };

    寻找路径(起始状态);
    return 路径列表;
};

/**
 * 添加状态约束
 * @param {PetriNet} 流程图
 * @param {Function} 约束函数 - (当前状态集合) => boolean
 * @param {string} 约束描述
 */
const 添加状态约束 = (流程图) => {
    if (!流程图.约束列表) {
        流程图.约束列表 = [];
    }

    return (约束函数, 约束描述) => {
        流程图.约束列表.push({
            验证: 约束函数,
            描述: 约束描述
        });
    };
};

/**
 * 验证状态约束
 * @param {PetriNet} 流程图
 * @returns {Array<string>} 违反的约束描述列表
 */
const 验证状态约束 = (流程图) => {
    if (!流程图.约束列表) return [];

    const 当前激活状态 = Array.from(流程图.节点.entries())
        .filter(([_, 节点]) => 节点.数值 > 0)
        .map(([id]) => id);

    return 流程图.约束列表
        .filter(约束 => !约束.验证(当前激活状态))
        .map(约束 => 约束.描述);
};
