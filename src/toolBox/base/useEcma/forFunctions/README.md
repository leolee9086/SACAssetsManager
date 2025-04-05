# 函数工具集 (forFunctions)

本目录包含各种函数式编程工具，提供高阶函数、函数组合、Monad等函数式编程概念的实现。

## 内容

- `forCurrying.js` - 柯里化功能实现
- `forDebounce.js` - 函数防抖实现
- `forTaskQueue.js` - 异步任务队列
- `forMonad.js` - Freer Monad实现

## Freer Monad

### 什么是Freer Monad？

Freer Monad是Free Monad的一种轻量级变体，它提供了一种更灵活的方式来处理副作用，同时保持代码的纯函数特性。与传统的Free Monad相比，Freer Monad将效果（Effect）与解释器（Interpreter）完全分离，这使得我们可以：

1. 定义纯函数的计算和效果描述
2. 将效果的具体实现延迟到运行时
3. 为同一种效果提供多种不同的解释器

### 核心概念

- **纯值（Pure）**：没有副作用的值
- **效果（Effect）**：描述副作用的对象
- **解释器（Interpreter）**：执行效果的函数
- **计算（Computation）**：由纯值和效果组成的序列

### 使用示例

#### 基本使用

```javascript
import { of, chain, runFreer, createEffectDSL, EffectTypes, consoleLogInterpreter } from './forMonad.js';

// 创建一个简单的DSL
const { LOG } = createEffectDSL(EffectTypes);

// 构建一个计算
const computation = chain(
  of(5),
  (x) => chain(
    LOG(`值是: ${x}`),
    () => of(x * 2)
  )
);

// 运行计算
const result = runFreer(computation, consoleLogInterpreter);
console.log(`结果是: ${result}`); // 输出: 结果是: 10
```

#### 状态管理

```javascript
import { of, chain, runFreer, createEffectDSL, EffectTypes, createStateInterpreter } from './forMonad.js';

// 创建DSL
const { GET_STATE, SET_STATE } = createEffectDSL(EffectTypes);

// 创建状态解释器
const stateInterpreter = createStateInterpreter({ count: 0 });

// 构建状态计算
const statefulComputation = chain(
  GET_STATE('count'),
  (count) => chain(
    SET_STATE('count', count + 1),
    () => chain(
      GET_STATE('count'),
      (newCount) => of(newCount)
    )
  )
);

// 运行计算
const newCount = runFreer(statefulComputation, stateInterpreter);
console.log(newCount); // 输出: 1
```

#### 异步操作

```javascript
import { of, chain, runFreerAsync, fromPromise } from './forMonad.js';

// 创建一个异步计算
const asyncComputation = chain(
  fromPromise(fetch('https://api.example.com/data')),
  (response) => chain(
    fromPromise(response.json()),
    (data) => of(data)
  )
);

// 异步运行计算
async function run() {
  const interpreter = effect => {
    if (effect.type === 'promise') {
      return effect.payload;
    }
  };
  
  const data = await runFreerAsync(asyncComputation, interpreter);
  console.log(data);
}

run();
```

#### 使用生成器简化语法

```javascript
import { fromGenerator, runFreer, EffectTypes } from './forMonad.js';

// 创建效果
const getUser = (id) => ({ type: EffectTypes.HTTP_REQUEST, payload: { url: `/users/${id}` } });
const getPost = (id) => ({ type: EffectTypes.HTTP_REQUEST, payload: { url: `/posts/${id}` } });

// 使用生成器定义计算
function* getUserWithPosts(userId) {
  const user = yield getUser(userId);
  const posts = yield getPost(user.postId);
  return { user, posts };
}

// 创建解释器
const httpInterpreter = (effect) => {
  if (effect.type === EffectTypes.HTTP_REQUEST) {
    // 模拟HTTP请求
    if (effect.payload.url === '/users/1') {
      return { id: 1, name: '张三', postId: 42 };
    }
    if (effect.payload.url === '/posts/42') {
      return { id: 42, title: '函数式编程指南' };
    }
  }
};

// 运行
const program = fromGenerator(getUserWithPosts(1));
const result = runFreer(program, httpInterpreter);
console.log(result); // { user: { id: 1, name: '张三', postId: 42 }, posts: { id: 42, title: '函数式编程指南' } }
```

### 高级用法

#### 组合解释器

```javascript
import { runFreer, composeInterpreters, consoleLogInterpreter, createStateInterpreter } from './forMonad.js';

// 组合多个解释器
const combinedInterpreter = composeInterpreters(
  consoleLogInterpreter,
  createStateInterpreter({ count: 0 })
);

// 现在可以处理LOG和状态相关的效果
const result = runFreer(computation, combinedInterpreter);
```

#### 转换效果

```javascript
import { mapEffect } from './forMonad.js';

// 将一种效果转换为另一种
const transformedComputation = mapEffect(computation, effect => {
  if (effect.type === 'old_effect') {
    return { type: 'new_effect', payload: effect.payload };
  }
  return effect;
});
```

## 优势

1. **可测试性** - 副作用被描述为数据，使得测试变得简单
2. **可组合性** - 计算可以通过chain轻松组合
3. **关注点分离** - 业务逻辑与效果实现完全分离
4. **灵活性** - 同一程序可以有多种解释方式

## 适用场景

- 复杂的异步操作序列
- 需要模拟或替换外部依赖的测试
- 状态管理
- 需要将副作用与业务逻辑分离的场景 