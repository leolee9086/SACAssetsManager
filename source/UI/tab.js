import { createVueInterface, initVueApp } from '../../src/toolBox/useVue/vueComponentLoader.js';
import VueKonva from '../../static/vue-konva.mjs'

// 直接定义 AppWrapper 组件
const AppWrapper = {
  name: 'AppWrapper',
  template: '<slot></slot>',
  setup() {
    const checkAndSetAttribute = () => {
      const wndElements = document.querySelectorAll('[data-type="wnd"]');
      if (wndElements.length === 1) {
        document.body.setAttribute('data-subapp', '');
      } else {
        document.body.removeAttribute('data-subapp');
      }
    };

    return {
      mounted() {
        // 初始检查
        checkAndSetAttribute();

        // 创建 MutationObserver 监听 DOM 变化
        const observer = new MutationObserver(checkAndSetAttribute);
        console.log(observer)
        // 配置观察选项
        observer.observe(document.body, {
          childList: true,      // 监听子节点的增删
          subtree: true,        // 监听所有后代节点
          attributes: true,      // 监听属性变化
          attributeFilter: ['data-type']  // 只监听 data-type 属性
        });

        // 保存 observer 引用以便清理
        this.observer = observer;
      },
      unmounted() {
        // 断开观察器
        if (this.observer) {
          this.observer.disconnect();
        }
        document.body.removeAttribute('data-subapp');
      }
    }
  }
};

/**
 * 创建Vue组件界面
 * @param {Object} tab - Tab对象
 * @param {string} 组件路径 - Vue组件的绝对路径
 * @param {string} [容器ID=''] - 组件的容器ID
 * @param {Object} [额外数据={}] - 要传递给组件的额外数据
 * @returns {Promise<Vue.App>} Vue应用实例
 */
export async function 创建Vue组件界面(tab, 组件路径, 容器ID = '', 额外数据 = {}) {
  return await createVueInterface(tab, 组件路径, 容器ID, 额外数据);
}

export { initVueApp };

/**
 * 创建资源信息面板
 * @param {Element} UI容器 - 挂载容器
 * @returns {Promise<Vue.App>} Vue应用实例
 */
export async function 创建资源信息面板(UI容器) {
  try {
    const 组件路径 = import.meta.resolve('./pannels/assetInfoPanel/assestInfoPanel.vue');
    const 资源信息面板 = await initVueApp(组件路径);
    资源信息面板.mount(UI容器);
    return 资源信息面板;
  } catch (error) {
    console.error('创建资源信息面板失败:', error);
    throw error;
  }
}

/**
 * 创建收藏夹面板
 * @param {Element} UI容器 - 挂载容器
 * @returns {Promise<Vue.App>} Vue应用实例
 */
export async function 创建收藏夹面板(UI容器) {
  try {
    const 组件路径 = import.meta.resolve('./components/collectionPanel.vue');
    const 收藏夹面板 = await initVueApp(组件路径);
    收藏夹面板.mount(UI容器);
    return 收藏夹面板;
  } catch (error) {
    console.error('创建收藏夹面板失败:', error);
    throw error;
  }
}

