/**
 * 服务注册中心
 * 提供服务的注册、获取和管理功能
 */

/**
 * 创建服务注册中心
 * @returns {Object} 服务注册中心实例
 */
export function 创建服务注册中心() {
  // 服务存储
  const 已注册服务 = new Map();
  // 服务Promise存储
  const 服务Promise = new Map();
  // 服务依赖映射
  const 服务依赖 = new Map();

  return {
    /**
     * 注册服务
     * @param {string} 服务名称 服务唯一标识
     * @param {*} 服务实现 服务对象或函数
     * @param {Array<string>} 依赖项 该服务依赖的其他服务名称列表
     */
    注册服务(服务名称, 服务实现, 依赖项 = []) {
      if (已注册服务.has(服务名称)) {
        console.warn(`服务 "${服务名称}" 已存在，将被覆盖`);
      }
      
      已注册服务.set(服务名称, 服务实现);
      服务依赖.set(服务名称, 依赖项);
      
      // 如果有挂起的Promise，解析它
      if (服务Promise.has(服务名称)) {
        服务Promise.get(服务名称).resolve(服务实现);
        服务Promise.delete(服务名称);
      }
      
      console.log(`服务 "${服务名称}" 已注册`);
      return 服务实现;
    },
    
    /**
     * 获取服务
     * @param {string} 服务名称 要获取的服务名称
     * @returns {Promise<*>} 返回服务实例的Promise
     */
    async 获取服务(服务名称) {
      // 已注册的服务直接返回
      if (已注册服务.has(服务名称)) {
        return 已注册服务.get(服务名称);
      }
      
      // 如果服务未注册但已有等待的Promise，返回该Promise
      if (服务Promise.has(服务名称)) {
        return 服务Promise.get(服务名称).promise;
      }
      
      // 创建一个新的Promise来等待服务
      let resolve, reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
        
        // 设置超时
        setTimeout(() => {
          if (服务Promise.has(服务名称)) {
            服务Promise.delete(服务名称);
            rej(new Error(`获取服务 "${服务名称}" 超时`));
          }
        }, 30000); // 30秒超时
      });
      
      服务Promise.set(服务名称, { promise, resolve, reject });
      return promise;
    },
    
    /**
     * 检查服务是否已注册
     * @param {string} 服务名称 
     * @returns {boolean}
     */
    服务已注册(服务名称) {
      return 已注册服务.has(服务名称);
    },
    
    /**
     * 获取所有已注册服务的名称
     * @returns {Array<string>}
     */
    获取所有服务名称() {
      return Array.from(已注册服务.keys());
    },
    
    /**
     * 获取服务的依赖项
     * @param {string} 服务名称 
     * @returns {Array<string>}
     */
    获取服务依赖(服务名称) {
      return 服务依赖.get(服务名称) || [];
    },
    
    /**
     * 取消注册服务
     * @param {string} 服务名称 要移除的服务名称
     * @returns {boolean} 是否成功移除
     */
    取消注册服务(服务名称) {
      const 已移除 = 已注册服务.delete(服务名称);
      服务依赖.delete(服务名称);
      
      // 如果有挂起的Promise，拒绝它
      if (服务Promise.has(服务名称)) {
        服务Promise.get(服务名称).reject(new Error(`服务 "${服务名称}" 已被取消注册`));
        服务Promise.delete(服务名称);
      }
      
      if (已移除) {
        console.log(`服务 "${服务名称}" 已取消注册`);
      }
      
      return 已移除;
    }
  };
}

export default { 创建服务注册中心 }; 