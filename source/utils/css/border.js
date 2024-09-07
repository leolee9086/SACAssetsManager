/**
 * 提供设置边框半径的工具对象
 * @namespace
 */
export const borderRadius = {
    /**
     * 创建一个用于设置所有角边框半径的链式调用对象
     * @param {...string} args - 边框半径的值，可以是任意数量的参数
     * @returns {Function & {apply2Obj: Function, apply2Element: Function}} 返回一个函数和包含方法的对象
     */
    all: (...args) => createChain('borderRadius', args),

    /**
     * 创建一个用于设置左上和左下角边框半径的链式调用对象
     * @param {...string} args - 边框半径的值，可以是任意数量的参数
     * @returns {Function & {apply2Obj: Function, apply2Element: Function}} 返回一个函数和包含方法的对象
     */
    left: (...args) => createChain(['borderTopLeftRadius', 'borderBottomLeftRadius'], args),

    /**
     * 创建一个用于设置右上和右下角边框半径的链式调用对象
     * @param {...string} args - 边框半径的值，可以是任意数量的参数
     * @returns {Function & {apply2Obj: Function, apply2Element: Function}} 返回一个函数和包含方法的对象
     */
    right: (...args) => createChain(['borderTopRightRadius', 'borderBottomRightRadius'], args),

    /**
     * 创建一个用于设置左上和右上角边框半径的链式调用对象
     * @param {...string} args - 边框半径的值，可以是任意数量的参数
     * @returns {Function & {apply2Obj: Function, apply2Element: Function}} 返回一个函数和包含方法的对象
     */
    top: (...args) => createChain(['borderTopLeftRadius', 'borderTopRightRadius'], args),

    /**
     * 创建一个用于设置左下和右下角边框半径的链式调用对象
     * @param {...string} args - 边框半径的值，可以是任意数量的参数
     * @returns {Function & {apply2Obj: Function, apply2Element: Function}} 返回一个函数和包含方法的对象
     */
    bottom: (...args) => createChain(['borderBottomLeftRadius', 'borderBottomRightRadius'], args)
};

/**
 * 创建一个链式调用对象
 * @param {string|string[]} properties - 要设置的 CSS 属性名称
 * @param {string[]} args - 边框半径的值
 * @returns {Function & {apply2Obj: Function, apply2Element: Function}} 返回一个函数和包含方法的对象
 */
function createChain(properties, args) {
    const chain = {
        /**
         * 将边框半径应用到样式对象
         * @param {Object} style - 要应用样式的对象
         * @returns {Object} 返回链式调用对象
         */
        apply2Obj: (style) => {
            const value = args.join(' ');
            if (Array.isArray(properties)) {
                properties.forEach(prop => style[prop] = value);
            } else {
                style[properties] = value;
            }
            return chain;
        },
        /**
         * 将边框半径直接应用到 DOM 元素
         * @param {HTMLElement} element - 要应用样式的 DOM 元素
         * @returns {Object} 返回链式调用对象
         */
        apply2Element: (element) => {
            const value = args.join(' ');
            if (Array.isArray(properties)) {
                properties.forEach(prop => element.style[prop] = value);
            } else {
                element.style[properties] = value;
            }
            return chain;
        }
    };
    return Object.assign((...newArgs) => createChain(properties, [...args, ...newArgs]), chain);
}