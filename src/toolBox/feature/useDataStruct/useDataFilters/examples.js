/**
 * 概率型过滤器使用示例
 */

import { 
  createFilter, 
  filterFactory, 
  FilterType,
  getBaseFilter
} from './useProbabilisticFilter.js';

/**
 * 演示基础过滤器使用
 */
function demoBaseFilters() {
  console.log('===== 基础过滤器使用示例 =====');
  
  // 获取布隆过滤器
  const bloomFilter = getBaseFilter(FilterType.BLOOM);
  
  // 配置布隆过滤器
  bloomFilter.configure({ 
    size: 1024 * 256,
    hashes: 5,
    maxFalsePositive: 0.01
  });
  
  // 获取布谷鸟过滤器
  const cuckooFilter = getBaseFilter(FilterType.CUCKOO);
  
  // 配置布谷鸟过滤器
  cuckooFilter.configure({
    capacity: 1000,
    bucketSize: 4,
    fingerprintLength: 2
  });
  
  // 使用布隆过滤器
  bloomFilter.add("测试数据1");
  bloomFilter.add("测试数据2");
  
  // 使用布谷鸟过滤器
  cuckooFilter.add("测试数据1");
  cuckooFilter.add("测试数据3");
  
  // 检查元素是否存在
  console.log('布隆过滤器中"测试数据1"存在:', bloomFilter.has("测试数据1")); // true
  console.log('布隆过滤器中"测试数据3"存在:', bloomFilter.has("测试数据3")); // false
  
  console.log('布谷鸟过滤器中"测试数据1"存在:', cuckooFilter.has("测试数据1")); // true
  console.log('布谷鸟过滤器中"测试数据2"存在:', cuckooFilter.has("测试数据2")); // false
  
  // 删除元素
  bloomFilter.remove("测试数据1");
  cuckooFilter.remove("测试数据1");
  
  console.log('删除后布隆过滤器中"测试数据1"存在:', bloomFilter.has("测试数据1")); // false (可能)
  console.log('删除后布谷鸟过滤器中"测试数据1"存在:', cuckooFilter.has("测试数据1")); // false
  
  // 查看统计信息
  console.log('布隆过滤器大小:', bloomFilter.getSize());
  console.log('布隆过滤器元素数量:', bloomFilter.getCount());
  console.log('布隆过滤器误判率:', bloomFilter.getFalsePositiveRate());
  
  console.log('布谷鸟过滤器大小:', cuckooFilter.getSize());
  console.log('布谷鸟过滤器元素数量:', cuckooFilter.getCount());
  console.log('布谷鸟过滤器误判率:', cuckooFilter.getFalsePositiveRate());
}

/**
 * 演示自定义实例使用
 */
function demoCustomInstances() {
  console.log('\n===== 自定义实例使用示例 =====');
  
  // 方法1: 直接创建过滤器实例
  const bloomInstance = createFilter(FilterType.BLOOM, { 
    size: 1024 * 512,
    hashes: 10,
    maxFalsePositive: 0.001
  });
  
  // 方法2: 使用工厂方法链式创建过滤器实例
  const cuckooInstance = filterFactory()
    .type(FilterType.CUCKOO)
    .withOptions({ 
      capacity: 2000, 
      bucketSize: 8,
      fingerprintLength: 3
    })
    .build();
  
  // 使用过滤器实例
  const testData = [];
  for (let i = 0; i < 1000; i++) {
    testData.push(`item-${i}`);
  }
  
  // 添加数据
  console.log('添加1000个元素到过滤器...');
  testData.forEach(item => {
    bloomInstance.add(item);
    cuckooInstance.add(item);
  });
  
  // 检查已知元素
  const knownItemsCount = 20;
  console.log(`检查${knownItemsCount}个已知元素...`);
  
  let bloomCorrect = 0;
  let cuckooCorrect = 0;
  
  for (let i = 0; i < knownItemsCount; i++) {
    if (bloomInstance.has(testData[i])) bloomCorrect++;
    if (cuckooInstance.has(testData[i])) cuckooCorrect++;
  }
  
  console.log(`布隆过滤器正确识别率: ${bloomCorrect / knownItemsCount * 100}%`);
  console.log(`布谷鸟过滤器正确识别率: ${cuckooCorrect / knownItemsCount * 100}%`);
  
  // 检查未知元素
  const unknownItemsCount = 20;
  console.log(`检查${unknownItemsCount}个未知元素...`);
  
  let bloomFalsePositive = 0;
  let cuckooFalsePositive = 0;
  
  for (let i = 0; i < unknownItemsCount; i++) {
    const unknownItem = `unknown-${i}`;
    if (bloomInstance.has(unknownItem)) bloomFalsePositive++;
    if (cuckooInstance.has(unknownItem)) cuckooFalsePositive++;
  }
  
  console.log(`布隆过滤器误判率: ${bloomFalsePositive / unknownItemsCount * 100}%`);
  console.log(`实际布隆过滤器误判率: ${bloomInstance.getFalsePositiveRate() * 100}%`);
  
  console.log(`布谷鸟过滤器误判率: ${cuckooFalsePositive / unknownItemsCount * 100}%`);
  console.log(`实际布谷鸟过滤器误判率: ${cuckooInstance.getFalsePositiveRate() * 100}%`);
  
  // 查看性能统计
  console.log('\n性能统计:');
  console.log(`布隆过滤器元素数量: ${bloomInstance.getCount()}`);
  console.log(`布隆过滤器大小: ${bloomInstance.getSize()} 位`);
  
  console.log(`布谷鸟过滤器元素数量: ${cuckooInstance.getCount()}`);
  console.log(`布谷鸟过滤器大小: ${cuckooInstance.getSize()} 桶`);
}

/**
 * 主函数
 */
function main() {
  // 运行基础过滤器示例
  demoBaseFilters();
  
  // 运行自定义实例示例
  demoCustomInstances();
}

// 执行主函数
main(); 