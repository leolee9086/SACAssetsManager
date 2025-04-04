/**
 * 按顺序连接多个生成器，依次完全迭代每个生成器
 * @generator
 * @param {...Generator} 多个生成器 - 需要连接的生成器列表（一个或多个生成器参数）
 * @yields {any} 合并后的生成器值
 */
export function* 顺序连接生成器(...多个生成器) {
    for (const 生成器 of 多个生成器) {
        // 严格按顺序执行：完全迭代完前一个生成器后再开始下一个
        for (const 值 of 生成器) {
            yield 值;
        }
    }
}

/**
 * 并行合并多个生成器，同时从所有生成器获取值直到全部完成
 * @generator
 * @param {...Generator} 多个生成器 - 需要并行合并的生成器列表
 * @yields {Array} 包含各生成器当前值的数组（与参数顺序一致）
 */
export function* 并行合并生成器(...多个生成器) {
    const 迭代器列表 = 多个生成器.map(生成器 => 生成器[Symbol.iterator]());
    const 结果缓存 = 迭代器列表.map(() => ({ done: false }));
    
    while (true) {
        const 当前结果 = 迭代器列表.map((迭代器, 索引) => {
            if (!结果缓存[索引].done) {
                结果缓存[索引] = 迭代器.next();
            }
            return 结果缓存[索引].value;
        });

        if (结果缓存.every(r => r.done)) break;
        yield 当前结果;
    }
}

/**
 * 交替合并多个生成器，轮流从每个生成器获取一个值
 * @generator
 * @param {...Generator} 多个生成器 - 需要交替合并的生成器列表
 * @yields {any} 当前生成器产生的值
 */
export function* 交替合并生成器(...多个生成器) {
    const 迭代器列表 = 多个生成器.map(生成器 => 生成器[Symbol.iterator]());
    let 活跃数 = 迭代器列表.length;
    
    while (活跃数 > 0) {
        for (const [索引, 迭代器] of 迭代器列表.entries()) {
            if (!迭代器) continue;
            const { value, done } = 迭代器.next();
            if (done) {
                迭代器列表[索引] = null;
                活跃数--;
            } else {
                yield value;
            }
        }
    }
}