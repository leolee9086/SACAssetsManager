/**
 * 日志处理器工具
 * 提供高效的日志批处理、缓冲和发送功能
 */

/**
 * 创建节流函数
 * @param {Function} 函数 - 要节流的函数
 * @param {number} 延迟 - 节流延迟时间（毫秒）
 * @returns {Function} 节流后的函数
 */
export function 创建节流函数(函数, 延迟 = 100) {
  let 上次执行时间 = 0;
  let 超时句柄 = null;
  let 待处理参数 = null;

  return function(...参数) {
    const 当前时间 = Date.now();
    const 剩余等待时间 = 延迟 - (当前时间 - 上次执行时间);

    // 清除现有的定时器
    if (超时句柄) {
      clearTimeout(超时句柄);
      超时句柄 = null;
    }

    // 存储最新的参数
    待处理参数 = 参数;

    // 如果已经可以执行，立即执行
    if (剩余等待时间 <= 0) {
      上次执行时间 = 当前时间;
      return 函数.apply(this, 待处理参数);
    }

    // 否则设置定时器
    return new Promise((resolve) => {
      超时句柄 = setTimeout(() => {
        上次执行时间 = Date.now();
        resolve(函数.apply(this, 待处理参数));
        超时句柄 = null;
      }, 剩余等待时间);
    });
  };
}

/**
 * 日志批处理器
 * 管理日志条目批处理和发送
 */
export class 日志批处理器 {
  /**
   * 创建日志批处理器
   * @param {Function} 保存函数 - 日志保存处理函数，接收批量日志条目
   * @param {Object} 配置 - 配置选项
   * @param {number} [配置.最大批量=100] - 单批最大日志条数
   * @param {number} [配置.刷新间隔=1000] - 自动刷新间隔（毫秒）
   * @param {number} [配置.缓冲区最大大小=10000] - 缓冲区最大条目数
   * @param {boolean} [配置.启用自动刷新=true] - 是否启用自动刷新
   */
  constructor(保存函数, 配置 = {}) {
    this.保存函数 = typeof 保存函数 === 'function' ? 保存函数 : () => {};
    
    // 默认配置
    const 默认配置 = {
      最大批量: 100,
      刷新间隔: 1000,
      缓冲区最大大小: 10000,
      启用自动刷新: true
    };
    
    // 合并配置
    this.配置 = { ...默认配置, ...配置 };
    
    // 初始化内部状态
    this.缓冲区 = [];
    this.正在处理 = false;
    this.刷新定时器 = null;
    this.统计 = {
      添加总数: 0,
      处理批次: 0,
      丢弃数量: 0,
      处理错误: 0
    };
    
    // 绑定方法
    this.添加日志 = this.添加日志.bind(this);
    this.刷新缓冲区 = this.刷新缓冲区.bind(this);
    this.处理批次 = this.处理批次.bind(this);
    this.停止 = this.停止.bind(this);
    
    // 节流处理
    this.节流处理 = 创建节流函数(this.处理批次, 50);
    
    // 如果启用自动刷新，启动定时器
    if (this.配置.启用自动刷新) {
      this.刷新定时器 = setInterval(this.刷新缓冲区, this.配置.刷新间隔);
    }
  }
  
  /**
   * 添加日志条目到缓冲区
   * @param {Object|Array<Object>} 日志条目 - 单个日志条目或日志条目数组
   * @returns {number} 添加后的缓冲区大小
   */
  添加日志(日志条目) {
    // 增加统计计数
    this.统计.添加总数++;
    
    // 处理数组形式的添加
    if (Array.isArray(日志条目)) {
      // 检查缓冲区大小限制
      if (this.缓冲区.length + 日志条目.length > this.配置.缓冲区最大大小) {
        // 计算可以添加的条目数量
        const 可添加数量 = Math.max(0, this.配置.缓冲区最大大小 - this.缓冲区.length);
        
        // 添加部分条目
        if (可添加数量 > 0) {
          this.缓冲区.push(...日志条目.slice(0, 可添加数量));
        }
        
        // 记录丢弃数量
        this.统计.丢弃数量 += (日志条目.length - 可添加数量);
      } else {
        // 添加所有条目
        this.缓冲区.push(...日志条目);
      }
    } else {
      // 单个条目的添加
      if (this.缓冲区.length < this.配置.缓冲区最大大小) {
        this.缓冲区.push(日志条目);
      } else {
        this.统计.丢弃数量++;
      }
    }
    
    // 如果缓冲区达到批处理阈值，触发处理
    if (this.缓冲区.length >= this.配置.最大批量) {
      this.节流处理();
    }
    
    return this.缓冲区.length;
  }
  
  /**
   * 刷新缓冲区内容
   * @returns {Promise<boolean>} 操作结果
   */
  async 刷新缓冲区() {
    // 如果缓冲区为空或正在处理中，不执行
    if (this.缓冲区.length === 0 || this.正在处理) {
      return false;
    }
    
    try {
      await this.处理批次();
      return true;
    } catch (错误) {
      console.error('刷新缓冲区失败:', 错误);
      this.统计.处理错误++;
      return false;
    }
  }
  
  /**
   * 处理一批日志条目
   * @returns {Promise<void>}
   */
  async 处理批次() {
    // 如果缓冲区为空或正在处理中，返回
    if (this.缓冲区.length === 0 || this.正在处理) {
      return;
    }
    
    // 标记为处理中
    this.正在处理 = true;
    
    try {
      // 提取当前批次的日志
      const 批次大小 = Math.min(this.缓冲区.length, this.配置.最大批量);
      const 当前批次 = this.缓冲区.splice(0, 批次大小);
      
      // 调用保存函数
      await this.保存函数(当前批次);
      
      // 更新统计
      this.统计.处理批次++;
    } catch (错误) {
      console.error('处理日志批次失败:', 错误);
      this.统计.处理错误++;
      throw 错误;
    } finally {
      // 标记处理完成
      this.正在处理 = false;
      
      // 如果缓冲区中还有内容，继续处理
      if (this.缓冲区.length > 0) {
        // 使用setTimeout避免递归调用栈溢出
        setTimeout(() => this.节流处理(), 0);
      }
    }
  }
  
  /**
   * 停止批处理器，清理资源
   * @returns {Promise<boolean>} 操作结果
   */
  async 停止() {
    // 清除自动刷新定时器
    if (this.刷新定时器) {
      clearInterval(this.刷新定时器);
      this.刷新定时器 = null;
    }
    
    // 最后一次处理缓冲区
    if (this.缓冲区.length > 0) {
      try {
        await this.刷新缓冲区();
      } catch (错误) {
        console.error('停止时刷新缓冲区失败:', 错误);
      }
    }
    
    return true;
  }
  
  /**
   * 获取处理器统计信息
   * @returns {Object} 统计信息
   */
  获取统计信息() {
    return {
      ...this.统计,
      当前缓冲区大小: this.缓冲区.length,
      正在处理: this.正在处理
    };
  }
  
  /**
   * 重置处理器统计信息
   */
  重置统计信息() {
    this.统计 = {
      添加总数: 0,
      处理批次: 0,
      丢弃数量: 0,
      处理错误: 0
    };
  }
}

/**
 * 创建日志批处理器
 * @param {Function} 保存函数 - 日志保存处理函数
 * @param {Object} 配置 - 批处理器配置
 * @returns {日志批处理器} 日志批处理器实例
 */
export function 创建日志批处理器(保存函数, 配置 = {}) {
  return new 日志批处理器(保存函数, 配置);
}

/**
 * 创建格式化处理器
 * @param {Function} 格式化函数 - 日志格式化函数
 * @param {Function} 输出函数 - 格式化后的输出函数
 * @returns {Function} 格式化处理器函数
 */
export function 创建格式化处理器(格式化函数, 输出函数) {
  return (日志条目) => {
    try {
      const 格式化结果 = 格式化函数(日志条目);
      输出函数(格式化结果);
    } catch (错误) {
      console.error('格式化日志失败:', 错误);
    }
  };
} 