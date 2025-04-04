import { createApp, h, compile } from '../../../../static/vue.esm-browser.js'
import * as Vue from "../../../../static/vue.esm-browser.js"
import { loadModule } from '../../../../static/vue3-sfc-loader.esm.js';
export class SFCMenuLoader {
    constructor(clientApi) {
        this.clientApi = clientApi;
        this.observer = null;
        this.setupMenuObserver();
        this.options = {
            moduleCache: {
                vue: Vue
            },
            async getFile() {
                // 由于我们直接传入SFC内容，这个方法不会被调用
                return ''
            },
            addStyle() {
                // 忽略样式处理
            }
        };
    }

    setupMenuObserver() {
        // 创建 MutationObserver
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.id === 'commonMenu' && 
                    !mutation.target.classList.contains('fn__none')) {
                    // 菜单显示时，处理包裹元素
                    this.unwrapMenuItems(mutation.target);
                }
            });
        });

        // 开始观察
        const commonMenu = document.getElementById('commonMenu');
        if (commonMenu) {
            this.observer.observe(commonMenu, {
                attributes: true,
                attributeFilter: ['class']
            });
        }
    }

    unwrapMenuItems(menuElement) {
        // 查找所有带特殊标记的包裹元素
        const wrappers = menuElement.querySelectorAll('[data-menu-wrapper]');
        wrappers.forEach(wrapper => {
            // 将包裹元素的内容移动到父元素
            const parent = wrapper.parentElement;
            while (wrapper.firstChild) {
                parent.insertBefore(wrapper.firstChild, wrapper);
            }
            // 移除包裹元素
            wrapper.remove();
        });
    }

    async loadSFC(sfc) {
        try {
            // 使用vue3-sfc-loader加载模块
            const component = await loadModule('virtual.vue', {
                ...this.options,
                getFile: () => sfc
            });

            // 创建临时Vue应用来解析模板
            const app = createApp(component);
            console.log(app)
            // 注册菜单专用组件
            this.registerMenuComponents(app);

            // 创建实际的Vue实例和DOM
            const { vnode, cleanup } = await this.createVNode(app);

            // 转换为菜单配置
            const config = this.transformToMenuConfig(vnode);

            // 清理DOM
            cleanup();

            return config;
        } catch (error) {
            console.error('加载SFC失败:', error);
            throw error;
        }
    }

    registerMenuComponents(app) {
        // 注册菜单根组件
        app.component('menu-root', {
            render() {
                return h('div', { class: 'menu-root' }, this.$slots.default())
            }
        })

        // 注册菜单项组件
        app.component('menu-item', {
            props: {
                label: String,
                disabled: Boolean,
                checked: Boolean,
                icon: String
            },
            emits: ['click'],
            setup(props, { emit, attrs, slots }) {
                const clickHandler = attrs.onClick || attrs.onClickHandler;
                return {
                    handleClick: clickHandler,
                    slots
                };
            },
            render() {
                const shortcutContent = this.$slots.shortcut?.();
                const defaultContent = this.$slots.default?.();
                console.log(shortcutContent,defaultContent)
                return h('div', {
                    class: 'menu-item',
                    'data-type': 'menu-item',
                    onClick: this.handleClick
                }, [
                    h('span', { class: 'b3-menu__label' }, this.label),
                    shortcutContent,
                    defaultContent
                ])
            }
        })

        // 注册菜单组组件
        app.component('menu-group', {
            props: ['if'],
            render() {
                if (this.if === false) return null;
                return h('div', {
                    class: 'menu-group',
                    'data-type': 'menu-group'
                }, this.$slots.default())
            }
        })

        // 注册分隔符组件
        app.component('menu-separator', {
            render() {
                return h('div', {
                    class: 'menu-separator',
                    'data-type': 'separator',
                    style: 'height: 1px; background-color: #ddd; margin: 5px 0;'
                })
            }
        })
    }

    async createVNode(app) {
        return new Promise(resolve => {
            const root = document.createElement('div');
            root.style.cssText = 'position: absolute; visibility: hidden; pointer-events: none;';
            document.body.appendChild(root);

            const instance = app.mount(root);

            // 添加调试日志
            console.log('Mounted DOM:', root.innerHTML);

            // 收集所有菜单元素
            const menuElements = root.querySelectorAll('[data-type]');
            console.log('Found menu elements:', menuElements);

            const menuConfig = [];
            const processMenuElement = (element) => {
                const type = element.getAttribute('data-type');
                console.log('Processing element:', element, 'type:', type);

                if (type === 'menu-item') {
                    const vueInstance = element.__vueParentComponent;
                    const clickHandler = vueInstance.vnode.props?.onClick || 
                                       vueInstance.vnode.props?.['onUpdate:click'] ||
                                       vueInstance.vnode.props?.onClickHandler;
                    
                    // 克隆内部内容
                    const labelElement = element.querySelector('.b3-menu__label')?.cloneNode(true);
                    const shortcutElement = element.querySelector('.b3-menu__accelerator')?.cloneNode(true);
                    
                    // 添加特殊标记的包裹 div
                    const wrapper = document.createElement('div');
                    wrapper.setAttribute('data-menu-wrapper', 'true');  // 添加特殊标记
                    if (labelElement) wrapper.appendChild(labelElement);
                    if (shortcutElement) wrapper.appendChild(shortcutElement);

                    // 处理子菜单项
                    const childMenuItems = Array.from(element.children)
                        .filter(child => child.getAttribute('data-type') === 'menu-item')
                        .map(child => processMenuElement(child));

                    return {
                        type: 'item',
                        props: {
                            label: vueInstance.props.label,
                            disabled: vueInstance.props.disabled,
                            checked: vueInstance.props.checked,
                            icon: vueInstance.props.icon,
                            element: wrapper,  // 使用包裹的 div
                            subMenu: childMenuItems.length > 0 ? childMenuItems : undefined
                        },
                        handlers: {
                            click: clickHandler
                        }
                    };
                } else if (type === 'separator') {
                    return { type: 'separator' };
                }
            };

            // 只处理顶层菜单项
            menuElements.forEach(element => {
                // 只处理没有菜单项父级的元素（顶层元素）
                if (!element.parentElement.closest('[data-type="menu-item"]')) {
                    menuConfig.push(processMenuElement(element));
                }
            });

            console.log('Final menu config:', menuConfig);

            const cleanup = () => {
                app.unmount();
                root.remove();
            };

            resolve({
                vnode: menuConfig,
                cleanup
            });
        });
    }

    transformToMenuConfig(vnode) {
        return vnode;
    }

    createMenu(config) {
        const menu = new this.clientApi.Menu();
        this.buildMenu(menu, config);
        return menu;
    }

    buildMenu(menu, config) {
        config.forEach(item => {
            switch (item.type) {
                case 'item':
                    const menuItem = {
                        label: item.props.label,
                        disabled: item.props.disabled,
                        checked: item.props.checked,
                        icon: item.props.icon,
                        element: item.props.element
                    };

                    // 如果有子菜单，递归处理
                    if (item.props.subMenu && item.props.subMenu.length > 0) {
                        const submenuItems = [];
                        item.props.subMenu.forEach(subItem => {
                            if (subItem.type === 'separator') {
                                submenuItems.push({ type: 'separator' });
                            } else {
                                submenuItems.push({
                                    label: subItem.props.label,
                                    disabled: subItem.props.disabled,
                                    checked: subItem.props.checked,
                                    icon: subItem.props.icon,
                                    element: subItem.props.element,
                                    click: subItem.handlers.click
                                });
                            }
                        });
                        menuItem.submenu = submenuItems;
                    }

                    // 添加点击处理
                    if (typeof item.handlers.click === 'function') {
                        menuItem.click = (...args) => item.handlers.click(...args);
                    }

                    menu.addItem(menuItem);
                    console.log('Added menu item:', item.props.label, menuItem);
                    break;
                case 'separator':
                    menu.addSeparator();
                    console.log('Added separator');
                    break;
                default:
                    console.warn('Unknown menu item type:', item.type);
            }
        });
    }
}
