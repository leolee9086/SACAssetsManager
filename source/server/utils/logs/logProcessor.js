/**
 * 日志处理器模块
 * 提供日志批处理、节流、队列管理等功能
 */

/**
 * 创建节流函数
 * 限制函数的执行频率，确保函数不会在指定时间间隔内被多次调用
 * 
 * @param {Function} 函数 - 需要节流的函数
 * @param {Number} 延迟 - 延迟时间（毫秒）
 * @returns {Function} 返回节流后的函数
 */
export const 创建节流函数 = (函数, 延迟 = 50) => {
    let 上次执行时间 = 0;
    let 队列 = [];
    let 定时器ID = null;
    let 已丢弃计数 = 0;
    
    const 处理队列 = () => {
        定时器ID = null;
        const 当前时间 = Date.now();
        
        // 如果队列过长，丢弃部分内容，保留最新的部分
        if (队列.length > 200) {
            已丢弃计数 += (队列.length - 200);
            队列 = 队列.slice(队列.length - 200);
            
            // 添加一条通知用户丢弃了部分内容的记录
            if (已丢弃计数 > 0 && 已丢弃计数 % 100 === 0) {
                队列.unshift(['warn', [`已丢弃 ${已丢弃计数} 条日志，日志量过大可能导致性能问题`]]);
            }
        }
        
        if (当前时间 - 上次执行时间 >= 延迟) {
            if (队列.length > 0) {
                // 仅处理最近的批次，避免堆积
                const 批次 = 队列.splice(0, Math.min(10, 队列.length));
                批次.forEach(args => 函数(...args));
                上次执行时间 = 当前时间;
            }
        }
        
        if (队列.length > 0) {
            定时器ID = setTimeout(处理队列, 延迟);
        }
    };
    
    return (...args) => {
        队列.push(args);
        
        // 如果队列中只有这一项且没有定时器在运行，启动处理
        if (!定时器ID) {
            定时器ID = setTimeout(处理队列, 延迟);
        }
    };
};

/**
 * 日志批处理器
 * 用于批量处理日志，减少频繁操作
 */
export class 日志批处理器 {
    constructor(处理函数, 配置 = {}) {
        this.处理函数 = 处理函数;
        this.配置 = {
            最大批次大小: 配置.最大批次大小 || 20,
            处理间隔: 配置.处理间隔 || 300,
            队列上限: 配置.队列上限 || 500,
            ...配置
        };
        
        this.队列 = [];
        this.正在处理 = false;
        this.定时器 = null;
        this.上次处理时间 = 0;
        this.丢弃计数 = 0;
    }
    
    /**
     * 添加日志到处理队列
     * @param {Object} 日志 - 日志对象
     */
    添加(日志) {
        // 如果队列过长，丢弃一些日志
        if (this.队列.length > this.配置.队列上限) {
            this.丢弃计数 += (this.队列.length - this.配置.队列上限);
            this.队列 = this.队列.slice(this.队列.length - this.配置.队列上限);
        }
        
        // 将日志添加到队列
        this.队列.push(日志);
        
        // 如果未启动处理，则启动批量处理
        if (!this.正在处理) {
            this.启动处理();
        }
    }
    
    /**
     * 启动批量处理
     */
    启动处理() {
        this.正在处理 = true;
        
        // 限制处理频率
        const 当前时间 = Date.now();
        const 距离上次处理时间 = 当前时间 - this.上次处理时间;
        
        // 如果距离上次处理时间太短，延迟执行
        if (距离上次处理时间 < this.配置.处理间隔 && this.队列.length < this.配置.队列上限 / 2) {
            clearTimeout(this.定时器);
            this.定时器 = setTimeout(() => {
                this.批量处理();
            }, this.配置.处理间隔 - 距离上次处理时间);
            return;
        }
        
        // 清除可能存在的延迟定时器
        clearTimeout(this.定时器);
        this.定时器 = null;
        this.上次处理时间 = 当前时间;
        
        // 执行批量处理
        this.批量处理();
    }
    
    /**
     * 执行批量处理
     */
    批量处理() {
        // 使用requestAnimationFrame确保UI不会卡顿
        requestAnimationFrame(async () => {
            // 提取一批日志进行处理
            const 批次日志 = this.队列.splice(0, Math.min(this.配置.最大批次大小, this.队列.length));
            
            if (批次日志.length > 0) {
                try {
                    // 调用处理函数处理这批日志
                    await this.处理函数(批次日志);
                } catch (错误) {
                    console.error('批量处理日志失败:', 错误);
                }
                
                // 如果还有待处理日志，继续批量处理
                if (this.队列.length > 0) {
                    // 使用setTimeout而不是立即递归，给UI线程留出时间
                    setTimeout(() => {
                        this.批量处理();
                    }, 50);
                } else {
                    this.正在处理 = false;
                }
            } else {
                this.正在处理 = false;
            }
        });
    }
    
    /**
     * 获取处理器状态
     * @returns {Object} 处理器状态
     */
    获取状态() {
        return {
            队列长度: this.队列.length,
            正在处理: this.正在处理,
            丢弃计数: this.丢弃计数,
            配置: { ...this.配置 }
        };
    }
    
    /**
     * 清空队列
     */
    清空() {
        this.队列 = [];
        clearTimeout(this.定时器);
        this.定时器 = null;
        this.正在处理 = false;
    }
}; 