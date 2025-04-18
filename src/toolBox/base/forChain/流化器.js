/**
 * @template T
 * @typedef {{
 *   then: <R>(resolve: (value: T) => R|Promise<R>, reject?: (error: any) => any) => 流化代理<R>,
 *   catch: <R>(reject: (error: any) => R|Promise<R>) => 流化代理<T|R>,
 *   finally: (callback: () => void) => 流化代理<T>,
 *   $$值: () => Promise<T>,
 * } & (T extends object ? {
 *   [K in keyof T]: T[K] extends (...args: infer A) => infer R 
 *     ? (...args: A) => 流化代理<Awaited<R>>
 *     : 流化代理<Awaited<T[K]>>
 * } : {}) & {
 *   [key: string]: (...args: any[]) => 流化代理<any>
 * }} 流化代理
 */

/**
 * 处理Promise相关方法
 * @template T
 * @param {string} 属性 - 属性名
 * @param {Proxy} 接收者 - 代理对象
 * @param {Promise<T>} 当前Promise - 当前Promise对象
 * @returns {Function|null} - 处理函数或null
 */
const 处理Promise方法 = (属性, 接收者, 当前Promise) => {
  // 处理Promise.prototype方法
  if (属性 === 'then') {
    return (解决函数, 拒绝函数) => {
      // 确保返回值被正确流化
      return 流化(当前Promise.then(
        解决函数 ? 值 => Promise.resolve(解决函数(值)) : 值 => 值,
        拒绝函数 ? 错误 => Promise.reject(拒绝函数(错误)) : 错误 => Promise.reject(错误)
      ));
    };
  }
  
  if (属性 === 'catch') {
    return (拒绝函数) => {
      return 流化(当前Promise.catch(
        拒绝函数 ? 错误 => Promise.resolve(拒绝函数(错误)) : 错误 => Promise.reject(错误)
      ));
    };
  }
  
  if (属性 === 'finally') {
    return (回调函数) => {
      return 流化(当前Promise.finally(回调函数));
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
 * 创建流式转换的代理对象
 * @template T
 * @param {Promise<T>} 当前Promise - 当前Promise状态
 * @returns {流化代理<T>} - 代理对象
 */
const 创建流化代理 = (当前Promise) => {
  return new Proxy(function(){}, {
    // 处理函数调用
    apply(目标, 上下文, 参数) {
      // 当代理被作为函数调用时，直接返回Promise的值
      return 流化(当前Promise);
    },
    
    // 处理属性访问
    get(目标, 属性, 接收者) {
      // 处理特殊Promise方法
      const Promise方法 = 处理Promise方法(属性, 接收者, 当前Promise);
      if (Promise方法) return Promise方法;
      
      // 创建新的Promise，用于获取属性值
      const 新Promise = 当前Promise.then(async 当前值 => {
        try {
          // 如果当前值是数组且包含Promise，先解析它们
          if (Array.isArray(当前值) && 当前值.some(项 => 项 instanceof Promise)) {
            当前值 = await Promise.all(当前值);
          }
          
          // 如果当前值是Promise，解析它
          if (当前值 instanceof Promise) {
            当前值 = await 当前值;
          }
          
          // 如果尝试访问不存在的属性或方法
          if (当前值 == null || (!(属性 in Object(当前值)))) {
            throw new Error(`属性或方法 "${属性}" 不存在`);
          }
          
          // 获取属性或方法
          return 当前值[属性];
        } catch (错误) {
          return Promise.reject(错误);
        }
      });
      
      // 返回一个新的代理，从该属性创建
      const 新代理 = 创建流化代理(新Promise);
      
      // 为新代理添加调用能力 - 处理方法调用
      return new Proxy(新代理, {
        apply(目标, 上下文, 调用参数) {
          // 创建方法调用Promise
          const 方法调用Promise = 当前Promise.then(async 当前值 => {
            try {
              // 如果当前值是数组且包含Promise，先解析它们
              if (Array.isArray(当前值) && 当前值.some(项 => 项 instanceof Promise)) {
                当前值 = await Promise.all(当前值);
              }
              
              // 如果当前值是Promise，解析它
              if (当前值 instanceof Promise) {
                当前值 = await 当前值;
              }
              
              // 如果尝试访问不存在的属性或方法
              if (当前值 == null || (!(属性 in Object(当前值)))) {
                throw new Error(`属性或方法 "${属性}" 不存在`);
              }
              
              // 获取属性或方法
              const 目标属性 = 当前值[属性];
              
              // 如果不是方法，但被当作方法调用
              if (typeof 目标属性 !== 'function') {
                throw new Error(`属性 "${属性}" 不是一个方法`);
              }
              
              // 在当前值上下文中调用方法
              const 结果 = 目标属性.apply(当前值, 调用参数);
              
              // 特殊处理：如果是数组方法调用且返回数组，自动解析数组中的Promise
              if (Array.isArray(结果) && Array.isArray(当前值) && 
                  ['map', 'filter', 'flatMap', 'slice', 'concat'].includes(属性)) {
                return Promise.all(结果);
              }
              
              return 结果;
            } catch (错误) {
              return Promise.reject(错误);
            }
          });
          
          // 递归流化结果
          return 流化(方法调用Promise);
        }
      });
    }
  });
};

/**
 * 流化器 - 将值转换为支持流式调用的代理（自动切换上下文）
 * @template T
 * @param {T|Promise<T>} 目标 - 要流化的目标
 * @returns {流化代理<T> & {
 *   [K in keyof T]: T[K] extends (...args: infer A) => infer R 
 *     ? (...args: A) => 流化代理<Awaited<R>>
 *     : 流化代理<Awaited<T[K]>>
 * }} - 返回流化后的代理
 */
export function 流化(目标) {
  // 如果已经是Promise，直接使用
  const 当前Promise = 目标 instanceof Promise ? 目标 : Promise.resolve(目标);
  
  // 创建并返回代理
  return /** @type {any} */ (创建流化代理(当前Promise));
} 

// 添加懒加载辅助函数
/**
 * 懒流化 - 延迟执行计算函数并返回流化代理
 * @template T
 * @param {() => T|Promise<T>} 计算函数 - 返回要流化值的函数(同步或异步)
 * @returns {流化代理<T>} - 返回流化后的代理对象
 * @example
 * // 懒加载数据
 * const 数据 = 懒流化(() => fetch('/big-data').json());
 * // 实际访问时才触发请求
 * 数据.items[0].name.$$值().then(console.log);
 */
export function 懒流化(计算函数) {
  // 创建一个包装Promise，延迟执行计算函数
  let 已执行 = false;
  let 缓存结果 = null;
  
  const 懒Promise = new Promise(resolve => {
    // 返回一个函数，只在第一次访问时执行
    resolve(async () => {
      if (!已执行) {
        已执行 = true;
        缓存结果 = await 计算函数();
      }
      return 缓存结果;
    });
  });
  
  // 创建一个新的代理，拦截所有属性访问和方法调用
  const 代理Promise = 懒Promise.then(执行器 => 执行器());
  
  return 流化(代理Promise);
}


