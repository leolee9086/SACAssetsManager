// 直接使用静态导入
import { initVueApp } from '/plugins/SACAssetsManager/source/utils/module/vue/loadVueApp.js';

// 解析组件的完整路径
const componentPath = import.meta.resolve('./components/app.vue');
console.log('组件路径:', componentPath);

// 初始化Vue应用
try {
  const app = await initVueApp(componentPath, 'metadataEditorRoot');
  
  if (app && typeof app.mount === 'function') {
    app.mount(document.querySelector('#app'));
    console.log('元数据编辑器已启动，文件路径:', window.imagePath);
  } else {
    console.error('Vue应用创建失败，无法挂载');
    throw new Error('Vue应用创建失败，返回值不是有效的应用实例');
  }
} catch (error) {
  console.error('初始化Vue应用失败:', error);
  // 显示错误信息到界面
  const appDiv = document.querySelector('#app');
  if (appDiv) {
    appDiv.innerHTML = `
      <div style="padding: 20px; color: red;">
        <h3>加载失败</h3>
        <p>${error.message}</p>
        <pre>${error.stack || '无堆栈信息'}</pre>
        <button onclick="window.location.reload()">重试</button>
        <button onclick="window.require('@electron/remote').getCurrentWindow().close()">关闭窗口</button>
      </div>
    `;
  }
} 