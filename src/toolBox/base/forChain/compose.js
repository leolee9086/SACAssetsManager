/**
 * 函数组合工具
 * 提供函数组合和管道操作的实用函数
 */

/**
 * 创建一个新的函数，该函数是输入函数的顺序组合。
 * 新函数的输出是由原函数按照从右到左的顺序计算得出的。
 * 
 * @param {...Function} 函数数组 - 任意数量的函数，它们将被组合成一个新的函数。
 * @returns {Function} 返回一个新的函数，该函数接受任意数量的参数，并将这些参数依次传递给每一个函数。
 * 
 * @example
 * function double(x) { return x * 2; }
 * function square(x) { return x * x; }
 * function increment(x) { return x + 1; }
 * let incrementSquareOfDouble = 顺序组合函数(increment, square, double);
 * console.log(incrementSquareOfDouble(5));  // 输出：51
 */
export function 顺序组合函数(...函数数组) {
    return 函数数组.reduce((f, g) => (...args) => f(g(...args)));
}

/**
 * 创建一个新的函数，该函数是输入函数的顺序组合。
 * 新函数的输出是由原函数按照从左到右的顺序计算得出的。
 * 
 * @param {...Function} 函数数组 - 任意数量的函数，它们将被组合成一个新的函数。
 * @returns {Function} 返回一个新的函数，该函数接受任意数量的参数，并将这些参数依次传递给每一个函数。
 * 
 * @example
 * function double(x) { return x * 2; }
 * function square(x) { return x * x; }
 * function increment(x) { return x + 1; }
 * let doubleSquareIncrement = 管道函数(double, square, increment);
 * console.log(doubleSquareIncrement(5));  // 输出：26
 */
export function 管道函数(...函数数组) {
    return 函数数组.reduceRight((f, g) => (...args) => f(g(...args)));
}

/**
 * 组合多个函数，从右到左执行
 * 提供英文命名的别名
 */
export const compose = 顺序组合函数;

/**
 * 组合多个函数，从左到右执行
 * 提供英文命名的别名
 */
export const pipe = 管道函数; 