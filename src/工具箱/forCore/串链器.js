// 代数基础结构
const 代数 = {
  // 幺半群 - 处理态射的组合
  创建幺半群: (组合运算, 单位元) => ({
    组合: 组合运算,
    单位元: () => 单位元,
    结合: (a, b, c) => 组合运算(组合运算(a, b), c)
  }),

  // 范畴 - 处理态射的映射关系
  创建范畴: () => {
    const 态射表 = new Map();
    
    return {
      态射表,
      注册态射: (源, 目标, 映射) => {
        if (!态射表.has(源)) 态射表.set(源, new Map());
        态射表.get(源).set(目标, 映射);
      },
      组合态射: (f, g) => x => f(g(x)),
      恒等态射: x => x
    };
  }
};

// 串链器核心
const 创建串链器 = () => {
  // 全局态射表
  const 全局态射表 = new Map();
  
  // 创建定义接口
  const 创建定义接口 = () => {
    let 是方法状态 = false;
    
    const 定义器 = {
      $方法() {
        是方法状态 = true;
        return 定义器代理;
      },

      方法$() {
        是方法状态 = false;
        return 定义器代理;
      },

      态射(名称, 实现或对象, 匹配器) {
        if (!全局态射表.has(名称)) {
          全局态射表.set(名称, []);
        }

        const 态射定义 = {
          实现: typeof 实现或对象 === 'function' 
            ? (当前值, ...参数) => {
                // 如果是方法状态，不接受额外参数直接执行
                if (是方法状态) {
                  return 实现或对象(当前值);
                }
                // 否则正常执行带参数的态射
                return 实现或对象(当前值, ...参数);
              }
            : (当前值, ...参数) => {
                const 上下文 = {};
                Object.entries(实现或对象).forEach(([键, 值]) => {
                  上下文[键] = typeof 值 === 'function' 
                    ? 值.bind(当前值)
                    : 值;
                  
                  if (typeof 值 === 'function' && !全局态射表.has(键)) {
                    全局态射表.set(键, [{
                      实现: (ctx, ...args) => 值.apply(ctx, args),
                      匹配器: () => true,
                      直接返回: 是方法状态
                    }]);
                  }
                });
                return Object.assign({}, 当前值, 上下文);
              },
          匹配器: 匹配器 || (() => true),
          直接返回: 是方法状态
        };

        全局态射表.get(名称).push(态射定义);
        return 定义器代理;
      },

      // 自然变换
      _(目标上下文, 目标名称, 变换实现, 匹配器) {
        // 检查目标上下文是否是合法的串链器
        if (!目标上下文?.[Symbol.for('串链器标记')]) {
          throw new Error('自然变换的目标上下文必须是一个串链器');
        }

        const 自然变换名 = `_${目标名称}_`;
        this.态射(自然变换名, (源值, ...参数) => {
          const 变换结果 = 变换实现(源值, ...参数);
          return 目标上下文(变换结果);
        }, 匹配器);

        return 定义器代理;
      }
    };

    // 创建定义器代理
    const 定义器代理 = new Proxy(定义器, {
      get(目标, 属性) {
        if (属性 in 目标) {
          return 目标[属性];
        }
        return (实现, 匹配器) => 目标.态射(属性, 实现, 匹配器);
      }
    });

    return 定义器代理;
  };

  // 创建执行接口
  const 创建执行接口 = (初始值) => {
    let 当前值 = 初始值;

    const 代理执行接口 = new Proxy({}, {
      get(目标, 属性) {
        if (属性 === '值') {
          return 当前值?.值 !== undefined ? 当前值.值 : 当前值;
        }

        if (全局态射表.has(属性)) {
          return (...参数) => {
            const 态射列表 = 全局态射表.get(属性);
            const 匹配态射 = 态射列表.find(态射 => 态射.匹配器(参数));
            
            if (!匹配态射) {
              throw new Error(`未找到匹配的态射实现: ${属性}`);
            }

            const 执行结果 = 匹配态射.实现(当前值, ...参数);
            
            // 如果是直接返回的态射，直接返回结果
            if (匹配态射.直接返回) {
              return 执行结果;
            }
            
            当前值 = 执行结果;
            return 代理执行接口;
          };
        }

        if (当前值 && typeof 当前值[属性] === 'function') {
          return (...参数) => {
            当前值[属性].apply(当前值, 参数);
            return 代理执行接口;
          };
        }

        throw new Error(`未定义的态射: ${属性}`);
      }
    });

    return 代理执行接口;
  };

  // 创建主函数
  const 主函数 = (初始值) => 创建执行接口(初始值);
  
  // 添加串链器标记
  Object.defineProperty(主函数, Symbol.for('串链器标记'), {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false
  });

  const 定义接口 = 创建定义接口();
  
  // 返回代理包装的主函数
  return new Proxy(主函数, {
    get(目标, 属性) {
      // 确保标记可以被访问
      if (属性 === Symbol.for('串链器标记')) {
        return true;
      }
      if (属性 === 'prototype' || 属性 === 'length' || 属性 === 'name') {
        return 目标[属性];
      }
      return 定义接口[属性];
    }
  });
};

export { 创建串链器 };
