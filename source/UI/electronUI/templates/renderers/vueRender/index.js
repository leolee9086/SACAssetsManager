import { BaseRenderer } from "../base.js";
import { createApp } from 'vue';

export class VueRenderer extends BaseRenderer {
  constructor(options = {}) {
    super();
    this.component = options.component;
    this.props = options.props || {};
    this.app = null;
  }

  async mount(container) {
    if (!this.component) {
      throw new Error('No Vue component provided');
    }

    // 创建一个包装div来挂载Vue应用
    const mountPoint = document.createElement('div');
    mountPoint.className = 'vue-renderer-container';
    container.appendChild(mountPoint);

    // 创建并挂载Vue应用
    this.app = createApp(this.component, this.props);
    this.app.mount(mountPoint);
  }

  async unmount(container) {
    // 卸载Vue应用
    if (this.app) {
      this.app.unmount();
      this.app = null;
    }
    
    // 清空容器
    container.innerHTML = '';
  }

  // 可选：添加更新方法以支持属性更新
  async update(newProps) {
    this.props = { ...this.props, ...newProps };
    // 如果需要，这里可以添加组件更新逻辑
  }
}
