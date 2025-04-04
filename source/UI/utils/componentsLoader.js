/**
 * 组件加载器桥接层
 * 为保持向后兼容性，重定向到新的vueComponentLoader.js
 */

import {
  initVueApp,
  createVueInterface,
  cc,
  loadVueComponentAsNodeSync,
  clearComponentCache
} from '../../../src/toolBox/feature/useVue/vueComponentLoader.js';

// 导出所有功能
export {
  initVueApp,
  createVueInterface,
  cc,
  loadVueComponentAsNodeSync,
  clearComponentCache
};

// 向控制台输出迁移提示
console.log(
  '提示: componentsLoader.js 已被弃用，请直接使用 src/toolBox/useVue/vueComponentLoader.js'
);

export default {
  initVueApp,
  createVueInterface,
  cc,
  loadVueComponentAsNodeSync,
  clearComponentCache
}; 