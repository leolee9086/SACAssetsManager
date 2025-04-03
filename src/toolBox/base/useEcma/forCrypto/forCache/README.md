# 缓存工具模块

此模块提供了高性能、函数式风格的缓存管理工具，用于在内存中存储和检索数据，同时支持持久化存储。

## 主要功能

### 缓存提供者

- 创建内存缓存对象，支持过期时间
- 支持持久化存储和恢复
- 支持缓存大小限制和自动清理
- 支持全局缓存实例共享

### 缓存适配器

- 提供JSON文件持久化适配器
- 可扩展以支持其他存储方式

## 使用示例

### 基本用法

```javascript
import { createCacheProvider } from '../../toolBox/base/useEcma/forCrypto/forCache/useCacheProvider.js';

// 创建内存缓存
const cache = createCacheProvider('myCache');

// 设置缓存项，30秒后过期
cache.set('key1', { data: 'value1' }, 30000);

// 获取缓存项
const value = cache.get('key1');  // { data: 'value1' }

// 删除缓存项
cache.delete('key1');
```

### 使用持久化存储

```javascript
import { createJsonCacheAdapter, createCacheProvider } from '../../toolBox/base/useEcma/forCrypto/forCache/useCacheProvider.js';

// 创建JSON文件适配器
const adapter = createJsonCacheAdapter('./cache');

// 创建带持久化功能的缓存
const cache = createCacheProvider('myCache', adapter);

// 设置缓存项
cache.set('key1', { data: 'value1' });

// 持久化到文件
cache.persist();
```

### 使用全局缓存

```javascript
import { createGlobalCache } from '../../toolBox/base/useEcma/forCrypto/forCache/useCacheProvider.js';

// 获取或创建全局缓存实例
const cache1 = createGlobalCache('sharedCache');
const cache2 = createGlobalCache('sharedCache');

// cache1和cache2引用同一个缓存实例
cache1.set('key1', 'value1');
console.log(cache2.get('key1'));  // 'value1'
```

## API参考

### `createCacheProvider(name, adapter)`

创建新的缓存提供者实例。

- `name`: 缓存名称
- `adapter`: 可选的持久化适配器

返回包含以下方法的缓存对象：

- `getSize()`: 获取缓存项数量
- `set(key, value, timeout)`: 设置缓存项，可选过期时间
- `get(key)`: 获取缓存项
- `getRaw(key)`: 获取原始缓存项（包含元数据）
- `delete(key)`: 删除缓存项
- `clear()`: 清空缓存
- `filterSync(filter)`: 同步过滤缓存项
- `filter(filter, signal)`: 异步过滤缓存项
- `sizeTo(maxSize)`: 调整缓存大小
- `persist()`: 持久化缓存
- `getStats()`: 获取缓存统计信息

### `createJsonCacheAdapter(...path)`

创建基于JSON文件的缓存适配器。

- `path`: 缓存文件路径部分

### `createGlobalCache(name, adapter)`

创建或获取全局缓存实例。

- `name`: 缓存名称
- `adapter`: 可选的持久化适配器 