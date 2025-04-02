/**
 * 全局Vue版本
 * 从ESM模块版本转换为全局脚本版本
 */

(function() {
  // 动态加载ESM版本的Vue
  const script = document.createElement('script');
  script.type = 'module';
  script.textContent = `
    import * as Vue from '/plugins/SACAssetsManager/static/vue.esm-browser.js';
    
    // 将Vue导出到全局作用域
    window.Vue = Vue;
    
    // 触发加载完成事件
    window.dispatchEvent(new Event('vue-loaded'));
  `;
  
  document.head.appendChild(script);
  
  // 如果SFC loader尚未加载，也加载它
  const sfcLoaderScript = document.createElement('script');
  sfcLoaderScript.type = 'module';
  sfcLoaderScript.textContent = `
    import * as SfcLoader from '/plugins/SACAssetsManager/static/vue3-sfc-loader.esm.js';
    
    // 将SFC loader导出到全局作用域
    window.vueSfcLoader = SfcLoader;
    
    // 触发加载完成事件
    window.dispatchEvent(new Event('sfc-loader-loaded'));
  `;
  
  document.head.appendChild(sfcLoaderScript);
})(); 