/**
 * SACAssetsManager 测试套件入口文件
 * 适用于electron渲染环境
 * 结合使用Node文件系统API和浏览器动态导入
 */

// 使用Node.js模块处理文件
const fs = require('fs');
const path = require('path');

/**
 * 运行指定目录下的所有测试文件
 * @param {string} 目录路径 - 测试文件所在目录
 */
async function 运行目录测试(目录路径) {
  return
  console.log(`\n==== 开始运行 ${path.basename(目录路径)} 目录测试 ====\n`);
  
  try {
    // 使用Node API读取目录下的所有JS文件
    const 文件列表 = fs.readdirSync(目录路径)
      .filter(文件名 => 文件名.endsWith('.js') && 文件名 !== 'run.js' && 文件名 !== 'index.js');
    
    // 如果没有测试文件，直接返回
    if (文件列表.length === 0) {
      console.log(`${目录路径} 目录下没有测试文件`);
      return;
    }
    
    // 导入并运行每个测试文件
    for (const 文件名 of 文件列表) {
      console.log(`\n---- 运行测试: ${文件名} ----`);
      
      try {
        // 获取绝对路径
        const 文件路径 = path.resolve(目录路径, 文件名);
        // 转换为文件URL格式
        const 文件URL = `file://${文件路径.replace(/\\/g, '/')}`;
        
        // 使用浏览器的动态导入机制
        const 测试模块 = await import(文件URL);
        
        // 检查模块是否导出了运行测试函数
        if (测试模块.运行测试 && typeof 测试模块.运行测试 === 'function') {
          await 测试模块.运行测试();
        } else {
          console.log(`警告: ${文件名} 没有导出运行测试函数`);
        }
      } catch (错误) {
        console.error(`测试 ${文件名} 运行失败:`, 错误);
        console.error(错误.stack || 错误);
      }
    }
  } catch (错误) {
    console.error(`读取 ${目录路径} 目录失败:`, 错误);
    console.error(错误.stack || 错误);
  }
  
  console.log(`\n==== ${path.basename(目录路径)} 目录测试完成 ====\n`);
}

/**
 * 运行所有测试
 */
async function 运行所有测试() {
  console.log('====== SACAssetsManager 测试套件 ======');
  console.log('开始时间:', new Date().toLocaleString());
  const workspaceDir = siyuan.config.system.workspaceDir;
  const testsDir = path.join(workspaceDir, '/data/plugins/SACAssetsManager/tests');
  try {
    // 测试目录，使用当前目录作为基准
    const 当前目录 = testsDir
    const 测试目录 = [
      path.join(当前目录, 'base'),
      path.join(当前目录, 'feature'),
      path.join(当前目录, 'useAge')
    ];
    
    // 按顺序运行每个目录的测试
    for (const 目录 of 测试目录) {
      await 运行目录测试(目录);
    }
    
    console.log('\n====== 所有测试完成 ======');
    console.log('结束时间:', new Date().toLocaleString());
  } catch (错误) {
    console.error('测试运行过程中发生错误:', 错误);
    console.error(错误.stack || 错误);
  }
}

// 运行测试
运行所有测试().catch(err => {
  console.error('测试套件运行失败:', err);
  console.error(err.stack || err);
});