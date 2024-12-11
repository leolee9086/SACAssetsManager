import { createApp, h } from 'vue';
import MenuComponent from './menu.vue';

class Menu {
  constructor() {
    this.items = [];
    this.visible = false;
    this.x = 0;
    this.y = 0;
    this.mountPoint = null;
    this.app = null;
  }

  // 添加菜单项
  addItem(item) {
    if (!item.label && item.type !== 'separator') {
      throw new Error('菜单项必须包含label属性');
    }
    
    this.items.push({
      ...item,
      id: item.id || `menu-item-${this.items.length}`
    });
    
    return this;
  }

  // 添加分隔线
  addSeparator() {
    this.items.push({
      type: 'separator'
    });
    return this;
  }

  // 根据ID移除菜单项
  removeItem(id) {
    const index = this.items.findIndex(item => item.id === id);
    if (index !== -1) {
      this.items.splice(index, 1);
    }
    return this;
  }

  // 清空所有菜单项
  clear() {
    this.items = [];
    return this;
  }

  // 获取所有菜单项
  getItems() {
    return this.items;
  }

  // 根据ID获取菜单项
  getItem(id) {
    return this.items.find(item => item.id === id);
  }

  // 更新菜单项
  updateItem(id, updates) {
    const item = this.getItem(id);
    if (item) {
      Object.assign(item, updates);
    }
    return this;
  }

  // 挂载菜单到DOM
  mount(container = document.body) {
    if (this.app) {
      this.unmount();
    }

    // 创建挂载点
    this.mountPoint = document.createElement('div');
    container.appendChild(this.mountPoint);

    // 创建Vue应用
    this.app = createApp({
      setup: () => {
        return () => h(MenuComponent, {
          ...this.getState(),
          onSelect: (item) => this.handleSelect(item),
          onClose: () => this.handleClose()
        });
      }
    });

    // 挂载应用
    this.app.mount(this.mountPoint);
    return this;
  }

  // 卸载菜单
  unmount() {
    if (this.app) {
      this.app.unmount();
      this.mountPoint.remove();
      this.app = null;
      this.mountPoint = null;
    }
    return this;
  }

  // 显示菜单
  show(x, y) {
    if (!this.app) {
      this.mount();
    }
    this.visible = true;
    this.x = x;
    this.y = y;
    return this;
  }

  // 隐藏菜单
  hide() {
    this.visible = false;
    return this;
  }

  // 销毁菜单
  destroy() {
    this.hide();
    this.unmount();
    this.items = [];
    this.selectCallback = null;
    this.closeCallback = null;
    return this;
  }

  // 创建子菜单
  createSubmenu(items = []) {
    const submenu = new Menu();
    items.forEach(item => submenu.addItem(item));
    return submenu;
  }

  // 静态方法：创建上下文菜单
  static createContextMenu(options = {}) {
    const menu = new Menu();
    
    // 添加事件监听器
    const handler = (e) => {
      e.preventDefault();
      const { clientX: x, clientY: y } = e;
      menu.show(x, y);
    };

    // 绑定右键菜单事件
    if (options.target) {
      options.target.addEventListener('contextmenu', handler);
    }

    // 添加点击外部关闭功能
    document.addEventListener('click', (e) => {
      if (!menu.mountPoint?.contains(e.target)) {
        menu.hide();
      }
    });

    return menu;
  }

  // 获取菜单状态
  getState() {
    return {
      visible: this.visible,
      x: this.x,
      y: this.y,
      menuItems: this.items
    };
  }

  // 处理菜单项选择
  onSelect(callback) {
    this.selectCallback = callback;
    return this;
  }

  // 处理菜单关闭
  onClose(callback) {
    this.closeCallback = callback;
    return this;
  }

  // 内部方法：处理选择事件
  handleSelect(item) {
    if (this.selectCallback) {
      this.selectCallback(item);
    }
  }

  // 内部方法：处理关闭事件
  handleClose() {
    this.hide();
    if (this.closeCallback) {
      this.closeCallback();
    }
  }
}

export default Menu;
