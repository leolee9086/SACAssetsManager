/**
 * 为数组的 push 方法添加中间件功能。
 * 
 * @param {Array} array - 需要增强 push 方法的数组。
 * @param {Object} [options] - 配置选项。
 * @param {boolean} [options.ignoreErrors=false] - 是否忽略中间件中的错误。默认不忽略。
 * @param {...Function} middlewares - 一个或多个中间件函数，这些函数将在 push 操作之前执行。
 * @throws {TypeError} 如果第一个参数不是数组，或中间件不是函数，则抛出错误。
 * 
 * @example
 * const arr = [];
 * 创建带中间件的Push方法(arr, { ignoreErrors: true }, (args) => {
 *     console.log('Before push:', args);
 *     return args;
 * });
 * arr.push(1, 2, 3); // 控制台输出: Before push: [1, 2, 3]
 */
export function 创建带中间件的Push方法(array, { ignoreErrors = false } = {}, ...middlewares) {
    if (!Array.isArray(array)) {
        throw new TypeError('The first argument must be an array.');
    }
    if (!middlewares.every(fn => typeof fn === 'function')) {
        throw new TypeError('All middlewares must be functions.');
    }

    const originalPush = array.push;
    array.push = function (...args) {
        for (const middleware of middlewares) {
            try {
                args = middleware(args) || args;
            } catch (error) {
                console.error('Error in middleware:', error);
                if (!ignoreErrors) {
                    throw error; // 抛出错误并不添加数据
                }
                break; // 如果忽略错误，跳出中间件循环
            }
        }
        return originalPush.apply(this, args);
    };
}