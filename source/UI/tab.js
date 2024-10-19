import { initVueApp } from './utils/componentsLoader.js';
export function 创建图库界面(tab) {
  const app = initVueApp(import.meta.resolve('./components/assetGalleryPanel.vue'), 'assetsColumn', {}, undefined, 
    {
      ...tab.data,
      tab
    }
  )
  app.mount(tab.element)
  return
}

export function 创建资源信息面板(UI容器){
  const 资源信息面板 =  initVueApp(import.meta.resolve('./components/assestInfoPanel.vue'))
  资源信息面板.mount(UI容器);

}
export function 创建收藏夹面板(UI容器) {
  const 收藏夹面板 = initVueApp(import.meta.resolve('./components/collectionPanel.vue'));
  收藏夹面板.mount(UI容器);
}