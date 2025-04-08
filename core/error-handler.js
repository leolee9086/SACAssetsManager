/**
 * 错误处理系统
 * 负责统一管理和处理插件内的各种错误
 * 支持错误分类、记录和上报功能
 */

/**
 * 错误类型枚举
 * @type {Object}
 */
const 错误类型 = {
  系统: 'system',
  服务: 'service',
  扩展: 'extension',
  用户界面: 'ui',
  网络: 'network',
  文件: 'file',
  未知: 'unknown'
};

/**
 * 错误处理系统类
 * @class 错误处理系统
 */
class 错误处理系统 {
  /**
   * 创建错误处理系统实例
   * @param {Object} 服务集合 - 提供基础服务的对象
   */
  constructor(服务集合) {
    // 服务接口
    this.服务集合 = 服务集合;
    
    // 错误历史记录
    this.错误历史 = [];
    
    // 最大历史记录数量
    this.最大历史记录数 = 100;
    
    // 错误处理回调
    this.错误处理器 = new Map();
    
    // 初始化默认错误处理器
    this.初始化默认错误处理器();
    
    // 是否启用调试模式
    this.调试模式 = false;
  }
  
  /**
   * 初始化默认错误处理器
   * @private
   */
  初始化默认错误处理器() {
    // 默认控制台错误处理
    this.注册错误处理器('默认', (错误, 上下文) => {
      console.error('[错误处理系统]', 错误, 上下文);
    });
  }
  
  /**
   * 注册错误处理器
   * @param {string} 名称 - 错误处理器名称
   * @param {Function} 处理函数 - 错误处理函数，接收错误对象和上下文
   * @returns {Function} 注销函数
   */
  注册错误处理器(名称, 处理函数) {
    if (typeof 处理函数 !== 'function') {
      console.warn('[错误处理系统] 无效的错误处理函数', 名称);
      return () => {};
    }
    
    this.错误处理器.set(名称, 处理函数);
    
    // 返回注销函数
    return () => {
      this.错误处理器.delete(名称);
    };
  }
  
  /**
   * 注销错误处理器
   * @param {string} 名称 - 要注销的处理器名称
   */
  注销错误处理器(名称) {
    this.错误处理器.delete(名称);
  }
  
  /**
   * 处理错误
   * @param {Error|string} 错误 - 错误对象或错误消息
   * @param {Object} [上下文={}] - 错误发生的上下文信息
   * @param {string} [类型=错误类型.未知] - 错误类型
   */
  处理错误(错误, 上下文 = {}, 类型 = 错误类型.未知) {
    // 创建标准错误对象
    const 错误对象 = this.标准化错误(错误, 上下文, 类型);
    
    // 添加到错误历史
    this.添加到错误历史(错误对象);
    
    // 调用所有注册的错误处理器
    this.错误处理器.forEach(处理器 => {
      try {
        处理器(错误对象, 上下文);
      } catch (处理错误) {
        // 避免处理器本身出错引起的递归
        console.error('[错误处理系统] 错误处理器执行失败', 处理错误);
      }
    });
    
    // 尝试发送错误事件
    this.发送错误事件(错误对象);
    
    return 错误对象;
  }
  
  /**
   * 将错误添加到历史记录
   * @private
   * @param {Object} 错误对象 - 标准化的错误对象
   */
  添加到错误历史(错误对象) {
    this.错误历史.push(错误对象);
    
    // 限制历史记录长度
    if (this.错误历史.length > this.最大历史记录数) {
      this.错误历史.shift();
    }
  }
  
  /**
   * 标准化错误对象
   * @private
   * @param {Error|string} 错误 - 错误对象或消息
   * @param {Object} 上下文 - 错误上下文
   * @param {string} 类型 - 错误类型
   * @returns {Object} 标准化的错误对象
   */
  标准化错误(错误, 上下文, 类型) {
    const 是错误对象 = 错误 instanceof Error;
    
    return {
      消息: 是错误对象 ? 错误.message : String(错误),
      堆栈: 是错误对象 ? 错误.stack : new Error().stack,
      类型: 类型,
      时间戳: new Date(),
      原始错误: 是错误对象 ? 错误 : null,
      上下文: 上下文
    };
  }
  
  /**
   * 发送错误事件
   * @private
   * @param {Object} 错误对象 - 标准化的错误对象
   */
  async 发送错误事件(错误对象) {
    try {
      // 获取事件服务
      const 事件服务 = await this.安全获取服务('事件');
      if (事件服务 && typeof 事件服务.发送事件 === 'function') {
        // 获取系统错误事件名称
        const 事件名称 = await this.获取错误事件名称();
        事件服务.发送事件(事件名称, 错误对象);
      }
    } catch (发送错误) {
      console.error('[错误处理系统] 发送错误事件失败', 发送错误);
    }
  }
  
  /**
   * 安全获取服务
   * @private
   * @param {string} 服务名 - 服务名称
   * @returns {Promise<Object|null>} 请求的服务或null
   */
  async 安全获取服务(服务名) {
    try {
      if (this.服务集合 && typeof this.服务集合.获取服务 === 'function') {
        return await this.服务集合.获取服务(服务名);
      }
    } catch (错误) {
      console.error(`[错误处理系统] 获取服务 ${服务名} 失败`, 错误);
    }
    return null;
  }
  
  /**
   * 获取错误事件名称
   * @private
   * @returns {Promise<string>} 错误事件名称
   */
  async 获取错误事件名称() {
    try {
      const 插件 = await this.安全获取服务('插件');
      if (插件 && 插件.事件 && 插件.事件.系统错误) {
        return 插件.事件.系统错误;
      }
    } catch (错误) {
      // 忽略错误，使用默认值
    }
    
    // 默认错误事件名称
    return 'system-error';
  }
  
  /**
   * 获取错误历史记录
   * @param {number} [数量=10] - 返回最近的错误数量
   * @returns {Array} 错误历史记录数组
   */
  获取错误历史(数量 = 10) {
    const 有效数量 = Math.min(数量, this.错误历史.length);
    return this.错误历史.slice(-有效数量);
  }
  
  /**
   * 清空错误历史记录
   */
  清空错误历史() {
    this.错误历史 = [];
  }
  
  /**
   * 设置调试模式
   * @param {boolean} 启用 - 是否启用调试模式
   */
  设置调试模式(启用 = true) {
    this.调试模式 = !!启用;
  }
  
  /**
   * 创建指定类型的错误处理函数
   * @param {string} 类型 - 错误类型
   * @returns {Function} 特定类型的错误处理函数
   */
  创建类型错误处理器(类型) {
    return (错误, 上下文 = {}) => {
      return this.处理错误(错误, 上下文, 类型);
    };
  }
}

