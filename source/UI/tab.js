import { initVueApp } from './utils/componentsLoader.js';
import VueKonva from '../../static/vue-konva.mjs'
/**
 * 创建Vue组件界面
 * @param {Object} tab - Tab对象
 * @param {string} 组件路径 - Vue组件的绝对路径，例如'/plugins/MyPlugin/source/components/xxx.vue'
 * @param {string} [容器ID=''] - 组件的容器ID
 * @param {Object} [额外数据={}] - 要传递给组件的额外数据
 */
export function 创建Vue组件界面(tab, 组件路径, 容器ID = '', 额外数据 = {}) {
  // 验证路径是否为绝对路径
  if (!组件路径.startsWith('/')) {
    throw new Error('组件路径必须是绝对路径，以/开头');
  }

  const app = initVueApp(
    组件路径,
    容器ID,
    {},
    undefined,
    {
      ...tab.data,
      ...额外数据,
      tab,
      getApp:()=>app
    }
  );
  app.use(VueKonva)
  app.mount(tab.element);
  return app;
}

// 原函数可以改写为：
export function 创建图库界面(tab) {
  return 创建Vue组件界面(
    tab,
    '/plugins/SACAssetsManager/source/UI/components/assetGalleryPanel.vue',
    'assetsColumn'
  );
}
export function 创建编辑器界面(tab) {
  return 创建Vue组件界面(
    tab,
    '/plugins/SACAssetsManager/source/UI/components/editors/image.vue',
    'assetsColumn'
  );
}

export function 创建资源信息面板(UI容器){
  const 资源信息面板 =  initVueApp(import.meta.resolve('./components/assestInfoPanel.vue'))
  资源信息面板.mount(UI容器);

}
export function 创建收藏夹面板(UI容器) {
  const 收藏夹面板 = initVueApp(import.meta.resolve('./components/collectionPanel.vue'));
  收藏夹面板.mount(UI容器);
}