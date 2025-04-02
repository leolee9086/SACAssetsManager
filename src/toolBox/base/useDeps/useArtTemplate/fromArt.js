import { createIframeLoader } from '../../useModules/useIframeLoader.js';

// 使用通用加载器加载art-template
let artTemplate = globalThis[Symbol('artTemplate')] || null;

const 加载模板引擎 = (() => {
    const iframeLoader = createIframeLoader();
    
    return async () => {
        if (artTemplate) {
            return artTemplate;
        }
        
        const scriptPath = import.meta.resolve('../../../../../static/art-template-web.js');
        artTemplate = await iframeLoader(scriptPath, 'template', 'artTemplate');
        
        // 配置默认设置
        if (artTemplate && artTemplate.defaults) {
            // 设置默认转义为false，允许HTML输出（需谨慎使用）
            artTemplate.defaults.escape = false;
            // 设置默认缓存为true，提高性能
            artTemplate.defaults.cache = true;
        }
        
        return artTemplate;
    };
})();

// 加载模板引擎并检查是否成功
!artTemplate && await 加载模板引擎();
!artTemplate && (() => { throw new Error('模板引擎加载失败') })();

// 编译模板字符串
const compileTemplate = (templateStr) => {
    return artTemplate.compile(templateStr);
};

// 直接渲染模板字符串
const renderString = (templateStr, data) => {
    return artTemplate.render(templateStr, data);
};

// 注册自定义辅助函数
const registerHelper = (name, fn) => {
    if (!artTemplate.defaults.imports) {
        artTemplate.defaults.imports = {};
    }
    artTemplate.defaults.imports[name] = fn;
};

// 常用辅助函数预注册
const 注册常用辅助函数 = () => {
    // 日期格式化
    registerHelper('dateFormat', (date, format = 'YYYY-MM-DD') => {
        if (!date) return '';
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day);
    });
    
    // 数字格式化
    registerHelper('numberFormat', (num, decimals = 2) => {
        if (isNaN(num)) return '0';
        return Number(num).toFixed(decimals);
    });
    
    // 条件判断
    registerHelper('ifCond', (v1, operator, v2, options) => {
        switch (operator) {
            case '==': return (v1 == v2) ? options.fn(this) : options.inverse(this);
            case '===': return (v1 === v2) ? options.fn(this) : options.inverse(this);
            case '!=': return (v1 != v2) ? options.fn(this) : options.inverse(this);
            case '!==': return (v1 !== v2) ? options.fn(this) : options.inverse(this);
            case '<': return (v1 < v2) ? options.fn(this) : options.inverse(this);
            case '<=': return (v1 <= v2) ? options.fn(this) : options.inverse(this);
            case '>': return (v1 > v2) ? options.fn(this) : options.inverse(this);
            case '>=': return (v1 >= v2) ? options.fn(this) : options.inverse(this);
            case '&&': return (v1 && v2) ? options.fn(this) : options.inverse(this);
            case '||': return (v1 || v2) ? options.fn(this) : options.inverse(this);
            default: return options.inverse(this);
        }
    });
};

// 自动注册常用辅助函数
注册常用辅助函数();

export { 
    artTemplate,
    compileTemplate,
    renderString,
    registerHelper
};
