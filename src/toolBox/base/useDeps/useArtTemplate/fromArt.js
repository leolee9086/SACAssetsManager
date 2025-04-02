import { createIframeLoader } from '../../../base/iframeLoader.js';

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
        return artTemplate;
    };
})();

// 加载模板引擎并检查是否成功
!artTemplate && await 加载模板引擎();
!artTemplate && (() => { throw new Error('模板引擎加载失败') })();

export { artTemplate };
