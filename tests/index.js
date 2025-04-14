/**
 * 测试入口文件
 * 负责加载测试配置并根据配置运行相应测试
 */

const fs = require('fs');
const path = require('path');
import { 
  加载测试配置, 
  应该运行测试, 
  获取启用的测试列表, 
  格式化测试结果, 
  记录测试结果 
} from './test-utils.js';

/**
 * 运行指定目录下的测试
 * @param {string} 目录路径 - 测试目录路径
 * @param {string} 分类 - 测试分类
 * @param {Object} 测试配置 - 测试配置对象
 * @returns {Object} 测试结果对象
 */
async function 运行目录测试(目录路径, 分类, 测试配置) {
  console.log(`开始运行 ${分类} 测试...`);
  
  // 检查分类是否启用
  if (!测试配置.categories[分类]?.enabled) {
    console.log(`${分类} 测试已禁用，跳过`);
    return {
      category: 分类,
      total: 0,
      passed: 0,
      failed: 0,
      skipped: true,
      duration: 0,
      details: [],
      timestamp: Date.now()
    };
  }
  
  // 获取启用的测试列表
  const 测试文件列表 = 获取启用的测试列表(目录路径, 分类, 测试配置);
  
  if (测试文件列表.length === 0) {
    console.log(`${分类} 未找到启用的测试文件`);
    return {
      category: 分类,
      total: 0,
      passed: 0,
      failed: 0,
      skipped: false,
      duration: 0,
      details: [],
      timestamp: Date.now()
    };
  }
  
  console.log(`发现 ${测试文件列表.length} 个测试文件`);
  
  // 测试结果统计
  const 结果 = {
    category: 分类,
    total: 测试文件列表.length,
    passed: 0,
    failed: 0,
    skipped: false,
    duration: 0,
    details: [],
    timestamp: Date.now()
  };
  
  const 开始时间 = Date.now();
  
  // 依次运行每个测试
  for (const 测试文件 of 测试文件列表) {
    const 测试名称 = path.basename(测试文件);
    console.log(`运行测试: ${测试名称}`);
    
    const 测试结果 = {
      name: 测试名称,
      path: 测试文件,
      passed: false,
      duration: 0,
      error: null
    };
    
    const 测试开始时间 = Date.now();
    
    try {
      // 设置超时
      const 超时时间 = 测试配置.options.timeout || 10000;
      let 超时标记 = false;
      
      const 超时Promise = new Promise((resolve) => {
        setTimeout(() => {
          超时标记 = true;
          resolve({
            success: false,
            error: `测试超时 (${超时时间}ms)`
          });
        }, 超时时间);
      });
      
      // 加载并运行测试
      const 测试模块 = await import(测试文件);
      const 测试Promise = Promise.resolve().then(() => {
        if (typeof 测试模块.run === 'function') {
          return 测试模块.run();
        } else if (typeof 测试模块.default === 'function') {
          return 测试模块.default();
        } else {
          return { success: false, error: '测试模块缺少run或default导出函数' };
        }
      });
      
      // 等待测试完成或超时
      const 运行结果 = await Promise.race([测试Promise, 超时Promise]);
      
      测试结果.duration = Date.now() - 测试开始时间;
      
      if (超时标记) {
        测试结果.passed = false;
        测试结果.error = `测试超时 (${超时时间}ms)`;
      } else if (运行结果 && 运行结果.success === true) {
        测试结果.passed = true;
        结果.passed++;
      } else {
        测试结果.passed = false;
        测试结果.error = 运行结果?.error || '测试失败，未返回成功状态';
        结果.failed++;
      }
    } catch (错误) {
      测试结果.duration = Date.now() - 测试开始时间;
      测试结果.passed = false;
      测试结果.error = 错误.message || String(错误);
      结果.failed++;
      
      console.error(`测试 ${测试名称} 出错:`, 错误);
    }
    
    结果.details.push(测试结果);
    console.log(`测试 ${测试名称} ${测试结果.passed ? '通过' : '失败'} (${测试结果.duration}ms)`);
    
    // 如果启用了首次失败停止选项且有测试失败，则中断后续测试
    if (!测试结果.passed && 测试配置.options.stopOnFirstFailure) {
      console.log('检测到失败测试，根据配置停止后续测试');
      break;
    }
  }
  
  结果.duration = Date.now() - 开始时间;
  console.log(`${分类} 测试完成: 总共 ${结果.total} 个, 通过 ${结果.passed} 个, 失败 ${结果.failed} 个, 总耗时 ${结果.duration}ms`);
  
  return 结果;
}

/**
 * 运行所有测试
 * @param {boolean} 自动运行 - 是否为自动运行模式
 * @returns {Object} 汇总测试结果
 */
async function 运行所有测试(自动运行 = false) {
  console.log('开始运行所有测试...');
  
  const 开始时间 = Date.now();
  const 测试配置 = 加载测试配置();
  
  // 如果是自动运行模式且配置禁用了自动运行，则跳过
  if (自动运行 && !测试配置.options.autoRunOnStartup) {
    console.log('配置禁用了启动时自动运行测试，跳过');
    return null;
  }
  
  // 测试结果汇总
  const 汇总结果 = {
    total: 0,
    passed: 0,
    failed: 0,
    categories: [],
    duration: 0,
    timestamp: Date.now()
  };
  
  // 获取当前工作目录的根目录
  const baseDir = path.resolve(__dirname);
  
  // 运行基础工具测试
  const 基础测试结果 = await 运行目录测试(
    path.resolve(baseDir, 测试配置.categories.base.path), 
    'base', 
    测试配置
  );
  汇总结果.categories.push(基础测试结果);
  汇总结果.total += 基础测试结果.total;
  汇总结果.passed += 基础测试结果.passed;
  汇总结果.failed += 基础测试结果.failed;
  
  // 运行功能测试
  const 功能测试结果 = await 运行目录测试(
    path.resolve(baseDir, 测试配置.categories.feature.path), 
    'feature', 
    测试配置
  );
  汇总结果.categories.push(功能测试结果);
  汇总结果.total += 功能测试结果.total;
  汇总结果.passed += 功能测试结果.passed;
  汇总结果.failed += 功能测试结果.failed;
  
  // 运行应用场景测试
  const 应用测试结果 = await 运行目录测试(
    path.resolve(baseDir, 测试配置.categories.useAge.path), 
    'useAge', 
    测试配置
  );
  汇总结果.categories.push(应用测试结果);
  汇总结果.total += 应用测试结果.total;
  汇总结果.passed += 应用测试结果.passed;
  汇总结果.failed += 应用测试结果.failed;
  
  汇总结果.duration = Date.now() - 开始时间;
  
  // 记录测试结果
  记录测试结果(汇总结果);
  
  // 格式化并输出汇总结果
  const 格式化结果 = 格式化测试结果(汇总结果);
  console.log('\n测试汇总结果:');
  console.log(格式化结果);
  
  return 汇总结果;
}

// 导出函数
export {
  运行目录测试,
  运行所有测试
};