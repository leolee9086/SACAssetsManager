/**
 * 创建一个可链式调用的对象代理。
 * 
 * @template T
 * @param {T} obj - 要代理的原始对象。
 * @returns {T & {$raw: T}} 返回一个代理对象，该对象支持链式调用并包含一个 $raw 属性以访问原始对象。
 *
 * @example
 * const person = chainable({
 *   name: '',
 *   setName(name) {
 *     this.name = name;
 *   },
 *   greet() {
 *     console.log(`Hello, ${this.name}!`);
 *   }
 * });
 * 
 * person.setName('Alice').greet();
 * console.log(person.$raw.name); // 'Alice'
 */
export function chainable(obj) {
    return new Proxy(obj, {
        /**
         * 获取属性的处理器。
         * 
         * @param {T} target - 目标对象。
         * @param {string | symbol} prop - 属性名。
         * @returns {any} 属性值或经过包装的函数。
         */
        get(target, prop,receiver) {
            if (prop === '$raw') {
                return target;
            }

            const value = target[prop];

            if (typeof value === 'function') {
                return (...args) => {
                    const result = value.apply(target, args);
                    return result === undefined ? this : result;
                };
            }
                return function (...args) {
                    if (args.length > 0) {
                        target[prop] = args[0]; // 将第一个参数设置为对象的对应属性
                    }
                    return receiver; // 返回代理对象，以便链式调用
                };
            
        },

        /**
         * 设置属性的处理器。
         * 
         * @param {T} target - 目标对象。
         * @param {string | symbol} prop - 属性名。
         * @param {any} value - 要设置的值。
         * @returns {boolean} 总是返回 true 表示设置成功。
         */
        set(target, prop, value) {
            target[prop] = value;
            return true;
        }
    });
}