import { initVueApp } from '../../../../utils/module/vue/loadVueApp.js'

// 使用IIFE包装异步逻辑
;(async () => {
  try {
    const app = await initVueApp(import.meta.resolve('./app.vue'), 'zipViewerRoot');
    if (app && typeof app.mount === 'function') {
      app.mount(document.querySelector('#app'));
      console.log('压缩文件查看器已启动，文件路径:', window.imagePath);
    } else {
      console.error('Vue应用创建失败，无法挂载');
    }
  } catch (error) {
    console.error('初始化Vue应用失败:', error);
  }
})(); 