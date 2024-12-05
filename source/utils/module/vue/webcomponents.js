import * as Vue from '../../../../static/vue.esm-browser.js'
import * as loader from '../../../../static/vue3-sfc-loader.esm.js'
/**
 * 动态创建 Web Component
 * @param {Object|String} component - Vue组件对象或组件模板字符串
 * @param {String} tagName - Web Component的标签名
 * @param {Object} props - 组件的props定义
 * @returns {Promise<CustomElementConstructor>} 返回已注册的Web Component构造函数
 */
export async function createWebComponent(component, tagName, props = {}) {
    const styleElements = [];
    const asyncModules = {};
    // 处理字符串模板的情况
    if (typeof component === 'string') {
        const mixinOptions = {
            moduleCache: {
                vue: Vue
            },
            getFile(url) {
                if (url === '/component.vue')
                    return Promise.resolve(`
                        <template>${component}</template>
                        <script setup>
                        import { defineProps } from 'vue'
                        const props = defineProps(${JSON.stringify(props)})
                        </script>
                    `);
            },
            addStyle(textContent) {
                const style = Object.assign(document.createElement('style'), { textContent });
                const ref = document.head.getElementsByTagName('style')[0] || null;
                document.head.insertBefore(style, ref);
                styleElements.push(style);
            }
        };
        component = await loader.loadModule('/component.vue', mixinOptions);
    }
    // 使用 Vue 的 defineCustomElement 创建 Web Component
    const CustomElement = Vue.defineCustomElement({
        ...component,
        styles: styleElements.map(el => el.textContent)
    });
    // 检查是否已注册
    if (!customElements.get(tagName)) {
        customElements.define(tagName, CustomElement);
    } else {
        console.warn(`Web Component ${tagName} 已经被注册`);
    }
    return CustomElement;
}

//使用示例:

