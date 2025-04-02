

// 创建服务管理面板
function registerServiceManagerPanel(container) {
  // 创建挂载点
  const mountPoint = document.createElement('div');
  mountPoint.className = 'service-manager-container';
  mountPoint.style.width = '100%';
  mountPoint.style.height = '100%';
  container.appendChild(mountPoint);
  
  // 从URL加载组件
  const componentUrl = '/plugins/SACAssetsManager/source/UI/pannels/serviceManager/index.vue';
  
  // 获取Vue实例（已经在全局加载）
  const Vue = window.Vue;
  
  // 加载SFC loader
  const script = document.createElement('script');
  script.src = '/plugins/SACAssetsManager/static/vue3-sfc-loader.js';
  
  script.onload = function() {
    const SfcLoader = window.vueSfcLoader;
    
    const options = {
      moduleCache: {
        vue: Vue
      },
      async getFile(url) {
        const res = await fetch(url);
        if (!res.ok)
          throw Object.assign(new Error(`${res.statusText} ${url}`), { res });
        return await res.text();
      },
      addStyle(textContent) {
        const style = document.createElement('style');
        style.textContent = textContent;
        document.head.appendChild(style);
        return () => {
          document.head.removeChild(style);
        };
      },
      log(type, ...args) {
        console.log(type, ...args);
      }
    };
    
    const { loadModule } = SfcLoader;
    
    // 加载Vue组件
    loadModule(componentUrl, options)
      .then(component => {
        // 从全局获取plugin
        const runtimePlugin = window.siyuan.plugins["SACAssetsManager"];
        
        // 创建Vue应用并传入运行时上下文
        const app = Vue.createApp(component, {
          runtime: { plugin: runtimePlugin }
        });
        
        // 挂载应用
        app.mount(mountPoint);
        
        // 保存应用实例到容器，便于后续清理
        container._vueApp = app;
      })
      .catch(err => console.error('加载服务管理面板失败:', err));
  };
  
  script.onerror = function(err) {
    console.error('加载SFC loader失败:', err);
  };
  
  document.head.appendChild(script);
}

// 将函数暴露到全局作用域
window.registerServiceManagerPanel = registerServiceManagerPanel; 