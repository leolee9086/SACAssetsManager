/**
 * 函数柯里化工具
 * 提供函数柯里化和参数收集的实用函数
 */

/**
 * 创建一个柯里化版本的函数。
 * 
 * @param {Function} 原始函数 - 需要被柯里化的原始函数。
 * @returns {Function} 返回一个新的函数，这个函数会收集所有传递给它的参数，直到这些参数的数量达到了原始函数的参数数量，然后它会调用原始函数并传递所有收集到的参数。
 * 
 * @example
 * let add = (a, b, c) => a + b + c;
 * let curriedAdd = 柯里化(add);
 * console.log(curriedAdd(1)(2)(3));  // 输出 6
 * console.log(curriedAdd(1, 2)(3));  // 输出 6
 * console.log(curriedAdd(1, 2, 3));  // 输出 6
 */
export function 柯里化(原始函数) {
    return function 柯里化版本函数(...输入参数) {
        if (输入参数.length >= 原始函数.length) {
            return 原始函数.apply(this, 输入参数);
        } else {
            return function(...args2) {
                return 柯里化版本函数.apply(this, 输入参数.concat(args2));
            }
        }
    };
}

/**
 * 创建一个函数，该函数收集参数直到达到指定长度后才执行。
 * 
 * @param {Function} 原始函数 - 原始函数。
 * @param {number} 预定长度 - 需要收集的参数数量。
 * @returns {Function} 返回一个新的函数，这个函数会收集参数直到达到预定长度，然后调用原始函数。
 * 
 * @example
 * let add = (a, b, c, d) => a + b + c + d;
 * let waitForThree = 等待参数达到长度后执行(add, 3);
 * console.log(waitForThree(1, 2, 3)(4));  // 输出 10
 */
export function 等待参数达到长度后执行(原始函数, 预定长度) {
    let 柯里化版本函数 = 柯里化(原始函数);
    return function(...输入参数) {
        if (输入参数.length >= 预定长度) {
            return 柯里化版本函数(...输入参数);
        } else {
            return function(...args2) {
                return 柯里化版本函数(...输入参数, ...args2);
            }
        }
    };
}

/**
 * 将函数柯里化
 * 提供英文命名的别名
 */
export const curry = 柯里化;

/**
 * 等待参数达到预定长度后执行函数
 * 提供英文命名的别名
 */
export const waitForArgs = 等待参数达到长度后执行; 