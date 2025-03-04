/**
 * @AI 核心工具库极限测试
 * 测试目标：
 * 1. 对象池极限
 * 2. 链式调用极限
 * 3. 并发处理极限
 * 4. 错误处理极限
 * 5. 内存泄漏测试
 * 6. 链式调用功能测试
 * 7. 管道调用功能测试
 * 8. 事件系统测试
 */

import { 创建工具构造器 } from '../src/工具箱/forCore/核心.js';

// 对象池压力测试
const 对象池压力测试 = async () => {
    console.log('测试对象池极限...');
    const 构造器 = 创建工具构造器();
    const 工具 = 构造器.构建();
    
    // 测试并发创建大量对象
    const 并发数 = 10000; // 提高到10万并发
    const 任务组 = Array(并发数).fill(0).map((_, 索引) => 
        工具.执行({ 
            数据: new Array(100).fill(索引), // 每个对象包含更多数据
            时间戳: Date.now() 
        })
    );
    
    try {
        const 结果 = await Promise.all(任务组);
        console.log(`✓ 对象池成功处理 ${并发数} 个并发请求`);
        return true;
    } catch (错误) {
        console.error('✗ 对象池压力测试失败:', 错误);
        return false;
    }
};

// 链式调用深度测试
const 链式调用深度测试 = async () => {
    console.log('测试链式调用深度...');
    const 构造器 = 创建工具构造器();
    const 工具 = 构造器.构建();
    
    const 深度 = 10000; // 增加到1万层深度
    let 链 = 工具.链式({ 计数: 0, 路径: [] });
    
    // 构建深度链，同时记录路径
    for (let i = 0; i < 深度; i++) {
        链 = 链.然后(状态 => ({
            计数: 状态.计数 + 1,
            路径: [...状态.路径, `步骤${i}`]
        }));
    }
    
    try {
        const 结果 = await 链.结果();
        if (结果.值.计数 === 深度 && 结果.值.路径.length === 深度) {
            console.log(`✓ 成功执行 ${深度} 层链式调用`);
            return true;
        }
        console.error('✗ 链式调用深度测试结果不符:', 结果);
        return false;
    } catch (错误) {
        console.error('✗ 链式调用深度测试失败:', 错误);
        return false;
    }
};

// 错误传播测试
const 错误传播测试 = async () => {
    console.log('测试错误传播系统...');
    const 构造器 = 创建工具构造器({
        错误处理: { 
            中断执行: true,
            性能模式: false
        }
    });
    
    // 添加多个处理器，测试错误在链中的传播
    构造器.添加处理器(function 第一步() {
        return { 值: 1 };
    });
    
    构造器.添加处理器(function 错误步骤() {
        throw new Error('预期错误');
    });
    
    构造器.添加处理器(function 不应执行() {
        return { 值: 3 };
    });
    
    // 添加错误处理扩展
    构造器.添加扩展('错误跟踪', {
        错误处理: async (错误, 结果) => {
            结果.元信息.错误跟踪 = {
                时间: Date.now(),
                位置: '错误处理扩展'
            };
        }
    });
    
    const 工具 = 构造器.构建();
    const 结果 = await 工具.执行({ 初始值: 0 });
    
    if (结果.错误?.错误?.message === '预期错误' && 
        结果.链?.length === 1 && // 只有第一步执行成功
        结果.错误?.上下文?.处理器 === '错误步骤') {
        console.log('✓ 错误传播测试通过');
        return true;
    }
    
    console.error('✗ 错误传播测试失败:', 结果);
    return false;
};

// 事件系统测试
const 事件系统测试 = async () => {
    console.log('测试事件系统极限...');
    const 构造器 = 创建工具构造器();
    
    // 添加一个简单的处理器，确保能触发所有事件
    构造器.添加处理器(function 测试处理器(值) {
        return 值 * 2;
    });
    
    const 工具 = 构造器.构建();
    
    // 使用 Map 记录每个事件的触发次数
    const 事件计数 = new Map();
    const 事件列表 = ['执行开始', '处理器开始', '处理器完成', '执行完成'];
    
    // 初始化计数器
    事件列表.forEach(事件名 => 事件计数.set(事件名, 0));
    
    // 注册事件监听器
    事件列表.forEach(事件名 => {
        工具.事件总线.监听(事件名, () => {
            事件计数.set(事件名, 事件计数.get(事件名) + 1);
        });
    });
    
    try {
        // 执行多次调用
        const 执行次数 = 100;
        const 任务组 = Array(执行次数).fill(0).map((_, i) => 工具.执行(i));
        await Promise.all(任务组);
        
        // 验证每个事件是否都被正确触发
        const 验证结果 = 事件列表.every(事件名 => {
            const 实际次数 = 事件计数.get(事件名);
            const 预期次数 = 执行次数; // 每次执行应该触发一次
            
            if (实际次数 !== 预期次数) {
                console.error(`事件 ${事件名} 触发次数不符:`, {
                    预期: 预期次数,
                    实际: 实际次数
                });
                return false;
            }
            return true;
        });
        
        if (验证结果) {
            console.log('✓ 事件系统测试通过');
            console.log('  事件触发统计:', Object.fromEntries(事件计数));
            return true;
        }
        
        return false;
    } catch (错误) {
        console.error('✗ 事件系统测试失败:', 错误);
        return false;
    }
};

// 异步链式调用测试
const 异步链式调用测试 = async () => {
    console.log('测试异步链式调用极限...');
    const 构造器 = 创建工具构造器();
    const 工具 = 构造器.构建();
    
    try {
        // 创建大量异步操作
        const 操作次数 = 10000;
        let 链 = 工具.链式(0);
        
        // 添加延迟函数
        const 延迟 = ms => new Promise(resolve => setTimeout(resolve, ms));
        
        // 构建复杂的异步链
        for (let i = 0; i < 操作次数; i++) {
            链 = 链.然后(async 值 => {
                await 延迟(0); // 模拟异步操作
                return 值 + 1;
            });
        }
        
        // 添加并行操作
        链 = 链.然后(async 值 => {
            const 并行任务 = Array(100).fill(0).map(async (_, 索引) => {
                await 延迟(Math.random() * 10);
                return 值 + 索引;
            });
            return Promise.all(并行任务);
        });
        
        // 添加错误恢复
        链 = 链.然后(async 值组 => {
            try {
                await 延迟(1);
                throw new Error('预期错误');
            } catch (错误) {
                return Math.max(...值组);
            }
        });
        
        const 开始时间 = performance.now();
        const 结果 = await 链.结果();
        const 执行时间 = performance.now() - 开始时间;
        
        console.log(`异步链执行时间: ${执行时间.toFixed(2)}ms`);
        
        if (结果.值 >= 操作次数 && Array.isArray(结果.链)) {
            console.log('✓ 异步链式调用测试通过');
            return true;
        }
        
        console.error('✗ 异步链式调用测试失败:', 结果);
        return false;
    } catch (错误) {
        console.error('✗ 异步链式调用测试失败:', 错误);
        return false;
    }
};

// 异步管道测试
const 异步管道测试 = async () => {
    console.log('测试异步管道极限...');
    const 构造器 = 创建工具构造器();
    
    try {
        // 创建大量异步处理器
        const 处理器数量 = 1000;
        const 处理器配置组 = Array(处理器数量).fill(0).map((_, 索引) => ({
            处理器: async (值) => {
                await new Promise(resolve => setTimeout(resolve, 0));
                return {
                    原值: 值,
                    索引,
                    时间戳: Date.now()
                };
            },
            选项: { 名称: `处理器${索引}` }
        }));
        
        const 管道 = 构造器.构建().管道(处理器配置组);
        
        // 并发执行多个管道
        const 并发数 = 100;
        const 开始时间 = performance.now();
        
        const 结果组 = await Promise.all(
            Array(并发数).fill(0).map((_, 索引) => 
                管道({ 初始值: 索引, 开始时间: Date.now() })
            )
        );
        
        const 执行时间 = performance.now() - 开始时间;
        console.log(`异步管道执行时间: ${执行时间.toFixed(2)}ms`);
        
        // 验证结果
        const 验证通过 = 结果组.every(结果 => 
            结果.链?.length === 处理器数量 && 
            结果.值?.索引 === 处理器数量 - 1
        );
        
        if (验证通过) {
            console.log('✓ 异步管道测试通过');
            return true;
        }
        
        console.error('✗ 异步管道测试失败:', 结果组[0]);
        return false;
    } catch (错误) {
        console.error('✗ 异步管道测试失败:', 错误);
        return false;
    }
};

// 运行所有测试
const 运行极限测试 = async () => {
    console.log('开始极限测试...');
    
    const 测试结果 = await Promise.all([
        对象池压力测试(),
        链式调用深度测试(),
        错误传播测试(),
        事件系统测试(),
        异步链式调用测试(),
        异步管道测试()
    ]);

    const 通过数量 = 测试结果.filter(结果 => 结果).length;
    console.log(`\n测试完成: ${通过数量}/${测试结果.length} 通过`);
};

// 执行测试
运行极限测试().catch(console.error);