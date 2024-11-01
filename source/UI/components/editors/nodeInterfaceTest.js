import { CardInterfaceManager } from './NodeInterfaceManager.js';
import { testCases } from './NodeInterfaceManager.test.js';

class TestRunner {
  constructor() {
    this.results = {
        basic: {},
        complex: {},
        io: {},      // 添加 IO 测试结果
        total: {
          passed: 0,
          failed: 0,
          total: 0
        }
      };
    }

  recordResult(category, testName, passed, error = null, debug = null) {
    this.results[category][testName] = { passed, error, debug };
    this.results.total.total++;
    if (passed) {
      this.results.total.passed++;
    } else {
      this.results.total.failed++;
    }
  }

  async runTest(category, testId, testCase) {
    const manager = new CardInterfaceManager();
    try {
      console.log(`运行测试: ${testCase.name}`);
      const context = await testCase.setup(manager);
      const passed = await testCase.verify(context);
      
      let debug = null;
      if (!passed && testCase.debug) {
        debug = testCase.debug(context);
      }
      
      this.recordResult(category, testId, passed, null, debug);
    } catch (error) {
      this.recordResult(
        category, 
        testId, 
        false, 
        error.message
      );
    }
  }

  async runAll() {
    console.log('开始测试...\n');

    // 运行所有测试用例
    for (const [category, tests] of Object.entries(testCases)) {
      for (const [testId, testCase] of Object.entries(tests)) {
        await this.runTest(category, testId, testCase);
      }
    }

    this.printReport();
  }

  printReport() {
    console.log('\n测试报告\n' + '='.repeat(50));

    // 按类别打印结果
    for (const category of ['basic', 'complex', 'io']) {
      const categoryName = {
        'basic': '基础功能测试',
        'complex': '复杂功能测试',
        'io': 'IO操作测试'
      }[category];
      
      console.log(`\n${categoryName}:`);
      
      for (const [testId, result] of Object.entries(this.results[category])) {
        const testCase = testCases[category][testId];
        const status = result.passed ? '✓ 通过' : '✗ 失败';
        console.log(`${testCase.name}: ${status}`);
        
        if (!result.passed) {
          if (result.error) {
            throw result.error
          }
          if (result.debug) {
            console.log('  调试信息:');
            for (const [key, value] of Object.entries(result.debug)) {
              console.log(`    ${key}: ${JSON.stringify(value)}`);
            }
          }
        }
      }
    }
    // 打印总结
    console.log('\n总结:');
    console.log(`总测试数: ${this.results.total.total}`);
    console.log(`通过: ${this.results.total.passed}`);
    console.log(`失败: ${this.results.total.failed}`);
    console.log(`通过率: ${(this.results.total.passed / this.results.total.total * 100).toFixed(2)}%`);
  }
}

 //运行测试
const runner = new TestRunner();
runner.runAll().catch(console.error);