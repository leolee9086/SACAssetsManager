import { URTStream } from './URTStream.js';

/**
 * 创建URT流操作符
 * @param {Object} options - 操作符配置
 * @param {function} options.transform - 转换函数
 * @param {function} [options.flush] - 刷新函数
 * @returns {URTStream}
 */
function createOperator({ transform, flush }) {
    return new URTStream({
        transform: (chunk, encoding, callback) => {
            try {
                transform(chunk, (error, result) => {
                    if (error) {
                        callback(error);
                        return;
                    }
                    if (result !== undefined) {
                        callback(null, result);
                    } else {
                        callback();
                    }
                });
            } catch (error) {
                callback(error);
            }
        },
        flush: flush ?
            callback => {
                try {
                    flush(callback);
                } catch (error) {
                    callback(error);
                }
            } :
            undefined
    });
}

/**
 * 流操作符工厂
 */
const operators = {
    /**
     * 过滤操作符
     * @param {function(URTResource): boolean} predicate 
     */
    filter: predicate => createOperator({
        transform: (resource, push) => {
            if (predicate(resource)) {
                push(null, resource);
            } else {
                push();
            }
        }
    }),

    /**
     * 映射操作符
     * @param {function(URTResource): URTResource} mapper 
     */
    map: mapper => createOperator({
        transform: (resource, push) => {
            const result = mapper(resource);
            push(null, result);
        }
    }),

    /**
     * 批处理操作符
     * @param {number} size - 批次大小
     */
    batch: size => {
        const buffer = [];
        return createOperator({
            transform: (resource, push) => {
                buffer.push(resource);
                if (buffer.length >= size) {
                    push(null, [...buffer]);
                    buffer.length = 0;
                }
            },
            flush: push => {
                if (buffer.length > 0) {
                    push(null, [...buffer]);
                }
                push();
            }
        });
    },

    /**
     * 排序操作符
     * @param {function(URTResource, URTResource): number} comparator 
     * @param {Object} options
     * @param {number} [options.bufferSize=1000] - 缓冲区大小
     * @param {boolean} [options.desc=false] - 是否降序
     */
    sort: (comparator, { bufferSize = 1000, desc = false } = {}) => {
        const buffer = [];
        const sortFn = desc ? (a, b) => -comparator(a, b) : comparator;

        return createOperator({
            transform: (resource, push) => {
                buffer.push(resource);
                if (buffer.length >= bufferSize) {
                    const sorted = [...buffer].sort(sortFn);
                    sorted.forEach(item => push(null, item));
                    buffer.length = 0;
                }
            },
            flush: push => {
                const sorted = [...buffer].sort(sortFn);
                sorted.forEach(item => push(null, item));
                push();
            }
        });
    },

    /**
     * 去重操作符
     * @param {function(URTResource): string} keySelector 
     */
    distinct: keySelector => {
        const seen = new Set();
        return createOperator({
            transform: (resource, push) => {
                const key = keySelector(resource);
                if (!seen.has(key)) {
                    seen.add(key);
                    push(null, resource);
                } else {
                    push();
                }
            }
        });
    },

    /**
     * tap操作符 - 用于调试
     * @param {function(URTResource): void} fn 
     */
    tap: fn => createOperator({
        transform: (resource, push) => {
            fn(resource);
            push(null, resource);
        }
    }),

    /**
     * 分组操作符
     * @param {function(URTResource): string} keySelector 
     */
    groupBy: keySelector => {
        const groups = new Map();
        return createOperator({
            transform: (resource, push) => {
                const key = keySelector(resource);
                if (!groups.has(key)) {
                    groups.set(key, []);
                }
                groups.get(key).push(resource);
            },
            flush: push => {
                for (const [key, items] of groups) {
                    push(null, { key, items });
                }
                push();
            }
        });
    },

    /**
     * 限流操作符
     * @param {number} count 
     */
    take: count => {
        let processed = 0;
        return createOperator({
            transform: (resource, push) => {
                if (processed < count) {
                    processed++;
                    push(null, resource);
                }
            }
        });
    }
};

/**
 * 流式管道构建器
 */
class URTPipeline {
    constructor(source) {
        this.source = source;
        this.operators = [];
    }

    pipe(operator) {
        this.operators.push(operator);
        return this;
    }

    filter(predicate) {
        return this.pipe(operators.filter(predicate));
    }

    map(mapper) {
        return this.pipe(operators.map(mapper));
    }

    batch(size) {
        return this.pipe(operators.batch(size));
    }

    sort(comparator, options) {
        return this.pipe(operators.sort(comparator, options));
    }

    distinct(keySelector) {
        return this.pipe(operators.distinct(keySelector));
    }

    tap(fn) {
        return this.pipe(operators.tap(fn));
    }

    groupBy(keySelector) {
        return this.pipe(operators.groupBy(keySelector));
    }

    take(count) {
        return this.pipe(operators.take(count));
    }

    /**
     * 执行管道
     * @returns {URTStream}
     */
    execute() {
        return this.operators.reduce(
            (stream, operator) => stream.pipe(operator),
            this.source
        );
    }
}

/**
 * 创建URT流管道
 * @param {URTStream} source - 源流
 */
function pipeline(source) {
    return new URTPipeline(source);
}

export { operators, pipeline };
