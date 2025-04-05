/**
 * forMonad.js - Freer Monad实现
 * 
 * Freer Monad是一种轻量级的Monad实现，它将效果和解释器分离，
 * 允许纯函数式编程中更灵活地处理副作用。
 */

// 基础Free Monad类型 - 用于表示计算
export const createFreer = (functor) => ({
  type: 'freer',
  functor
});

// Pure - 表示纯值
export const createPure = (value) => createFreer({
  type: 'pure',
  value
});

// Impure - 表示含有效果的计算
export const createImpure = (effect, continuation) => createFreer({
  type: 'impure',
  effect,
  continuation
});

// of - 将纯值包装到Freer Monad中
export const of = createPure;

// chain - Freer Monad的bind操作
export const chain = (freer, f) => {
  if (freer.functor.type === 'pure') {
    return f(freer.functor.value);
  } else {
    return createImpure(
      freer.functor.effect,
      (value) => chain(freer.functor.continuation(value), f)
    );
  }
};

// 创建效果类型
export const createEffect = (type) => (payload) => ({
  type,
  payload
});

// 运行Freer Monad - 需要提供解释器
export const runFreer = (freer, interpreter) => {
  if (freer.functor.type === 'pure') {
    return freer.functor.value;
  } else {
    const effect = freer.functor.effect;
    const continuation = freer.functor.continuation;
    
    // 使用解释器处理效果
    const result = interpreter(effect);
    
    // 将结果传递到continuation中继续计算
    return runFreer(continuation(result), interpreter);
  }
};

// 异步运行Freer Monad
export const runFreerAsync = async (freer, interpreter) => {
  if (freer.functor.type === 'pure') {
    return freer.functor.value;
  } else {
    const effect = freer.functor.effect;
    const continuation = freer.functor.continuation;
    
    // 异步使用解释器处理效果
    const result = await interpreter(effect);
    
    // 将结果传递到continuation中继续计算
    return runFreerAsync(continuation(result), interpreter);
  }
};

// 创建Effect DSL - 用于定义特定领域的效果
export const createEffectDSL = (effectTypes) => {
  const dsl = {};
  
  // 为每种效果类型创建对应的函数
  Object.keys(effectTypes).forEach(type => {
    dsl[type] = (...args) => {
      const effect = createEffect(type)(args);
      return createImpure(effect, of);
    };
  });
  
  return dsl;
};

// 辅助函数 - 序列化一系列Freer Monad操作
export const sequence = (freers) => {
  if (freers.length === 0) {
    return of([]);
  }
  
  const [head, ...tail] = freers;
  
  return chain(head, (headValue) => 
    chain(sequence(tail), (tailValues) => 
      of([headValue, ...tailValues])
    )
  );
};

// 辅助函数 - 转换Freer Monad的效果
export const mapEffect = (freer, transformer) => {
  if (freer.functor.type === 'pure') {
    return freer;
  } else {
    return createImpure(
      transformer(freer.functor.effect),
      (value) => mapEffect(freer.functor.continuation(value), transformer)
    );
  }
};

// 辅助函数 - 组合解释器
export const composeInterpreters = (...interpreters) => (effect) => {
  for (const interpreter of interpreters) {
    const result = interpreter(effect);
    if (result !== undefined) {
      return result;
    }
  }
  throw new Error(`没有解释器可以处理效果: ${effect.type}`);
};

// 辅助函数 - 将Promise转换为Freer Monad
export const fromPromise = (promise) => 
  createImpure(
    { type: 'promise', payload: promise },
    (value) => of(value)
  );


// 辅助函数 - 将Freer Monad转换为生成器
export function* toGenerator(freer) {
  if (freer.functor.type === 'pure') {
    return freer.functor.value;
  } else {
    const effect = freer.functor.effect;
    const result = yield effect;
    return yield* toGenerator(freer.functor.continuation(result));
  }
}

// 辅助函数 - 从生成器创建Freer Monad
export const fromGenerator = (generator) => {
  const next = (value) => {
    const result = generator.next(value);
    
    if (result.done) {
      return of(result.value);
    }
    
    return createImpure(result.value, next);
  };
  
  return next();
};
