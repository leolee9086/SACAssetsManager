// 链化器测试用例.js
import { 链化 } from '../src/工具箱/forCore/链化器.js';

/**
 * 测试工具函数 - 运行测试并输出结果
 */
const 运行测试 = async (测试名称, 测试函数) => {
    console.log(`\n===== 开始测试: ${测试名称} =====`);
    try {
      console.log(`执行测试: ${测试名称}...`);
      await Promise.race([
        测试函数(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`测试超时: ${测试名称}`)), 10000)
        )
      ]);
      console.log(`✅ 测试通过: ${测试名称}`);
    } catch (错误) {
      console.error(`❌ 测试失败: ${测试名称}`);
      console.error(错误);
    }
  };
  
/**
 * 测试基础链化功能
 */
const 测试基础链化 = async () => {
    console.log('开始基础链化测试...');
    
    // 测试对象链化
    const 测试对象 = { 姓名: '张三', 年龄: 30 };
    const 链化对象 = 链化(测试对象);
    
    console.log('链化对象类型:', typeof 链化对象);
    console.log('链化对象是否有__链化标识__:', !!链化对象.__链化标识__);
    
    // 测试属性访问
    const 姓名值 =await 链化对象.姓名();
    console.log('链化对象.姓名() 返回值:', 姓名值);
    console.assert(姓名值 === '张三', '对象属性访问失败');
    
    // 测试对象方法的链式调用
    const 对象带方法 = {
      值: 10,
      增加: function(数) { this.值 += 数; return this; },
      减少: function(数) { this.值 -= 数; return this; }
    };
    
    console.log('原始对象带方法:', 对象带方法);
    const 链化方法对象 = 链化(对象带方法);
    console.log('链化方法对象类型:', typeof 链化方法对象);
    console.log('链化方法对象.增加类型:', typeof 链化方法对象.增加);
    
    try {
      const 结果 = 链化方法对象.增加(5);
      console.log('增加后结果类型:', typeof 结果);
      console.log('结果是否还有减少方法:', typeof 结果.减少);
      结果.减少(2);
    } catch (错误) {
      console.error('链式调用时出错:', 错误);
    }
    
    console.log('链式操作后的对象:',await 对象带方法);
    console.assert(await 对象带方法.值 === 15, '链式方法调用失败');
  };
  
  /**
   * 测试错误处理
   */
  const 测试错误处理 = async () => {
    console.log('开始错误处理测试...');
    
    // 测试同步错误捕获
    try {
      链化({}).不存在的方法();
      console.error('应该抛出错误但没有');
    } catch (错误) {
      console.log('正确捕获同步错误:', 错误.message);
    }
    
    // 测试异步错误捕获
    try {
      await 链化(Promise.reject(new Error('测试错误')));
      console.error('应该抛出错误但没有');
    } catch (错误) {
      console.log('正确捕获异步错误:', 错误.message);
    }
  };
  
  /**
   * 测试文本链式处理
   */
  const 测试文本链式处理 = async () => {
    console.log('开始文本链式处理测试...');
    
    // 测试对象链化
    const 测试对象 = { 姓名: '张三', 年龄: 30 };
    const 链化对象 = 链化(测试对象);
    
    // 测试属性访问后继续链式文本处理
    try {
      // 获取姓名后继续处理
      const 处理结果 =await 链化对象.姓名()
        .charAt(0)       // 获取第一个字符
        .concat('先生')   // 连接字符串
        .$$值();         // 获取最终值
        
      console.log('链式文本处理结果:', 处理结果);
      console.assert(处理结果 === '张先生', '链式文本处理失败');
      
      // 另一种处理方式
      const 处理结果2 =await 链化对象.姓名()
        .replace('张', '王')  // 替换文本
        .slice(0, 2)         // 截取前两个字符
        .toUpperCase()       // 转大写
        .$$值();             // 获取最终值
        
      console.log('链式文本处理结果2:', 处理结果2);
      console.assert(处理结果2 === '王三'.toUpperCase(), '链式文本处理2失败');
      
    } catch (错误) {
      console.error('链式文本处理测试出错:', 错误);
    }
  };
  
  /**
   * 主函数
   */
  const 主函数 = async () => {
    console.log('====== 链化器测试开始 ======');
    
    // 添加更多调试输出
    console.log('链化函数类型:', typeof 链化);
    console.log('链化函数是否存在:', !!链化);
    
    await 运行测试('基础链化功能', 测试基础链化);
    await 运行测试('错误处理', 测试错误处理);
    await 运行测试('文本链式处理', 测试文本链式处理);  // 添加新测试
    
    console.log('\n====== 链化器测试完成 ======');
  };
  
  // 设置全局未捕获异常处理
  process.on('unhandledRejection', (原因, Promise对象) => {
    console.error('未处理的Promise拒绝:', 原因);
  });
  
  // 运行测试并捕获顶层错误
  主函数().catch(错误 => {
    console.error('测试主函数执行失败:', 错误);
  });