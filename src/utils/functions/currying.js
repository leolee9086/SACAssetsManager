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
    // 检查输入参数是否为函数
    if (typeof 原始函数 !== 'function') {
        throw new TypeError(`柯里化函数期望接收一个函数作为参数，但收到了 ${typeof 原始函数}`);
    }

    // 获取原始函数名称，用于错误提示
    const 函数名 = 原始函数.name || '匿名函数';
    
    return function 柯里化版本函数(...输入参数) {
        try {
            if (输入参数.length >= 原始函数.length) {
                return 原始函数.apply(this, 输入参数);
            } else {
                return function (...args2) {
                    return 柯里化版本函数.apply(this, 输入参数.concat(args2));
                }
            }
        } catch (错误) {
            throw new Error(
                `执行柯里化函数"${函数名}"时发生错误:\n` +
                `预期参数数量: ${原始函数.length}\n` +
                `实际接收参数: ${输入参数.length}\n` +
                `错误信息: ${错误.message}`
            );
        }
    };
}


/**
* 创建一个反向柯里化版本的函数。
* 
* @param {Function} 原始函数 - 需要被反向柯里化的原始函数。
* @returns {Function} 返回一个新的函数，这个函数会从右向左收集所有传递给它的参数，直到参数数量满足要求。
* 
* @example
* let divide = (a, b, c) => a / b / c;
* let rightCurriedDivide = 反向柯里化(divide);
* console.log(rightCurriedDivide(2)(3)(12));  // 输出 2 (12/3/2)
* console.log(rightCurriedDivide(2, 3)(12));  // 输出 2 (12/3/2)
* console.log(rightCurriedDivide(2, 3, 12));  // 输出 2 (12/3/2)
*/
export function 反向柯里化(原始函数) {
    // 检查输入参数是否为函数
    if (typeof 原始函数 !== 'function') {
        throw new TypeError(`反向柯里化函数期望接收一个函数作为参数，但收到了 ${typeof 原始函数}`);
    }
    // 获取原始函数名称，用于错误提示
    const 函数名 = 原始函数.name || '匿名函数';
    return function 反向柯里化版本函数(...输入参数) {
        try {
            if (输入参数.length >= 原始函数.length) {
                // 反转参数顺序后应用到原始函数
                return 原始函数.apply(this, 输入参数.reverse());
            } else {
                return function (...args2) {
                    // 将新参数放在数组前面，保持从右向左的顺序
                    return 反向柯里化版本函数.apply(this, [...args2, ...输入参数]);
                }
            }
        } catch (错误) {
            throw new Error(
                `执行反向柯里化函数"${函数名}"时发生错误:\n` +
                `预期参数数量: ${原始函数.length}\n` +
                `实际接收参数: ${输入参数.length}\n` +
                `错误信息: ${错误.message}`
            );
        }
    };
}

