
// 导入事件总线
import { 创建事件总线 } from '../../utils/base/forEvent/useEventBus.js';
const 对象引用管理器 = {
    弱引用映射: new WeakMap(),
    
    注册(对象) {
        const 引用标记 = new WeakRef(对象);
        const 注册信息 = {
            引用标记,
            最后访问: performance.now(),
            引用计数: 1
        };
        
        this.弱引用映射.set(对象, 注册信息);
        return 对象;
    },
    
    增加引用(对象) {
        const 引用信息 = this.弱引用映射.get(对象);
        if (引用信息?.引用标记.deref()) {
            引用信息.引用计数++;
            引用信息.最后访问 = performance.now();
        }
    },
    
    释放(对象) {
        const 引用信息 = this.弱引用映射.get(对象);
        if (引用信息?.引用标记.deref()) {
            引用信息.引用计数--;
            if (引用信息.引用计数 <= 0) {
                this.弱引用映射.delete(对象);
                return true;
            }
        }
        return false;
    }
};

const 重置对象 = (对象) => {
    // 基础属性重置
    对象.值 = undefined;
    对象.链.length = 0;
    
    // 清理元信息
    Object.keys(对象.元信息).forEach(key => {
        delete 对象.元信息[key];
    });
    
    // 清理扩展，使用优化的遍历
    if (对象.扩展.size > 0) {
        const 迭代器 = 对象.扩展.entries();
        let 项;
        while (!(项 = 迭代器.next()).done) {
            const [键, 值] = 项.value;
            if (值?.销毁) 值.销毁();
            对象.扩展.delete(键);
        }
    }
    
    // 重置引用计数
    对象引用管理器.注册(对象);
    
    return 对象;
};

const 结果对象池 = {
    缓冲区: [],
    清理注册表: new FinalizationRegistry(索引 => {
        if (this.缓冲区[索引]) {
            this.空闲索引.push(索引);
        }
    }),
    空闲索引: [], // 存储可重用的索引
    使用计数: 0,
    
    初始化() {
        // 初始化缓冲区
        for(let i = 0; i < this.缓冲区.length; i++) {
            this.缓冲区[i] = {
                值: undefined,
                元信息: Object.create(null),
                链: [],
                扩展: new Map(),
                引用计数: 0,
                最后使用时间: 0,
                索引: i,  // 存储自身索引以便快速归还
                完成处理() { return this; }
            };
            this.空闲索引.push(i);
        }
    },
    
    获取() {
        if (this.空闲索引.length === 0) {
            // 添加更严格的限制
            if (this.缓冲区.length >= 100000) { // 降低最大限制
                this.清理未使用对象();
                if (this.空闲索引.length === 0) {
                    throw new Error('对象池已达到最大容量限制，且无法回收更多对象');
                }
            } else {
                return this.扩容并获取();
            }
        }
        
        const 索引 = this.空闲索引.pop();
        const 对象 = this.缓冲区[索引];
        
        重置对象(对象);
        对象引用管理器.注册(对象);
        
        return 对象;
    },
    
    归还(对象) {
        if (!对象引用管理器.释放(对象)) {
            return false;
        }
        
        if (对象.索引 >= this.缓冲区.length || this.缓冲区[对象.索引] !== 对象) {
            return false;
        }
        
        重置对象(对象);
        this.空闲索引.push(对象.索引);
        return true;
    },
    
    清理未使用对象(强制清理 = false) {
        const 当前时间 = performance.now();
        const 超时阈值 = 强制清理 ? 0 : 30000; // 强制清理时忽略时间阈值
        let 清理数量 = 0;
        
        // 使用数组索引直接遍历，避免额外的迭代器开销
        for (let i = 0; i < this.缓冲区.length; i++) {
            const 对象 = this.缓冲区[i];
            if (对象.引用计数 <= 0 && (强制清理 || (当前时间 - 对象.最后使用时间) > 超时阈值)) {
                重置对象(对象);
                this.空闲索引.push(i);
                清理数量++;
            }
        }
        
        // 如果清理效果不理想且是强制清理，执行紧急扩容
        if (强制清理 && this.空闲索引.length < this.缓冲区.length * 0.1) {
            this.紧急扩容();
        }
        
        return 清理数量;
    },
    
    扩容并获取() {
        const 原始长度 = this.缓冲区.length;
        // 限制每次扩容的大小，避免创建过大的数组
        const 增长量 = Math.min(
            Math.floor(原始长度 * 0.5), // 50%增长率
            10000 // 最大增长量
        );
        const 新长度 = 原始长度 + Math.max(增长量, 100); // 确保至少增加100个对象
        
        try {
            // 创建新缓冲区
            const 新缓冲区 = new Array(新长度);
            
            // 复制现有对象
            for(let i = 0; i < 原始长度; i++) {
                新缓冲区[i] = this.缓冲区[i];
            }
            
            // 初始化新增的对象
            for(let i = 原始长度; i < 新长度; i++) {
                新缓冲区[i] = {
                    值: undefined,
                    元信息: Object.create(null),
                    链: [],
                    扩展: new Map(),
                    引用计数: 0,
                    最后使用时间: 0,
                    索引: i,
                    完成处理() { return this; }
                };
                this.空闲索引.push(i);
            }
            
            this.缓冲区 = 新缓冲区;
            
            // 返回一个新对象
            const 新对象 = this.缓冲区[原始长度];
            对象引用管理器.注册(新对象);
            this.空闲索引.pop(); // 移除使用的索引
            return 新对象;
            
        } catch (错误) {
            // 如果扩容失败，尝试进行垃圾回收并重试一次
            this.清理未使用对象();
            if (this.空闲索引.length > 0) {
                return this.获取();
            }
            // 如果仍然失败，抛出更有意义的错误
            throw new Error(`对象池扩容失败: ${错误.message}`);
        }
    },
    
    紧急扩容() {
        const 当前使用量 = this.缓冲区.length - this.空闲索引.length;
        const 所需大小 = Math.max(this.缓冲区.length * 2, 当前使用量 * 3);
        const 新缓冲区 = new Array(所需大小);
        
        // 复制现有对象
        for(let i = 0; i < this.缓冲区.length; i++) {
            新缓冲区[i] = this.缓冲区[i];
        }
        
        // 初始化新增的对象
        for(let i = this.缓冲区.length; i < 所需大小; i++) {
            新缓冲区[i] = {
                值: undefined,
                元信息: Object.create(null),
                链: [],
                扩展: new Map(),
                引用计数: 0,
                最后使用时间: 0,
                索引: i,
                完成处理() { return this; }
            };
            this.空闲索引.push(i);
        }
        
        this.缓冲区 = 新缓冲区;
    },
    
    创建对象(索引) {
        const 对象 = {
            值: undefined,
            元信息: Object.create(null),
            链: [],
            扩展: new Map(),
            引用计数: 0,
            最后使用时间: 0,
            索引,
            完成处理() { return this; }
        };
        
        // 注册终结器
        this.清理注册表.register(对象, 索引);
        return 对象;
    }
};

// 初始化对象池
结果对象池.初始化();

// 将包装结果的定义移动到创建工具构造器函数内部
export const 创建工具构造器 = (配置 = {}) => {
    const 处理器组 = new Map();
    const 扩展组 = new Map();
    const 事件总线 = 创建事件总线();
    
    // 默认错误处理配置
    const 错误处理配置 = {
        中断执行: false,
        性能模式: false,
        ...配置.错误处理
    };

    // 将包装结果的定义移到这里
    const 包装结果性能模式 = (值) => {
        const 结果 = 结果对象池.获取();
        结果.值 = 值;
        结果.元信息.时间戳 = performance.now();
        return 结果;
    };

    const 包装结果普通模式 = (值, 元信息 = {}) => {
        const 结果 = 结果对象池.获取();
        结果.值 = 值;
        结果.元信息.时间戳 = Date.now();
        
        const 堆栈 = {};
        Error.captureStackTrace(堆栈, 包装结果普通模式);
        结果.元信息.执行上下文 = 堆栈.stack;
        
        for (const key in 元信息) {
            结果.元信息[key] = 元信息[key];
        }
        
        return 结果;
    };

    // 根据配置选择实现
    const 包装结果 = 错误处理配置.性能模式 ? 包装结果性能模式 : 包装结果普通模式;

    const 包装错误 = (错误, 上下文) => ({
        错误,
        上下文,
        时间戳: Date.now(),
        堆栈: 错误.stack
    });

    return {
        /**
         * 添加处理器
         * @param {Function} 处理器 
         */
        添加处理器(处理器, 选项 = {}) {
            if (typeof 处理器 !== 'function') {
                throw new TypeError('处理器必须是函数');
            }
            const 处理器ID = Symbol(处理器.name || '匿名处理器');
            处理器组.set(处理器ID, { 处理器, 选项 });
            return this;
        },

        /**
         * 添加扩展功能
         * @param {string} 扩展名称 
         * @param {Object} 扩展处理器 包含 初始化、处理前、处理后 等钩子
         */
        添加扩展(扩展名称, 扩展处理器) {
            扩展组.set(扩展名称, 扩展处理器);
            return this;
        },

        /**
         * 构建最终工具
         */
        构建() {
            const 执行器 = async (输入) => {
                let 当前结果 = 包装结果(输入);
                
                // 触发执行开始事件
                事件总线.触发('执行开始', { 输入 });

                // 执行扩展初始化
                for (const [名称, 扩展] of 扩展组) {
                    if (扩展.初始化) {
                        try {
                            当前结果.扩展.set(名称, await 扩展.初始化(当前结果));
                        } catch (错误) {
                            事件总线.触发('扩展错误', { 
                                阶段: '初始化',
                                扩展: 名称,
                                错误
                            });
                            if (错误处理配置.中断执行) {
                                return {
                                    错误: 包装错误(错误, {
                                        阶段: '扩展初始化',
                                        扩展: 名称
                                    }),
                                    链: []
                                };
                            }
                        }
                    }
                }

                for (const [处理器ID, { 处理器, 选项 }] of 处理器组) {
                    事件总线.触发('处理器开始', {
                        处理器: 处理器.name || '匿名处理器',
                        输入: 当前结果.值
                    });

                    try {
                        const 处理前 = 当前结果.值;
                        
                        // 执行处理前扩展
                        for (const [名称, 扩展] of 扩展组) {
                            if (扩展.处理前) {
                                try {
                                    await 扩展.处理前(当前结果);
                                } catch (错误) {
                                    事件总线.触发('扩展错误', {
                                        阶段: '处理前',
                                        扩展: 名称,
                                        错误
                                    });
                                    if (错误处理配置.中断执行) throw 错误;
                                }
                            }
                        }

                        当前结果.值 = await 处理器(处理前);
                        
                        事件总线.触发('处理器完成', {
                            处理器: 处理器.name || '匿名处理器',
                            输入: 处理前,
                            输出: 当前结果.值
                        });

                        // 执行处理后扩展
                        for (const [名称, 扩展] of 扩展组) {
                            if (扩展.处理后) {
                                try {
                                    await 扩展.处理后(当前结果);
                                } catch (错误) {
                                    事件总线.触发('扩展错误', {
                                        阶段: '处理后',
                                        扩展: 名称,
                                        错误
                                    });
                                    if (错误处理配置.中断执行) throw 错误;
                                }
                            }
                        }

                        当前结果.链.push({
                            处理器: 处理器.name || '匿名处理器',
                            输入: 处理前,
                            输出: 当前结果.值
                        });
                    } catch (错误) {
                        事件总线.触发('处理器错误', {
                            处理器: 处理器.name || '匿名处理器',
                            错误,
                            当前状态: 当前结果
                        });

                        // 执行错误处理扩展
                        for (const [名称, 扩展] of 扩展组) {
                            if (扩展.错误处理) {
                                try {
                                    await 扩展.错误处理(错误, 当前结果);
                                } catch (扩展错误) {
                                    事件总线.触发('扩展错误', {
                                        阶段: '错误处理',
                                        扩展: 名称,
                                        错误: 扩展错误
                                    });
                                }
                            }
                        }

                        if (错误处理配置.中断执行) {
                            return {
                                错误: 包装错误(错误, {
                                    处理器: 处理器.name,
                                    输入: 当前结果?.值 ?? '无法获取输入值'
                                }),
                                链: 当前结果.链
                            };
                        }
                    }
                }

                // 执行完成处理扩展
                for (const [名称, 扩展] of 扩展组) {
                    if (扩展.完成处理) {
                        try {
                            await 扩展.完成处理(当前结果);
                        } catch (错误) {
                            事件总线.触发('扩展错误', {
                                阶段: '完成处理',
                                扩展: 名称,
                                错误
                            });
                            if (错误处理配置.中断执行) {
                                return {
                                    错误: 包装错误(错误, {
                                        阶段: '完成处理',
                                        扩展: 名称
                                    }),
                                    链: 当前结果.链
                                };
                            }
                        }
                    }
                }

                事件总线.触发('执行完成', 当前结果);
                return 当前结果.完成处理();
            };

            // 创建链式调用接口
            const 创建链式接口 = (初始值) => {
                function 处理链(初始值) {
                    this.处理器组 = [];
                    this.初始值 = 初始值;
                    this.构造器 = 创建工具构造器(); // 只在实例化时创建一次
                }

                处理链.prototype = {
                    然后(处理器) {
                        this.处理器组.push({
                            处理器,
                            id: Symbol(处理器.name || '匿名处理器')
                        });
                        return this;
                    },

                    async 结果() {
                        if (this.处理器组.length === 0) {
                            throw new Error("请先添加处理步骤");
                        }
                        // 复用同一个构造器实例
                        this.处理器组.forEach(({处理器}) => this.构造器.添加处理器(处理器));
                        const 结果 = await this.构造器.构建().执行(this.初始值);
                        // 清理处理器，为下次使用准备
                        this.构造器 = 创建工具构造器();
                        return 结果;
                    },

                    // 提供函数式工具方法
                    映射(映射函数) {
                        return this.然后(async 值 => 映射函数(值));
                    },

                    过滤(判定函数) {
                        return this.然后(async 值 => 
                            判定函数(值) ? 值 : Promise.reject(new Error('值被过滤'))
                        );
                    },

                    分支(条件函数, 真处理器, 假处理器) {
                        return this.然后(async 值 => 
                            await 条件函数(值) ? 
                                await 真处理器(值) : 
                                await 假处理器(值)
                        );
                    }
                };

                return new 处理链(初始值);
            };

            // 创建管道接口
            const 创建管道 = (处理器配置组) => {
                // 复用工具构造器
                const 管道构造器 = 创建工具构造器();
                
                // 预先添加所有处理器
                处理器配置组.forEach(配置 => {
                    管道构造器.添加处理器(配置.处理器, 配置.选项);
                });
                
                // 构建执行器
                const 执行器 = 管道构造器.构建();
                
                // 返回优化后的管道函数
                return (输入) => 执行器.执行(输入);
            };

            return {
                执行: 执行器,
                链式: 创建链式接口,
                管道: 创建管道,
                事件总线  // 暴露事件总线供外部使用
            };
        }
    };
}; 