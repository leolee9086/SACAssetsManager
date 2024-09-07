/**
 * @typedef {Object} CSSVarProxy
 * @property {function(): string} [key: string]
 */

/**
 * 用于生成 CSS 变量字符串的代理对象
 * 
 * 使用方法:
 * - 链式调用: cssVarProxy.theme.background()
 * - 带参数: cssVarProxy.theme.color('primary')
 * 
 * @example
 * cssVarProxy.theme.background() // 返回 "var(--theme-background)"
 * cssVarProxy.theme.color('primary') // 返回 "var(--theme-color-primary)"
 * 
 * @type {CSSVarProxy}
 */
export const cssVarProxy = new Proxy({}, {
    get: (target, prop) => {
        return new Proxy(() => {}, {
            /**
             * @param {string} nextProp
             * @returns {CSSVarProxy}
             */
            get: (_, nextProp) => cssVarProxy[`${prop}-${nextProp}`],
            /**
             * @param {any} _
             * @param {any} __
             * @param {string[]} args
             * @returns {string}
             */
            apply: (_, __, args) => `var(--${prop}${args.length ? `-${args.join('-')}` : ''})`
        });
    }
});