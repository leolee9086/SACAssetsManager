# 高性能数据结构模块

此模块提供了几种高性能的概率数据结构，用于高效地进行元素查询、添加和删除操作，特别适合处理大规模数据集。

## 统一接口

从v1.2.0开始，我们提供了统一的概率型过滤器接口，让您可以轻松切换不同类型的过滤器而无需修改代码。

```javascript
import { createFilter, filterFactory, FilterType } from './useProbabilisticFilter';

// 方式1: 直接创建过滤器
const bloomFilter = createFilter(FilterType.BLOOM, { 
  size: 1024 * 1024, 
  hashes: 7 
});

// 方式2: 使用工厂模式创建过滤器
const cuckooFilter = filterFactory()
  .type(FilterType.CUCKOO)
  .withOptions({ capacity: 5000 })
  .build();

// 使用过滤器 - 接口统一
bloomFilter.add("元素1");
cuckooFilter.add("元素2");

bloomFilter.has("元素1"); // true
cuckooFilter.has("元素2"); // true
```

有关详细示例，请参考 `examples.js` 文件。

## 可用数据结构

### 1. 布隆过滤器 (Bloom Filter)

布隆过滤器是一种空间高效的概率数据结构，用于判断一个元素是否在集合中。它可能会有假阳性，但不会有假阴性。

#### 特点
- 极高的空间效率
- 可扩容，保持低误判率
- O(k)的添加和查询时间（k是哈希函数数量）
- 不支持完全可靠的删除操作

#### 使用方法

```javascript
import { bloomFilter, createBloomFilter } from './useBloomFilter';

// 使用共享实例
bloomFilter.add("测试元素");
const exists = bloomFilter.has("测试元素"); // true
bloomFilter.remove("测试元素"); // 不完全可靠
bloomFilter.clear();

// 配置共享实例
bloomFilter.configure({
  size: 2048 * 1024, // 位数量
  hashes: 8,         // 哈希函数数量
  maxFalsePositive: 0.001, // 最大误判率
  growthFactor: 2    // 扩容因子
});

// 或创建专用实例
const myFilter = createBloomFilter({
  size: 1024 * 1024,
  hashes: 5
});

myFilter.add({ id: 1, name: "测试" });
myFilter.has({ id: 1, name: "测试" }); // true
```

### 2. 布谷鸟过滤器 (Cuckoo Filter)

布谷鸟过滤器是布隆过滤器的一种替代品，具有更低的误判率和支持删除操作的特性。

#### 特点
- 比布隆过滤器更低的误判率
- 支持可靠的删除操作
- 常数时间的查询和添加操作
- 空间效率略低于布隆过滤器

#### 使用方法

```javascript
import { cuckooFilter, createCuckooFilter } from './useCuckooFilter';

// 使用共享实例
cuckooFilter.add("测试元素");
const exists = cuckooFilter.has("测试元素"); // true
cuckooFilter.remove("测试元素"); // 可靠的删除
cuckooFilter.clear();

// 配置共享实例
cuckooFilter.configure({
  capacity: 10000,       // 桶数量
  bucketSize: 4,         // 每个桶的槽位数
  maxKicks: 500,         // 最大踢出次数
  fingerprintLength: 2   // 指纹长度(字节)
});

// 或创建专用实例
const myFilter = createCuckooFilter({
  capacity: 5000,
  bucketSize: 8
});

myFilter.add({ id: 1, name: "测试" });
myFilter.has({ id: 1, name: "测试" }); // true
```

## 选择指南

- **需要极高空间效率，不需要删除操作**：选择布隆过滤器
- **需要支持删除，容忍略高的空间开销**：选择布谷鸟过滤器
- **需要更低的误判率**：选择布谷鸟过滤器
- **需要处理巨大的数据集**：两者都适合，但布隆过滤器可能更节省空间

## 性能考虑

- 两种过滤器的添加和查询操作都是常数时间的
- 布隆过滤器支持自动扩容，以维持低误判率
- 布谷鸟过滤器在误判率方面有更好的性能
- 对于需要频繁判断元素是否存在的场景，这两种数据结构都能大幅提高性能 