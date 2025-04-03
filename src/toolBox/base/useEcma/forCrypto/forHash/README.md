# 哈希计算工具

此模块提供用于计算数据哈希值的纯函数，主要用于生成唯一标识符、校验和数据完整性检查。

## 功能特点

- 纯函数实现，无副作用
- 支持字符串、Buffer或对象的哈希计算
- 高性能MD5哈希实现

## 使用示例

### 计算字符串哈希

```javascript
import { computeMd5Hash } from '../../toolBox/base/useEcma/forCrypto/forHash/computeMd5Hash.js';

const hash = computeMd5Hash('hello world');
console.log(hash); // '5eb63bbbe01eeed093cb22bb8f5acdc3'
```

### 计算对象的缓存键

```javascript
import { computeCacheKey } from '../../toolBox/base/useEcma/forCrypto/forHash/computeMd5Hash.js';

const cacheKey = computeCacheKey({ id: 123, name: 'test' });
console.log(cacheKey); // 根据对象内容生成的唯一哈希值
```

### 计算二进制数据哈希

```javascript
import { computeMd5Hash } from '../../toolBox/base/useEcma/forCrypto/forHash/computeMd5Hash.js';
import fs from 'fs';

// 读取文件并计算哈希
const buffer = fs.readFileSync('file.txt');
const fileHash = computeMd5Hash(buffer);
```

## API参考

### `computeMd5Hash(data)`

计算数据的MD5哈希值。

- **参数**:
  - `data`: 字符串或Buffer数据

- **返回值**:
  - MD5哈希值的十六进制字符串表示

### `computeCacheKey(raw)`

生成对象、字符串或二进制数据的缓存键。

- **参数**:
  - `raw`: 要转换为缓存键的数据（字符串、Buffer或对象）

- **返回值**:
  - 适合用作缓存键的哈希字符串 