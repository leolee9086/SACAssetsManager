/***
 * 创建一个require函数,用于在代码中引入模块
 * @param {Object} modeuleCache 模块缓存
 * @param {Object} parser 解析器
 * @param {Object} codeFixer 代码修复器
 * @param {Object} runner 运行器
 * @param {Object} currentModule 当前模块
 */
const createRequire = (modeuleCache, parser, codeFixer, runner, currentModule) => {
    return (moduleName) => {
        /**
         * 首先尝试从缓存中获取模块
         */
        let module = modeuleCache.get(moduleName, currentModule)
        if (module) { return module }
        /**
         * 如果缓存中没有,就尝试进行解析
        */
        const code = parser.parse(moduleName)
        const fixedCode = codeFixer.fix(code)
        const rawModule = runner.run(fixedCode, currentModule)
        modeuleCache.set(moduleName, rawModule)
        return rawModule
    }
}