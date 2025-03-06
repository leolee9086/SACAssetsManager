// 链化器测试用例.js
import { 链化 } from '../src/工具箱/forCore/链化器.js';

// 工具函数 - 运行测试并捕获错误
const 测试运行 = async (名称, 函数) => {
  try {
    console.log(`测试：${名称}`);
    await 函数();
    console.log(`✅ 通过：${名称}`);
  } catch (错误) {
    console.error(`❌ 失败：${名称}`, 错误);
  }
};

// 工具函数 - 检查结果
const 断言 = (条件, 消息) => {
  if (!条件) throw new Error(消息 || '断言失败');
};

// 测试基本值
const 测试基本值 = async () => {
  // null 和 undefined
  let 结果 = await 链化(null).$$值();
  断言(结果 === null, 'null应该保持不变');
  
  结果 = await 链化(undefined).$$值();
  断言(结果 === undefined, 'undefined应该保持不变');
  
  // 数字
  结果 = await 链化(42).$$值();
  断言(结果 === 42, '数字应该保持不变');
  
  结果 = await 链化(0).$$值();
  断言(结果 === 0, '0应该保持不变');
  
  // 特殊数字
  结果 = await 链化(NaN).$$值();
  断言(isNaN(结果), 'NaN应该保持不变');
  
  结果 = await 链化(Infinity).$$值();
  断言(结果 === Infinity, 'Infinity应该保持不变');
  
  // 字符串
  结果 = await 链化('测试').$$值();
  断言(结果 === '测试', '字符串应该保持不变');
  
  结果 = await 链化('').$$值();
  断言(结果 === '', '空字符串应该保持不变');
  
  // 布尔值
  结果 = await 链化(true).$$值();
  断言(结果 === true, 'true应该保持不变');
  
  结果 = await 链化(false).$$值();
  断言(结果 === false, 'false应该保持不变');
};

// 测试对象和特殊对象
const 测试特殊对象 = async () => {
  // 普通对象
  let 对象 = { a: 1, b: 2 };
  let 结果 = await 链化(对象).$$值();
  断言(结果 === 对象, '对象应该保持不变');
  断言(结果.a === 1 && 结果.b === 2, '对象属性应该保持不变');
  
  // 数组
  let 数组 = [1, 2, 3];
  结果 = await 链化(数组).$$值();
  断言(Array.isArray(结果), '数组类型应该保持不变');
  断言(结果.length === 3, '数组长度应该保持不变');
  断言(结果[0] === 1 && 结果[1] === 2 && 结果[2] === 3, '数组元素应该保持不变');
  
  // Map
  let 映射 = new Map([['a', 1], ['b', 2]]);
  结果 = await 链化(映射).$$值();
  断言(结果 instanceof Map, 'Map类型应该保持不变');
  断言(结果.size === 2, 'Map大小应该保持不变');
  断言(结果.get('a') === 1 && 结果.get('b') === 2, 'Map内容应该保持不变');
  
  // Set
  let 集合 = new Set([1, 2, 3]);
  结果 = await 链化(集合).$$值();
  断言(结果 instanceof Set, 'Set类型应该保持不变');
  断言(结果.size === 3, 'Set大小应该保持不变');
  断言(结果.has(1) && 结果.has(2) && 结果.has(3), 'Set内容应该保持不变');
  
  // Date
  let 日期 = new Date();
  结果 = await 链化(日期).$$值();
  断言(结果 instanceof Date, 'Date类型应该保持不变');
  断言(结果.getTime() === 日期.getTime(), 'Date值应该保持不变');
  
  // RegExp
  let 正则 = /test/gi;
  结果 = await 链化(正则).$$值();
  断言(结果 instanceof RegExp, 'RegExp类型应该保持不变');
  断言(结果.source === 正则.source && 结果.flags === 正则.flags, 'RegExp内容应该保持不变');
  
  // Error
  let 错误 = new Error('测试错误');
  结果 = await 链化(错误).$$值();
  断言(结果 instanceof Error, 'Error类型应该保持不变');
  断言(结果.message === '测试错误', 'Error消息应该保持不变');
  
  // 函数
  let 函数 = () => 'hello';
  结果 = await 链化(函数).$$值();
  断言(typeof 结果 === 'function', '函数类型应该保持不变');
  断言(结果() === 'hello', '函数结果应该保持不变');
};

// 测试Promise相关
const 测试Promise = async () => {
  // 已解决的Promise
  let 结果 = await 链化(Promise.resolve(42)).$$值();
  断言(结果 === 42, '已解决的Promise应该正确解析');
  
  // Promise嵌套
  结果 = await 链化(Promise.resolve(Promise.resolve(42))).$$值();
  断言(结果 === 42, '嵌套Promise应该正确解析');
  
  // Promise拒绝处理
  try {
    await 链化(Promise.reject(new Error('拒绝'))).$$值();
    断言(false, '应该捕获到Promise拒绝');
  } catch (错误) {
    断言(错误.message === '拒绝', '应该保留原始错误信息');
  }
  
  // Promise的then/catch/finally
  let 计数 = 0;
  await 链化(Promise.resolve(42))
    .then(值 => { 断言(值 === 42); 计数++; })
    .finally(() => { 计数++; });
  断言(计数 === 2, 'then和finally应该被正确调用');
  
  计数 = 0;
  try {
    await 链化(Promise.reject(new Error('测试')))
      .catch(() => { 计数++; })
      .finally(() => { 计数++; });
    断言(计数 === 2, 'catch和finally应该被正确调用');
  } catch (e) {
    断言(false, '错误应该被catch处理');
  }
};

// 测试属性和方法访问
const 测试属性和方法访问 = async () => {
  // 属性获取
  let 对象 = { a: 1, b: 2 };
  let 结果 = await 链化(对象).a().$$值();
  断言(结果 === 1, '应该正确获取属性');
  
  // 链式属性获取
  对象 = { a: { b: { c: 42 } } };
  结果 = await 链化(对象).a().b().c().$$值();
  断言(结果 === 42, '应该正确进行链式属性获取');
  
  // 方法调用
  对象 = { 
    计数: 0,
    增加(数量) { this.计数 += 数量; return this; }
  };
  结果 = await 链化(对象).增加(5).计数().$$值();
  断言(结果 === 5, '应该正确调用方法和获取结果');
  
  // 数组方法
  let 数组 = [1, 2, 3, 4, 5];
  结果 = await 链化(数组).filter(x => x > 2).map(x => x * 2).$$值();
  断言(Array.isArray(结果) && 结果.length === 3, '应该正确处理数组方法');
  断言(结果[0] === 6 && 结果[1] === 8 && 结果[2] === 10, '应该正确处理数组转换');
  
  // 字符串方法
  结果 = await 链化('hello').toUpperCase().$$值();
  断言(结果 === 'HELLO', '应该正确处理字符串方法');
  
  // 错误情况 - 调用不存在的方法
  try {
    await 链化({}).不存在的方法().$$值();
    断言(false, '调用不存在的方法应该抛出错误');
  } catch (错误) {
    断言(错误.message.includes('不存在'), '错误消息应该指明方法不存在');
  }
  
  // 属性设置
  对象 = { a: 1 };
  结果 = await 链化(对象).a(42).a().$$值();
  断言(结果 === 42, '应该正确设置属性');
  断言(对象.a === 42, '原始对象应该被修改');
};

// 测试特殊情况和边界条件
const 测试特殊情况 = async () => {
  // Symbol属性
  const 符号 = Symbol('测试');
  const 对象 = { [符号]: 42 };
  const 结果 = await 链化(对象)[符号]().$$值();
  断言(结果 === 42, '应该正确处理Symbol属性');
  
  // 原型链方法
  class 父类 {
    父方法() { return 'parent'; }
  }
  class 子类 extends 父类 {
    子方法() { return 'child'; }
  }
  const 实例 = new 子类();
  let 值 = await 链化(实例).子方法().$$值();
  断言(值 === 'child', '应该正确调用自身方法');
  值 = await 链化(实例).父方法().$$值();
  断言(值 === 'parent', '应该正确调用继承的方法');
  
  // 处理this绑定
  const 上下文对象 = {
    值: 10,
    获取值() { return this.值; }
  };
  值 = await 链化(上下文对象).获取值().$$值();
  断言(值 === 10, '方法调用应该保持正确的this绑定');
  
  // 处理返回新对象的方法
  const 构建器 = {
    创建() { return { 值: 42 }; }
  };
  值 = await 链化(构建器).创建().值().$$值();
  断言(值 === 42, '应该正确处理返回新对象的方法并继续链式调用');
  
  // 方法抛出异常
  const 异常对象 = {
    抛出() { throw new Error('测试异常'); }
  };
  try {
    await 链化(异常对象).抛出().$$值();
    断言(false, '应该捕获到方法抛出的异常');
  } catch (错误) {
    断言(错误.message === '测试异常', '应该保留原始异常信息');
  }
};

// 复杂链式调用测试
const 测试复杂链式调用 = async () => {
  const 数据源 = {
    原始数据: [
      { id: 1, name: '张三', active: true },
      { id: 2, name: '李四', active: false },
      { id: 3, name: '王五', active: true }
    ],
    获取数据() {
      return this.原始数据;
    },
    过滤(条件) {
      return this.原始数据.filter(条件);
    }
  };
  
  // 复杂链式调用
  const 结果 = await 链化(数据源)
    .获取数据()
    .filter(项 => 项.active)
    .map(项 => ({ id: 项.id, name: 项.name.toUpperCase() }))
    .$$值();
    
  断言(Array.isArray(结果) && 结果.length === 2, '应该正确处理复杂链式调用');
  断言(结果[0].name === '张三'.toUpperCase(), '应该正确转换数据');
  断言(结果[1].name === '王五'.toUpperCase(), '应该正确转换数据');
};

// 测试循环引用对象
const 测试循环引用 = async () => {
  const 对象A = { 名称: 'A' };
  const 对象B = { 名称: 'B' };
  对象A.引用 = 对象B;
  对象B.引用 = 对象A;

  const 结果A = await 链化(对象A).引用().名称().$$值();
  断言(结果A === 'B', '应该能正确处理循环引用');

  const 结果B = await 链化(对象A).引用().引用().名称().$$值();
  断言(结果B === 'A', '应该能处理深层循环引用');
};

// 测试复杂Promise结构
const 测试复杂Promise = async () => {
  // 嵌套Promise
  const 多层Promise = Promise.resolve(
    Promise.resolve(
      Promise.resolve(42)
    )
  );
  const 结果1 = await 链化(多层Promise).$$值();
  断言(结果1 === 42, '应该能解析多层嵌套Promise');

  // Promise数组
  const Promise数组 = [
    Promise.resolve(1),
    Promise.resolve(2),
    Promise.resolve(3)
  ];
  const 结果2 = await 链化(Promise.resolve(Promise数组)).map(p => p * 2).$$值();
  断言(结果2.length === 3 && 结果2[0] === 2 && 结果2[1] === 4 && 结果2[2] === 6, 
       '应该能处理Promise数组并对解析后的值进行操作');

  // Promise对象
  const Promise对象 = {
    a: Promise.resolve(1),
    b: Promise.resolve(2)
  };
  const 结果3 = await 链化(Promise.resolve(Promise对象)).a().$$值();
  断言(结果3 === 1, '应该能获取Promise对象的解析后属性');

  // Promise.all 模拟
  const 所有结果 = await 链化([1, 2, 3])
    .map(x => Promise.resolve(x * 2))
    .$$值();
  断言(所有结果.length === 3 && 所有结果[0] === 2 && 所有结果[1] === 4 && 所有结果[2] === 6,
       '应该能处理类似Promise.all的操作');
};

// 测试getter/setter和属性描述符
const 测试属性描述符 = async () => {
  // 对象带getter/setter
  const 带访问器的对象 = {
    _值: 42,
    get 值() { return this._值; },
    set 值(新值) { this._值 = 新值 * 2; }
  };

  // 测试getter
  let 结果 = await 链化(带访问器的对象).值().$$值();
  断言(结果 === 42, '应该能正确调用getter');

  // 测试setter
  await 链化(带访问器的对象).值(10).$$值();
  结果 = await 链化(带访问器的对象).值().$$值();
  断言(结果 === 20, '应该能正确调用setter');

  // 测试不可写属性
  const 只读对象 = {};
  Object.defineProperty(只读对象, '只读', {
    value: 42,
    writable: false
  });

  结果 = await 链化(只读对象).只读().$$值();
  断言(结果 === 42, '应该能读取只读属性');

  try {
    await 链化(只读对象).只读(100).$$值();
    断言(await 链化(只读对象).只读().$$值() === 42, '不可写属性不应被修改');
  } catch (错误) {
    断言(错误 instanceof TypeError, '修改只读属性应该抛出TypeError');
  }
};

// 测试异步方法链和错误恢复
const 测试异步方法链和错误恢复 = async () => {
  // 创建带有异步方法的对象
  const 异步对象 = {
    异步加倍(数字) {
      return new Promise(resolve => {
        setTimeout(() => resolve(数字 * 2), 10);
      });
    },
    异步失败() {
      return new Promise((_, reject) => {
        setTimeout(() => reject(new Error('预期失败')), 10);
      });
    },
    获取值() {
      return 42;
    }
  };

  // 测试正常异步链
  const 结果1 = await 链化(异步对象)
    .异步加倍(5)
    .异步加倍()
    .$$值();
  断言(结果1 === 20, '应该能正确处理异步方法链');

  // 测试错误中间恢复
  let 失败计数 = 0;
  const 结果2 = await 链化(异步对象)
    .异步加倍(5)
    .异步失败()
    .catch(err => {
      失败计数++;
      断言(err.message === '预期失败', '应该捕获到正确的错误');
      return 100; // 恢复并传递新值
    })
    .异步加倍()
    .$$值();
  断言(结果2 === 200 && 失败计数 === 1, '应该能在链中间恢复并继续处理');

  // 测试链中间的undefined和null处理
  try {
    await 链化(异步对象).获取值().不存在方法().$$值();
    断言(false, '应该抛出错误');
  } catch (错误) {
    断言(错误.message.includes('不存在'), '应该正确处理undefined的方法调用');
  }
};

// 测试迭代器和生成器
const 测试迭代器和生成器 = async () => {
  // 创建迭代对象
  const 可迭代对象 = {
    数据: [1, 2, 3, 4, 5],
    *[Symbol.iterator]() {
      for (const 项 of this.数据) {
        yield 项 * 10;
      }
    }
  };

  // 测试迭代器操作
  const 结果数组 = [];
  for (const 值 of await 链化(可迭代对象).$$值()) {
    结果数组.push(值);
  }
  断言(结果数组.length === 5 && 结果数组[0] === 10 && 结果数组[4] === 50, 
       '应该能正确处理自定义迭代器');

  // 生成器函数
  function* 生成平方数(最大值) {
    for (let i = 1; i <= 最大值; i++) {
      yield i * i;
    }
  }

  const 生成器 = 生成平方数(5);
  const 平方数 = [];
  
  // 使用链化处理生成器
  let 生成器结果 = await 链化(生成器).next().$$值();
  while (!生成器结果.done) {
    平方数.push(生成器结果.value);
    生成器结果 = await 链化(生成器).next().$$值();
  }
  
  断言(平方数.length === 5 && 平方数[0] === 1 && 平方数[4] === 25,
       '应该能正确处理生成器');
};

// 测试并发和竞态条件
const 测试并发和竞态条件 = async () => {
  // 创建延迟函数
  const 延迟 = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // 创建计数器
  let 计数 = 0;
  const 增加计数 = async (延迟时间, 增加值) => {
    await 延迟(延迟时间);
    计数 += 增加值;
    return 计数;
  };

  // 并发执行多个链式操作
  const 任务1 = 链化(增加计数(30, 1)).$$值();
  const 任务2 = 链化(增加计数(10, 2)).$$值();
  const 任务3 = 链化(增加计数(20, 3)).$$值();

  // 等待所有操作完成
  const [结果1, 结果2, 结果3] = await Promise.all([任务1, 任务2, 任务3]);

  // 检查最终结果 - 注意顺序会影响最终值
  断言(计数 === 6, '所有操作都应该完成');
  断言(结果2 === 2 && 结果3 === 5 && 结果1 === 6, 
       '结果应该反映操作完成顺序');
};

// 测试与Promise交互的高级模式
const 测试高级Promise模式 = async () => {
  // Promise竞态
  const 延迟返回 = (值, 延迟毫秒) => 
    new Promise(resolve => setTimeout(() => resolve(值), 延迟毫秒));

  const 竞态结果 = await 链化(Promise.race([
    延迟返回('快', 10),
    延迟返回('慢', 30)
  ])).$$值();
  断言(竞态结果 === '快', 'Promise.race应该正确解析');

  // Promise链中的值转换
  const 复杂结果 = await 链化(10)
    .then(x => x * 2)
    .then(x => Promise.resolve(x + 5))
    .then(x => ({ 值: x, 平方: x * x }))
    .值()
    .$$值();
  断言(复杂结果 === 25, '应该能处理复杂的Promise值转换');

  // Promise状态转换后的方法调用
  const 对象操作 = await 链化(Promise.resolve({ 数字: 5 }))
    .then(obj => {
      obj.数字 += 10;
      return obj;
    })
    .数字()
    .$$值();
  断言(对象操作 === 15, '应该能在Promise解析后操作对象');
};

// 主测试函数
const 运行所有测试 = async () => {
  await 测试运行('基本值测试', 测试基本值);
  await 测试运行('特殊对象测试', 测试特殊对象);
  await 测试运行('Promise测试', 测试Promise);
  await 测试运行('属性和方法访问测试', 测试属性和方法访问);
  await 测试运行('特殊情况测试', 测试特殊情况);
  await 测试运行('复杂链式调用测试', 测试复杂链式调用);
  await 测试运行('循环引用测试', 测试循环引用);
  await 测试运行('复杂Promise测试', 测试复杂Promise);
  await 测试运行('属性描述符测试', 测试属性描述符);
  await 测试运行('异步方法链和错误恢复测试', 测试异步方法链和错误恢复);
  await 测试运行('迭代器和生成器测试', 测试迭代器和生成器);
  await 测试运行('并发和竞态条件测试', 测试并发和竞态条件);
  await 测试运行('高级Promise模式测试', 测试高级Promise模式);
  
  console.log('所有测试完成');
};

// 运行测试
运行所有测试();