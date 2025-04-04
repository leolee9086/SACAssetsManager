import { initVueApp } from '../../../../../src/utils/module/vue/loadVueApp.js'

// 使用IIFE包装异步逻辑
;(async () => {
  try {
    const app = await initVueApp(import.meta.resolve('./components/app.vue'), 'editorRoot');
    if (app && typeof app.mount === 'function') {
      app.mount(document.querySelector('#app'));
    } else {
      console.error('Vue应用创建失败，无法挂载');
    }
  } catch (error) {
    console.error('初始化Vue应用失败:', error);
  }
})();
