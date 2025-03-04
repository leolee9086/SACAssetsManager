/**
 * 服务初始化器
 * 负责管理服务的初始化流程和依赖关系
 */
import { 创建服务注册中心 } from './service-registry.js';

/**
 * 创建服务初始化器
 * @returns {Object} 服务初始化器实例
 */
export function 创建服务初始化器() {
  // 创建服务注册中心实例
  const 服务注册中心 = 创建服务注册中心();
  
  // 初始化任务队列
  const 初始化任务 = new Map();
  
  // 已初始化的服务
  const 已初始化服务 = new Set();
  
  // 初始化中的服务
  const 初始化中服务 = new Set();
  
  return {
    /**
     * 获取服务注册中心
     * @returns {Object} 服务注册中心实例
     */
    获取服务注册中心() {
      return 服务注册中心;
    },
    
    /**
     * 注册初始化任务
     * @param {string} 服务名称 服务唯一标识
     * @param {Function} 初始化函数 返回服务实例的函数
     * @param {Array<string>} 依赖项 初始化时需要的依赖服务
     */
    注册初始化任务(服务名称, 初始化函数, 依赖项 = []) {
      初始化任务.set(服务名称, { 初始化函数, 依赖项 });
      return this;
    },
    
    /**
     * 初始化指定服务
     * @param {string} 服务名称 要初始化的服务名称
     * @returns {Promise<*>} 初始化后的服务实例
     */
    async 初始化服务(服务名称) {
      // 服务已初始化，直接返回
      if (已初始化服务.has(服务名称)) {
        return 服务注册中心.获取服务(服务名称);
      }
      
      // 服务正在初始化中，返回等待结果
      if (初始化中服务.has(服务名称)) {
        return 服务注册中心.获取服务(服务名称);
      }
      
      // 检查是否存在初始化任务
      if (!初始化任务.has(服务名称)) {
        throw new Error(`服务 "${服务名称}" 未注册初始化任务`);
      }
      
      // 标记为初始化中
      初始化中服务.add(服务名称);
      
      try {
        const { 初始化函数, 依赖项 } = 初始化任务.get(服务名称);
        
        // 初始化依赖项
        const 依赖服务 = {};
        for (const 依赖名称 of 依赖项) {
          依赖服务[依赖名称] = await this.初始化服务(依赖名称);
        }
        
        // 执行初始化函数
        const 服务实例 = await 初始化函数(依赖服务, 服务注册中心);
        
        // 注册服务
        服务注册中心.注册服务(服务名称, 服务实例, 依赖项);
        
        // 标记为已初始化
        已初始化服务.add(服务名称);
        初始化中服务.delete(服务名称);
        
        console.log(`服务 "${服务名称}" 初始化完成`);
        return 服务实例;
      } catch (错误) {
        初始化中服务.delete(服务名称);
        console.error(`服务 "${服务名称}" 初始化失败:`, 错误);
        throw 错误;
      }
    },
    
    /**
     * 初始化多个服务
     * @param {Array<string>} 服务名称列表 要初始化的服务名称列表
     * @returns {Promise<Object>} 初始化后的服务映射
     */
    async 初始化多个服务(服务名称列表) {
      const 结果 = {};
      for (const 服务名称 of 服务名称列表) {
        结果[服务名称] = await this.初始化服务(服务名称);
      }
      return 结果;
    },
    
    /**
     * 初始化所有已注册的服务
     * @returns {Promise<Object>} 初始化后的服务映射
     */
    async 初始化所有服务() {
      return this.初始化多个服务(Array.from(初始化任务.keys()));
    },
    
    /**
     * 服务是否已初始化
     * @param {string} 服务名称 
     * @returns {boolean}
     */
    服务已初始化(服务名称) {
      return 已初始化服务.has(服务名称);
    },
    
    /**
     * 获取所有已初始化的服务名称
     * @returns {Array<string>}
     */
    获取已初始化服务名称() {
      return Array.from(已初始化服务);
    },
    
    /**
     * 获取初始化任务信息
     * @param {string} 服务名称 
     * @returns {Object|null} 初始化任务信息
     */
    获取初始化任务信息(服务名称) {
      return 初始化任务.get(服务名称) || null;
    }
  };
}

export default { 创建服务初始化器 };