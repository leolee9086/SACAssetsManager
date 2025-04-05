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
   * 创建保持原始上下文的代理对象
   * @param {Promise} 当前Promise - 当前Promise状态
   * @param {any} 原始对象 - 原始链化对象
   * @returns {Proxy} - 代理对象
   */
  const 创建链化代理 = (当前Promise, 原始对象) => {
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
          const 新Promise = 当前Promise.then(async () => {
            try {
              // 如果尝试访问不存在的属性或方法
              if (原始对象 == null || (!(属性 in Object(原始对象)))) {
                throw new Error(`属性或方法 "${属性}" 不存在`);
              }
              
              // 获取属性或方法
              const 目标属性 = 原始对象[属性];
              
              // 如果是方法，调用它
              if (typeof 目标属性 === 'function') {
                // 在原始对象上下文中调用方法
                const 方法结果 = 目标属性.apply(原始对象, 参数);
                
                // 如果方法返回Promise，等待其完成但忽略其返回值
                if (方法结果 instanceof Promise) {
                  await 方法结果;
                }
                
                // 返回原始对象以保持链式调用
                return 原始对象;
              }
              
              // 如果有参数，则设置属性值
              if (参数.length > 0) {
                原始对象[属性] = 参数[0];
                return 原始对象;
              }
              
              // 否则返回属性值
              return 目标属性;
            } catch (错误) {
              return Promise.reject(错误);
            }
          });
          
          // 递归链化结果，保持原始对象
          return 创建链化代理(新Promise, 原始对象);
        };
      }
    });
  };
  
  /**
   * @template T
   * @typedef {{
   *   then: <R>(resolve: (value: T) => R|Promise<R>, reject?: (error: any) => any) => 链化代理<R>,
   *   catch: <R>(reject: (error: any) => R|Promise<R>) => 链化代理<T|R>,
   *   finally: (callback: () => void) => 链化代理<T>,
   *   $$值: () => Promise<T>,
   * } & (T extends object ? {
   *   [K in keyof T]: T[K] extends (...args: infer A) => infer R 
   *     ? (...args: A) => 链化代理<T>  // 保持原始对象上下文
   *     : 链化代理<T>  // 属性访问也保持原始对象
   * } : {}) & {
   *   [key: string]: (...args: any[]) => 链化代理<any>
   * }} 链化代理
   */
  
  /**
   * 链化器 - 将值转换为支持链式调用的代理（保持原始上下文）
   * @template T
   * @param {T|Promise<T>} 目标 - 要链化的目标
   * @returns {链化代理<T>} - 返回链化后的代理
   */
  export function 链化(目标) {
    // 如果已经是Promise，直接使用
    const 当前Promise = 目标 instanceof Promise ? 目标 : Promise.resolve(目标);
    
    // 创建并返回代理
    return /** @type {any} */ (创建链化代理(当前Promise, 目标));
  }






