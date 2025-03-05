/**
 * @AI 核心工具库极限测试
 * 测试目标：
 * 1. 数组链式操作测试
 */

import { 创建串链器 } from '../src/工具箱/forCore/串链器.js';

// 创建数组串链器
const 数组 = 创建串链器();

// 定义数组操作
数组
  .$方法()
  .长度(arr => arr.length)
  .是否为空(arr => arr.length === 0)
  .方法$()
  .添加((arr, item) => [...arr, item])
  .删除((arr, index) => [...arr.slice(0, index), ...arr.slice(index + 1)])
  .映射((arr, fn) => arr.map(fn))
  .过滤((arr, fn) => arr.filter(fn))
  .归约((arr, fn, initial) => arr.reduce(fn, initial))
  .排序((arr, compareFn) => [...arr].sort(compareFn))
  .反转(arr => [...arr].reverse())
  .去重(arr => [...new Set(arr)]);

// 测试辅助函数
const 断言相等 = (实际值, 预期值, 测试名称) => {
  const 是否通过 = JSON.stringify(实际值) === JSON.stringify(预期值);
  console.log(`${测试名称}: ${是否通过 ? '✓ 通过' : '✗ 失败'}`);
  if (!是否通过) {
    console.log('  预期值:', 预期值);
    console.log('  实际值:', 实际值);
  }
  return 是否通过;
};

// 基础数组操作测试
console.log('\n基础数组操作测试:');

const 数组测试1 = 数组([1, 2, 3, 4, 5])
  .反转()
  .映射(x => x * 2);
断言相等(数组测试1.值, [10, 8, 6, 4, 2], '反转并乘2');

const 数组测试2 = 数组([1, 2, 2, 3, 3, 4])
  .去重()
  .过滤(x => x > 2);
断言相等(数组测试2.值, [3, 4], '去重并过滤大于2');

const 数组测试3 = 数组([])
  .添加(1)
  .添加(2)
  .添加(3)
  .反转();
断言相等(数组测试3.值, [3, 2, 1], '添加元素后反转');

const 数组测试4 = 数组([1, 2, 3, 4, 5])
  .删除(2)
  .映射(x => x * 2)
  .排序((a, b) => b - a);
断言相等(数组测试4.值, [10, 8, 4, 2], '删除索引2的元素，乘2后降序排序');

// 方法测试
const 空数组测试 = 数组([]);
断言相等(空数组测试.是否为空(), true, '空数组判断');
断言相等(空数组测试.长度(), 0, '空数组长度');

// 复杂组合测试
const 复杂数组测试 = 数组([1, 2, 2, 3, 3, 4, 5, 5])
  .去重()
  .过滤(x => x % 2 === 0)
  .映射(x => x * 3)
  .排序((a, b) => a - b)
  .反转();
断言相等(复杂数组测试.值, [12, 6], '复杂组合操作');

// 高级数组操作测试
console.log('\n高级数组操作测试:');

const 嵌套数组测试 = 数组([[1, 2], [3, 4], [5, 6]])
  .映射(arr => arr.map(x => x * 2))
  .归约((acc, curr) => [...acc, ...curr], [])
  .排序((a, b) => b - a);
断言相等(嵌套数组测试.值, [12, 10, 8, 6, 4, 2], '嵌套数组处理');

const 条件测试 = 数组([1, -2, 3, -4, 5, -6, 7, -8])
  .过滤(x => Math.abs(x) > 3)
  .映射(x => x < 0 ? -x : x)
  .排序((a, b) => a - b);
断言相等(条件测试.值, [4, 5, 6, 7, 8], '条件筛选和转换');

const 累积测试 = 数组([1, 2, 3, 4, 5])
  .映射(x => x * x)
  .归约((acc, curr) => acc + curr, 0);
断言相等(累积测试.值, 55, '累积平方和');

const 组合测试 = 数组([
  { id: 1, value: 10 },
  { id: 2, value: 20 },
  { id: 3, value: 30 },
  { id: 2, value: 40 },
  { id: 1, value: 50 }
])
  .过滤(item => item.value > 20)
  .映射(item => item.value)
  .排序((a, b) => a - b);
断言相等(组合测试.值, [30, 40, 50], '对象数组处理');

// 性能测试
console.log('\n性能测试:');
const 大数组 = Array.from({ length: 10000 }, (_, i) => i);
console.time('链式操作性能');
const 性能测试 = 数组(大数组)
  .过滤(x => x % 2 === 0)
  .映射(x => x * 3)
  .去重()
  .排序((a, b) => b - a)
  .归约((acc, curr) => acc + curr, 0);
console.timeEnd('链式操作性能');

// 计算预期结果
const 预期性能结果 = Array.from({ length: 10000 }, (_, i) => i)
  .filter(x => x % 2 === 0)
  .map(x => x * 3)
  .reduce((acc, curr) => acc + curr, 0);
断言相等(性能测试.值, 预期性能结果, '大数组处理');

// 复杂数组操作测试
console.log('\n复杂数组操作测试:');

// 分组统计测试
const 分组测试数据 = [
  { 类别: 'A', 值: 10 }, { 类别: 'B', 值: 20 },
  { 类别: 'A', 值: 30 }, { 类别: 'C', 值: 40 },
  { 类别: 'B', 值: 50 }, { 类别: 'A', 值: 60 }
];

const 分组求和测试 = 数组(分组测试数据)
  .归约((acc, curr) => {
    acc[curr.类别] = (acc[curr.类别] || 0) + curr.值;
    return acc;
  }, {});
断言相等(分组求和测试.值, { A: 100, B: 70, C: 40 }, '按类别分组求和');

// 数据透视测试
const 透视测试 = 数组(分组测试数据)
  .映射(item => ({ ...item, 年份: 2024 }))
  .归约((acc, curr) => {
    if (!acc[curr.类别]) acc[curr.类别] = {};
    acc[curr.类别][curr.年份] = (acc[curr.类别][curr.年份] || 0) + curr.值;
    return acc;
  }, {});
断言相等(透视测试.值, {
  A: { 2024: 100 },
  B: { 2024: 70 },
  C: { 2024: 40 }
}, '数据透视转换');

// 区间统计测试
const 区间数据 = [15, 25, 35, 45, 55, 65, 75, 85, 95];
const 区间统计测试 = 数组(区间数据)
  .归约((acc, curr) => {
    const 区间 = Math.floor(curr / 20) * 20;
    const 区间名 = `${区间}-${区间 + 19}`;
    acc[区间名] = (acc[区间名] || 0) + 1;
    return acc;
  }, {});
断言相等(区间统计测试.值, {
  '0-19': 1,
  '20-39': 2,
  '40-59': 2,
  '60-79': 2,
  '80-99': 2
}, '数值区间统计');

// 多维数据处理测试
const 多维数据 = [
  { x: 1, y: 2, z: 3 },
  { x: 4, y: 5, z: 6 },
  { x: 7, y: 8, z: 9 }
];
const 多维变换测试 = 数组(多维数据)
  .映射(point => ({
    r: Math.sqrt(point.x ** 2 + point.y ** 2 + point.z ** 2),
    theta: Math.atan2(point.y, point.x),
    phi: Math.acos(point.z / Math.sqrt(point.x ** 2 + point.y ** 2 + point.z ** 2))
  }))
  .映射(spherical => ({
    ...spherical,
    r: Math.round(spherical.r * 100) / 100,
    theta: Math.round(spherical.theta * 100) / 100,
    phi: Math.round(spherical.phi * 100) / 100
  }));
断言相等(多维变换测试.值, [
  { r: 3.74, theta: 1.11, phi: 0.64 },
  { r: 8.77, theta: 0.90, phi: 0.73 },
  { r: 13.93, theta: 0.85, phi: 0.76 }
], '三维坐标转球坐标');

// 数据流水线测试
const 流水线测试 = 数组([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  .过滤(x => x % 2 === 0)                    // 筛选偶数
  .映射(x => x * x)                          // 求平方
  .过滤(x => x > 20)                         // 筛选大于20的值
  .映射(x => Math.sqrt(x))                   // 开平方
  .归约((acc, curr) => {                     // 计算统计信息
    acc.count = (acc.count || 0) + 1;
    acc.sum = (acc.sum || 0) + curr;
    acc.avg = acc.sum / acc.count;
    return acc;
  }, {});
断言相等(流水线测试.值, {
  count: 3,
  sum: 18,
  avg: 6
}, '数据流水线处理');

// 矩阵操作测试
const 矩阵数据 = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
const 矩阵转置测试 = 数组(矩阵数据)
  .归约((acc, curr, i) => {
    curr.forEach((val, j) => {
      if (!acc[j]) acc[j] = [];
      acc[j][i] = val;
    });
    return acc;
  }, []);
断言相等(矩阵转置测试.值, [[1, 4, 7], [2, 5, 8], [3, 6, 9]], '矩阵转置');

// 汇总测试结果
console.log('\n测试完成');