/**
 * 流化器功能测试
 * 测试流化器在异步流程处理中的各种功能
 */

// 从toolBox导入流化器功能
import { 流化, 懒流化 } from '../../src/toolBox/base/forChain/流化器.js';

/**
 * 基本流化功能测试
 */
async function 测试基本流化功能() {
  console.log('---- 测试基本流化功能 ----');
  
  // 测试流化普通值
  const 普通值 = 流化(42);
  const 普通值结果 = await 普通值.$$值();
  console.log('流化普通值:', 普通值结果 === 42 ? '通过' : '失败');
  
  // 测试流化对象
  const 对象 = 流化({ name: 'test', value: 123 });
  const 对象名称 = await 对象.name.$$值();
  console.log('流化对象属性访问:', 对象名称 === 'test' ? '通过' : '失败');
  
  // 测试流化数组
  const 数组 = 流化([1, 2, 3, 4, 5]);
  const 数组长度 = await 数组.length.$$值();
  console.log('流化数组属性访问:', 数组长度 === 5 ? '通过' : '失败');
  
  // 测试方法调用
  const 字符串 = 流化('hello world');
  const 大写结果 = await 字符串.toUpperCase().$$值();
  console.log('流化方法调用:', 大写结果 === 'HELLO WORLD' ? '通过' : '失败');
}

/**
 * 流化异步操作测试
 */
async function 测试流化异步操作() {
  console.log('\n---- 测试流化异步操作 ----');
  
  // 模拟异步请求
  const 模拟请求 = () => Promise.resolve({ data: { items: [{ id: 1, name: 'item1' }] } });
  
  // 测试流化异步操作
  const 请求结果 = 流化(模拟请求());
  const 项目名称 = await 请求结果.data.items[0].name.$$值();
  console.log('流化异步操作嵌套属性访问:', 项目名称 === 'item1' ? '通过' : '失败');
  
  // 测试链式异步操作
  const 用户数据 = [
    { id: 1, name: 'user1' },
    { id: 2, name: 'user2' },
    { id: 3, name: 'user3' }
  ];
  
  const 异步获取用户 = () => Promise.resolve(用户数据);
  const 过滤用户 = 流化(异步获取用户())
    .filter(用户 => 用户.id > 1)
    .map(用户 => 用户.name);
    
  const 过滤结果 = await 过滤用户.$$值();
  console.log('流化链式异步操作:', 
    过滤结果.length === 2 && 过滤结果[0] === 'user2' ? '通过' : '失败');
}

/**
 * 懒流化功能测试
 */
async function 测试懒流化功能() {
  console.log('\n---- 测试懒流化功能 ----');
  
  // 模拟耗时操作
  let 已执行计算 = false;
  const 耗时计算 = () => {
    已执行计算 = true;
    return { result: 'computed value' };
  };
  
  // 创建懒流化对象
  const 懒计算 = 懒流化(耗时计算);
  console.log('懒流化创建后未执行计算:', !已执行计算 ? '通过' : '失败');
  
  // 访问属性触发计算
  const 计算结果 = await 懒计算.result.$$值();
  console.log('懒流化访问属性后执行计算:', 已执行计算 ? '通过' : '失败');
  console.log('懒流化计算结果正确:', 计算结果 === 'computed value' ? '通过' : '失败');
}

/**
 * 错误处理测试
 */
async function 测试错误处理() {
  console.log('\n---- 测试错误处理 ----');
  
  // 测试catch捕获错误
  const 会抛出错误的操作 = 流化(Promise.reject(new Error('测试错误')));
  
  try {
    await 会抛出错误的操作.$$值();
    console.log('未捕获到错误:', '失败');
  } catch (e) {
    console.log('正确捕获到错误:', '通过');
  }
  
  // 测试catch处理错误
  let 捕获到错误 = false;
  const 错误处理结果 = await 会抛出错误的操作
    .catch(e => {
      捕获到错误 = true;
      return '错误已处理';
    })
    .$$值();
    
  console.log('链式错误处理:', 捕获到错误 && 错误处理结果 === '错误已处理' ? '通过' : '失败');
}

/**
 * 运行所有测试
 */
async function 运行测试() {
  console.log('======== 流化器功能测试 ========\n');
  
  await 测试基本流化功能();
  await 测试流化异步操作();
  await 测试懒流化功能();
  await 测试错误处理();
  
  console.log('\n======== 测试完成 ========');
}

// 导出运行测试函数
export { 运行测试 }; 