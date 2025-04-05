# 概率型数据结构模块

该目录包含一系列概率型数据结构的函数式实现，主要用于高效的数据查询和过滤。

## 统一接口 (useProbabilisticFilter.js)

该模块提供了统一的概率型过滤器接口，让您可以轻松切换和使用不同类型的过滤器，而无需更改代码。

### 使用示例

```javascript
// 导入统一接口
import { createFilter, filterFactory, FilterType } from './useProbabilisticFilter.js';

// 方法1: 直接创建过滤器
const bloomFilter = createFilter(FilterType.BLOOM, { 
  size: 1024 * 1024,
  hashes: 10 
});

// 方法2: 使用工厂方法创建过滤器
const cuckooFilter = filterFactory()
  .type(FilterType.CUCKOO)
  .withOptions({ capacity: 2000, bucketSize: 8 })
  .build();

// 使用过滤器
bloomFilter.add("测试元素1");
cuckooFilter.add("测试元素2");

console.log(bloomFilter.has("测试元素1")); // true
console.log(cuckooFilter.has("测试元素2")); // true
```

### 统一API

所有过滤器通过统一接口提供以下方法：

- `add(item)`: 添加元素到过滤器
- `has(item)`: 检查元素是否在过滤器中
- `remove(item)`: 从过滤器中删除元素
- `clear()`: 清空过滤器
- `getSize()`: 获取过滤器大小
- `getCount()`: 获取已添加元素数量
- `getFalsePositiveRate()`: 获取当前误判率

### 过滤器类型

目前支持的过滤器类型：

- `FilterType.BLOOM`: 布隆过滤器
- `FilterType.CUCKOO`: 布谷鸟过滤器

## Cuckoo过滤器 (useCuckooFilter.js)

Cuckoo过滤器是一种空间效率高的概率数据结构，可用于成员资格测试（检查元素是否在集合中）。与布隆过滤器相比，它支持删除元素并且具有更好的性能特性。

### 主要特点

- 低假阳性率
- 支持动态添加和删除
- 空间利用率高
- 查询性能好

### 函数式API设计

模块采用了完全函数式的设计，避免使用类，通过闭包和纯函数实现功能。主要导出：

```javascript
// 使用默认配置的过滤器
import { cuckooFilter } from './useCuckooFilter.js';

// 或创建自定义实例
import { createCuckooFilter } from './useCuckooFilter.js';
const myFilter = createCuckooFilter({
  capacity: 2000,
  bucketSize: 4,
  maxKicks: 500,
  fingerprintLength: 2
});
```

### 核心功能

- `add(item)`: 添加元素到过滤器
- `has(item)`: 检查元素是否在过滤器中
- `remove(item)`: 从过滤器中删除元素
- `clear()`: 清空过滤器
- `configure(options)`: 配置默认过滤器

### 实现优化

1. 使用位运算来提高哈希计算效率
2. 采用闭包而非类，减少原型链查找
3. 顶层函数减少嵌套，提高可读性和性能
4. 将公共逻辑抽取为独立纯函数

## 布隆过滤器 (useBloomFilter.js)

布隆过滤器是一种空间高效的概率数据结构，用于快速判断元素是否在集合中。它可能会产生误判（假阳性），但不会漏判（假阴性），这意味着它能确定地说明某个元素不在集合中，但不能确定某个元素一定在集合中。

### 主要特点

- 空间效率极高
- 查询时间复杂度为O(k)，其中k为哈希函数数量
- 支持动态扩容，自动保持低误判率
- 不支持准确删除（实现中提供了删除功能，但可能影响其他元素）

### 函数式API设计

布隆过滤器也采用了函数式设计，提供两种使用方式：

```javascript
// 使用默认配置的过滤器
import { bloomFilter } from './useBloomFilter.js';

// 或创建自定义实例
import { createBloomFilter } from './useBloomFilter.js';
const myFilter = createBloomFilter({
  size: 2 * 1024 * 1024,  // 初始大小（比特数）
  hashes: 10,             // 哈希函数数量
  maxFalsePositive: 0.001, // 最大误判率
  growthFactor: 2         // 扩容因子
});
```

### 核心功能

- `add(item)`: 添加元素到过滤器
- `has(item)`: 检查元素是否在过滤器中
- `remove(item)`: 从过滤器中移除元素（非标准操作，可能影响其他元素）
- `clear()`: 清空过滤器
- `configure(options)`: 配置默认过滤器
- `getSize()`: 获取过滤器大小
- `getCount()`: 获取已添加元素数量
- `getFalsePositiveRate()`: 获取当前误判率

### 实现优化

1. 使用位操作实现位数组访问，节省空间
2. 动态扩容机制，根据误判率自动调整过滤器大小
3. 使用多个哈希函数增加准确性
4. 提取纯函数用于计算哈希值和误判率

### 自动扩容机制

布隆过滤器实现了自动扩容功能，当误判率超过设定阈值时，过滤器会增加位数组大小并添加新的哈希函数，保持误判率在可接受范围内。

## 性能考量

这些数据结构在处理大量数据时特别有用，可以显著减少内存使用并提高查询速度。在选择时考虑：

- 如果需要删除操作，选择Cuckoo过滤器
- 如果只需查询并且极度关注空间效率，可以考虑布隆过滤器（每个元素约8-10位）
- 布隆过滤器在极低误判率要求下空间效率更高
- Cuckoo过滤器在中等误判率要求下查询速度更快
- 在大多数情况下，Cuckoo过滤器提供更好的整体性能和API 

# 数据结构优化记录

## Cuckoo Filter 和 Bloom Filter 优化

这两个数据结构都是用于高效检查元素是否存在的概率数据结构，它们在处理大规模数据集时特别有用。

### Cuckoo Filter 优化

1. **性能优化**：
   - 替换了低效的 `includes()` 和 `indexOf()` 方法，改用直接循环查找，显著提高了查询和删除操作的性能
   - 对于桶中的元素搜索，时间复杂度从 O(n) 改进为 O(1)~O(bucketSize)，bucketSize通常很小(默认为4)

2. **安全性增强**：
   - 增加了对空值(null)和未定义值(undefined)的检查，防止这些值导致运行时错误
   - 在核心函数中添加了输入验证，使API更加健壮

3. **代码风格改进**：
   - 增加了更多的内联函数，如`findInBucket`，提高了代码可读性和可维护性
   - 重构了部分代码以符合函数式编程风格

### Bloom Filter 优化

1. **哈希算法改进**：
   - 使用了更好的哈希算法 (FNV-1a变种)，提高了散列的均匀性
   - 使用质数作为哈希种子，减少了哈希冲突
   - 改进了哈希值生成方式，从简单的取模改为乘法哈希

2. **扩容机制修复**：
   - 修复了扩容时数据丢失的问题，新的实现在扩容后保留了原始数据
   - 通过复制旧过滤器的位图到新过滤器，避免了完全重置，尽管这略微增加了误判率，但保留了数据

3. **鲁棒性增强**：
   - 增加了对空值和未定义值的处理
   - 优化了resize函数，使其更加安全可靠

## 性能对比

| 操作 | 优化前 | 优化后 |
|------|-------|-------|
| Cuckoo Filter 查询 | O(n) | O(1)~O(4) |
| Cuckoo Filter 删除 | O(n) | O(1)~O(4) |
| Bloom Filter 哈希计算 | 较差分布 | 更均匀分布 |
| Bloom Filter 扩容 | 数据丢失 | 数据保留 |

## 使用建议

- Cuckoo Filter 比 Bloom Filter 具有更低的假阳性率，同时支持删除操作
- Bloom Filter 在空间效率方面略优于Cuckoo Filter
- 对于需要插入后进行大量查询的场景，这两种结构都很合适
- 如果需要支持删除操作，推荐使用Cuckoo Filter 