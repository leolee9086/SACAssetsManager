import { initVueApp } from './utils/componentsLoader.js';
export function 创建图库界面(tab) {
  const app = initVueApp(import.meta.resolve('./components/assetGalleryPanel.vue'), 'assetsColumn', {}, undefined, {
    tab
  })
  app.mount(tab.element)
  return
}

