/**
 * 处理Promise相关方法
 * @param {string} 属性 - 属性名
 * @param {Proxy} 接收者 - 代理对象
 * @param {Promise} 当前Promise - 当前Promise对象
 * @returns {Function|null} - 处理函数或null
 */
const 处理Promise方法 = (属性, 接收者, 当前Promise) => {
  if (属性 === 'then') {
    return (解决函数, 拒绝函数) => 当前Promise.then(
      (值) => 解决函数 ? 解决函数(值) : 值,
      拒绝函数
    );
  }
  
  if (属性 === 'catch' || 属性 === 'finally') {
    return (回调函数) => {
      // 更新当前Promise并创建新的链化对象
      return 链化(当前Promise[属性](回调函数));
    };
  }
  
  // $$值 方法直接返回Promise的解析值
  if (属性 === '$$值') {
    return async () => {
      const 结果 = await 当前Promise;
      return 结果;
    };
  }
  
  return null;
};

/**
 * 创建代理对象
 * @param {Promise} 当前Promise - 当前Promise状态
 * @returns {Proxy} - 代理对象
 */
const 创建代理 = (当前Promise) => {
  return new Proxy(function(){}, {
    // 处理函数调用
    apply(目标, 上下文, 参数) {
      // 当代理被作为函数调用时，直接返回Promise的值
      return 链化(当前Promise);
    },
    
    // 处理属性访问
    get(目标, 属性, 接收者) {
      // 处理特殊Promise方法
      const Promise方法 = 处理Promise方法(属性, 接收者, 当前Promise);
      if (Promise方法) return Promise方法;
      
      // 处理所有其他属性或方法
      return function(...参数) {
        const 新Promise = 当前Promise.then(async 当前值 => {
          try {
            // 如果当前值是数组且包含Promise，先解析它们
            if (Array.isArray(当前值) && 当前值.some(项 => 项 instanceof Promise)) {
              当前值 = await Promise.all(当前值);
            }
            
            // 如果尝试访问不存在的属性或方法
            if (当前值 == null || (!(属性 in Object(当前值)))) {
              throw new Error(`属性或方法 "${属性}" 不存在`);
            }
            
            // 获取属性或方法
            const 目标属性 = 当前值[属性];
            
            // 如果是方法，调用它
            if (typeof 目标属性 === 'function') {
              // 在当前值上下文中调用方法
              const 结果 = 目标属性.apply(当前值, 参数);
              
              // 特殊处理：如果是数组方法调用且返回数组，自动解析数组中的Promise
              if (Array.isArray(结果) && Array.isArray(当前值) && 
                  ['map', 'filter', 'flatMap', 'slice', 'concat'].includes(属性)) {
                return Promise.all(结果);
              }
              
              return 结果;
            }
            
            // 如果有参数，则设置属性值
            if (参数.length > 0) {
              当前值[属性] = 参数[0];
              return 当前值;
            }
            
            // 否则返回属性值
            return 目标属性;
          } catch (错误) {
            return Promise.reject(错误);
          }
        });
        
        // 递归链化结果
        return 链化(新Promise);
      };
    }
  });
};

/**
 * 链化器 - 将任何对象或值转换为支持链式调用的代理
 * @param {any} 目标 - 要链化的目标
 * @returns {Proxy} - 返回链化后的代理
 */
export function 链化(目标) {
  // 如果已经是Promise，直接使用
  const 当前Promise = 目标 instanceof Promise ? 目标 : Promise.resolve(目标);
  
  // 创建并返回代理
  return 创建代理(当前Promise);
}

