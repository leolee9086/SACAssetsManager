/**
 * 函数并行执行工具
 * 提供函数并行执行和结果收集的实用函数
 */

/**
 * 创建一个函数，该函数并行执行多个函数并收集结果。
 * 
 * @param {...Function} 函数数组 - 任意数量的函数，它们将被并行执行。
 * @returns {Function} 返回一个新的函数，该函数接受任意数量的参数，并将这些参数传递给每个函数，然后收集所有函数的执行结果。
 * 
 * @example
 * function double(x) { return x * 2; }
 * function square(x) { return x * x; }
 * function increment(x) { return x + 1; }
 * 
 * let multiCalc = 组合函数(double, square, increment);
 * console.log(await multiCalc(5));  // 输出: [10, 25, 6]
 */
export function 组合函数(...函数数组) {
    // 使用 Array.prototype.flat 来确保函数数组总是一维的
    函数数组 = 函数数组.flat();
    // 类型检查：确保函数数组的每个元素都是函数
    函数数组.forEach(fn => {
        if (typeof fn !== 'function') {
            throw new TypeError('组合函数的参数必须都是函数');
        }
    });

    let 组合结果 = async function(...args) {
        // 使用 Promise.all 来并行执行所有的函数，并处理错误
        let results = await Promise.all(函数数组.map(fn => {
            try {
                return fn(...args);
            } catch (error) {
                console.error('在执行函数时发生错误:', error);
                return null;
            }
        }));

        // 移除所有的 null 值
        results = results.filter(result => result !== null);
        return results;
    };

    // 添加 add 方法
    组合结果.add = function(...fn) {
        // 类型检查：确保添加的每个元素都是函数
        fn.flat().forEach(fn => {
            if (typeof fn !== 'function') {
                throw new TypeError('add方法的参数必须都是函数');
            }
        });

        函数数组 = 函数数组.concat(fn.flat());
    };

    return 组合结果;
}

/**
 * 并行执行多个函数并收集结果
 * 提供英文命名的别名
 */
export const parallel = 组合函数; 