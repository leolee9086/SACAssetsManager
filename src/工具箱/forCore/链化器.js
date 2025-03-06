/**
 * 检查值是否是基本类型或null
 * @param {any} 值 - 要检查的值
 * @returns {boolean} - 是否为简单值
 */
const 是简单值 = (值) => 值 === null || (typeof 值 !== 'object' && typeof 值 !== 'function');

/**
 * 递归链化任何结果
 * @param {any} 结果 - 要链化的结果
 * @returns {any} - 链化后的结果
 */
const 链化结果 = (结果) => {
  // 不再直接返回简单值，而是为所有结果创建链化代理
  return 链化(结果);
};

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
      当前Promise = 当前Promise[属性](回调函数);
      return 接收者;
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
 * 检查一个值是否有某个方法或属性
 * @param {any} 值 - 要检查的值
 * @param {string} 属性名 - 属性名
 * @returns {boolean} - 是否存在方法或属性
 */
const 有属性或方法 = (值, 属性名) => {
  if (值 == null) return false;
  
  const 包装对象 = Object(值);
  
  // 检查对象自身
  if (Object.hasOwn(包装对象, 属性名)) {
    return true;
  }
  
  // 检查原型链
  const 原型 = Object.getPrototypeOf(包装对象);
  return 属性名 in 原型;
};

/**
 * 检查一个值是否有某个方法
 * @param {any} 值 - 要检查的值
 * @param {string} 方法名 - 方法名
 * @returns {boolean} - 是否存在方法
 */
const 有方法 = (值, 方法名) => {
  if (值 == null) return false;
  
  // 先检查对象自身是否有该方法
  const 包装对象 = Object(值);
  if (Object.hasOwn(包装对象, 方法名) && typeof 包装对象[方法名] === 'function') {
    return true;
  }
  
  // 如果对象自身没有该方法，则检查原型链
  const 原型 = Object.getPrototypeOf(包装对象);
  return 方法名 in 原型 && typeof 原型[方法名] === 'function';
};

/**
 * 处理属性操作
 * @param {Object} 目标对象 - 目标对象
 * @param {string} 属性 - 属性名
 * @param {Proxy} 接收者 - 代理对象
 * @param {Promise} 当前Promise - 当前Promise对象
 * @returns {Function} - 属性操作函数
 */
const 处理属性操作 = (目标对象, 属性, 接收者, 当前Promise) => {
  return (...参数) => {
    // 获取当前Promise的值，决定如何处理属性
    const 新Promise = 当前Promise.then(当前值 => {
      try {
        // 检查当前值是否有这个方法
        if (当前值 !== 目标对象 && 有方法(当前值, 属性)) {
          // 当前值有这个方法，按方法调用处理
          if (参数.length > 0) {
            const 包装当前值 = Object(当前值);
            
            // 先检查对象自身是否有该方法
            if (Object.hasOwn(包装当前值, 属性) && typeof 包装当前值[属性] === 'function') {
              return 包装当前值[属性].apply(包装当前值, 参数);
            }
            
            // 如果对象自身没有该方法，则使用原型链上的方法
            const 原型 = Object.getPrototypeOf(包装当前值);
            if (属性 in 原型 && typeof 原型[属性] === 'function') {
              return 原型[属性].apply(当前值, 参数);
            }
          }
        }
        
        // 常规属性处理
        if (参数.length > 0) {
          // 有参数时设置属性值
          const 实际目标 = 当前值 === 目标对象 ? 当前值 : 目标对象;
          Reflect.set(实际目标, 属性, 参数[0], 接收者);
          return 实际目标;
        } else {
          // 无参数时获取属性值
          const 实际目标 = 当前值 === 目标对象 ? 当前值 : 目标对象;
          
          // 检查属性是否存在
          if (!有属性或方法(实际目标, 属性)) {
            throw new Error(`属性或方法 "${属性}" 不存在`);
          }
          
          return Reflect.get(实际目标, 属性, 实际目标);
        }
      } catch (错误) {
        return Promise.reject(错误);
      }
    });
    
    return 链化(新Promise);
  };
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
        const 新Promise = 当前Promise.then(当前值 => {
          try {
            // 如果尝试访问不存在的属性或方法
            if (当前值 == null || (!(属性 in Object(当前值)))) {
              throw new Error(`属性或方法 "${属性}" 不存在`);
            }
            
            // 获取属性或方法
            const 目标属性 = 当前值[属性];
            
            // 如果是方法，调用它
            if (typeof 目标属性 === 'function') {
              // 在当前值上下文中调用方法
              return 目标属性.apply(当前值, 参数);
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

// 简单的复现测试
function 复现测试() {
    const 原始字符串 = "张三";
    console.log("原始字符串:", 原始字符串);
    
    // 直接调用方法
    const 第一个字符 = 原始字符串.charAt(0);
    console.log("第一个字符:", 第一个字符);
    
    const 拼接结果 = 第一个字符.concat("先生");
    console.log("拼接结果:", 拼接结果);
    
    // 使用链化器
    const 链化字符串 = 链化(原始字符串);
    
    async function 测试链化() {
      const 链化处理结果 = await 链化字符串
        .charAt(0)
        .concat("先生")
        .$$值();
      
      console.log("链化处理结果:", 链化处理结果);
      console.assert(链化处理结果 === "张先生", "链化处理失败");
    }
    
    测试链化();
  }
  复现测试();