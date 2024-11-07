import * as Vue from '../../../static/vue.esm-browser.js'
import { loadModule } from '../../../static/vue3-sfc-loader.esm.js'
import * as loader from "../../../static/vue3-sfc-loader.esm.js"
import * as runtime from '../../asyncModules.js';
import pickr from '../../../static/pickr-esm2022.js'
import { extractDeclaredVarsInNodeDefine } from '../../utils/codeLoaders/js/lexicalAnalyzer.js';
/**
 * 同步函数，返回一个异步组件封装，组件名称是动态的。
 * 
 * @param {string} sfcUrl - Vue SFC文件的URL。
 * @returns {Object} - 包含动态组件名称、异步组件和接口获取方法的对象。
 */
export function loadVueComponentAsNodeSync(sfcUrl) {
    const moduleCache = {
        vue: Vue
    };

    const asyncModules = {

    }
    let nodeDefine = null;
    const styleElements = [];
    const mixinOptions = {
        moduleCache: {
            ...moduleCache
        },
        handleModule(type, source, path, options) {
            if (type === '.json') {
                return JSON.parse(source);
            }
            if (type === '.js') {
                return asyncModules[path]
            }

        },
        async getFile(url) {
            let realURL = url
            const urlObj1 = new URL(url, window.location.origin);
            if (urlObj1.pathname.endsWith('.vue.mjs')) {
                realURL = url.replace('.vue.mjs', '.vue')
            }
            if (url.endsWith('.js')) {
                if (!asyncModules[url]) {
                    let module = await import(url)
                    asyncModules[url] = module
                }
            }
            const res = await fetch(realURL);
            if (!res.ok) {
                throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
            }
            const content = await res.text();
            const urlObj = new URL(url, window.location.origin);
            // 检查 URL 是否为 .vue 文件且包含 ?asNode=true 参数
            if (urlObj.pathname.endsWith('.vue.mjs') && urlObj.searchParams.get('asNode') === 'true') {
                // 仅解析 nodeDefine 块
                const nodeDefineMatch = content.match(/<script nodeDefine>([\s\S]*?)<\/script>/);
                if (nodeDefineMatch) {
                    try {
                        nodeDefine = nodeDefineMatch[1]+`
                        \n export const scope = {${extractDeclaredVarsInNodeDefine(nodeDefineMatch[1])}}
                        `
                    } catch (error) {
                        console.error('Failed to parse nodeDefine block:', error);
                    }
                }
                return { getContentData: asBinary => nodeDefineMatch ? nodeDefine : `` };
            }
            if (urlObj.pathname.endsWith('.vue') && urlObj.searchParams.get('asNode') === 'true') {
                // 剔除解析 nodeDefine 块
                const nodeDefineRegex = /<script nodeDefine>[\s\S]*?<\/script>/g;
                const nodeDefineMatch = content.match(/<script nodeDefine>([\s\S]*?)<\/script>/);
                if (nodeDefineMatch) {
                    try {
                        nodeDefine = nodeDefineMatch[1];
                    } catch (error) {
                        console.error('Failed to parse nodeDefine block:', error);
                    }
                }

                const contentWithoutNodeDefine = content.replace(
                    nodeDefineRegex,
                    `<script nodeDefineRuntime>
                      let {${Object.getOwnPropertyNames(window[Symbol.for(urlObj.searchParams.get('ScopeId'))])}} = window[Symbol.for("${urlObj.searchParams.get('ScopeId')}")]
                    </script>`
                );
                return { getContentData: asBinary => contentWithoutNodeDefine };
            }

            return {
                getContentData: asBinary => asBinary ? res.arrayBuffer() : content,
            };
        },
        addStyle(textContent) {
            const style = Object.assign(document.createElement('style'), { textContent });
            const ref = document.head.getElementsByTagName('style')[0] || null;
            document.head.insertBefore(style, ref);
            styleElements.push(style);
        },
    };


    return {
        getComponent: async (scope) => {
            if (!scope) {
                return await loadModule(sfcUrl.trim(), mixinOptions)
            }
            const component = await loadModule(sfcUrl.trim(), mixinOptions)
            let { __scopeId } = component
            window[Symbol.for(__scopeId)] = scope
            const newComponent = await loadModule(sfcUrl.trim() + `?asNode=true&&ScopeId=${__scopeId}`, mixinOptions)
            return newComponent;
        },
        getNodeDefineScope: async (id) => {
            let scope = (await loader.loadModule(sfcUrl.trim() + `.mjs?asNode=true&&id=${id}`, mixinOptions)).scope
           
            console.log(scope,id)
            return scope
        }
    };
}
const moduleCache = {
    vue: Vue,
    runtime: runtime,
    eventBus: runtime.plugin.eventBus,
    pickr
}
let watched = {}
let { ref, reactive } = Vue
function fixURL(url) {
    if (url.startsWith('http:/') && !url.startsWith('http://')) {
        return url.replace('http:/', 'http://');
    }
    return url;
}

/**
 * 初始化一个带有动态组件加载和可选目录监视功能的Vue应用程序。
 * 
 * @param {Object} appURL - 表示要加载的Vue组件的URL或对象。
 * @param {string} name - Vue组件的名称。
 * @param {Object} [mixinOptions={}] - 可选的mixin选项，用于与组件选项合并。
 * @param {string} [directory] - 可选的目录，用于监视文件变化。
 * @param {Object} data - 提供给Vue应用程序的响应式数据。
 * @returns {Object} - 初始化的Vue应用程序实例。
 */

export const cc = (props) => {
    return (string) => {
        function useAllProps(props, context, Vue) {
            const _props = Object.entries(props).reduce((refs, [key, value]) => {
                refs[key] = Vue.toRef(props, key);
                return refs;
            }, {});
            return _props
        }

        let mixinOptions = {
            moduleCache: {
                ...moduleCache
            },
            getFile(url) {
                if (url === '/myComponent.vue')
                    return Promise.resolve(`<template>${string}</template><script setup>
            import {defineProps} from 'vue'
            const  props = defineProps(${JSON.stringify(props)})
            ${useAllProps.toString()}
            </script>`);
            },
            handleModule(type, source, path, options) {
                if (type === '.json') {
                    return JSON.parse(source);
                }
                if (type === '.js') {
                    return asyncModules[path]
                }

            },

            addStyle(textContent) {
                const style = Object.assign(document.createElement('style'), { textContent });
                const ref = document.head.getElementsByTagName('style')[0] || null;
                document.head.insertBefore(style, ref);
                styleElements.push(style)
            },

        };
        let component = Vue.defineAsyncComponent(() => loadModule('/myComponent.vue', mixinOptions))
        return component;
    }
}
export const initVueApp = (appURL, name, mixinOptions = {}, directory = `${siyuan.config.system.workspaceDir}/data/plugins/${runtime.plugin.name}/source/UI/components`, data) => {
    const asyncModules = {}
    const styleElements = []
    const options = {
        moduleCache: {
            ...moduleCache
        },
        async getFile(url) {
            const res = await fetch(fixURL(url));
            if (!res.ok) {
                throw Object.assign(new Error(res.statusText + ' ' + url), { res });
            }
            if (url.endsWith('.js')) {
                if (!asyncModules[url]) {
                    let module = await import(url)
                    asyncModules[url] = module
                }
            }
            return {
                getContentData: asBinary => asBinary ? res.arrayBuffer() : res.text(),
            }
        },
        handleModule(type, source, path, options) {
            if (type === '.json') {
                return JSON.parse(source);
            }
            if (type === '.js') {
                return asyncModules[path]
            }

        },

        addStyle(textContent) {
            const style = Object.assign(document.createElement('style'), { textContent });
            const ref = document.head.getElementsByTagName('style')[0] || null;
            document.head.insertBefore(style, ref);
            styleElements.push(style)
        },
    }

    let oldApp
    let _args
    let f = () => {
        try {
            styleElements.forEach(el => {
                el.remove()
            })
            oldApp ? oldApp.unmount : null
            let obj = { ...options, ...mixinOptions }
            obj.moduleCache = { ...moduleCache }
            let componentsCache = {}
            componentsCache[name] = appURL.render ? appURL : Vue.defineAsyncComponent(() => loadModule(appURL, obj))
            let app = Vue.createApp({
                components: componentsCache,
                template: `<${name}></${name}>`,
                setup() {
                    const dataReactive = reactive(data);
                    app.provide('appData', dataReactive);
                }
            },)
            try {
                if (window.require && directory) {
                    watched[directory] = true
                    let _mount = app.mount
                    app.mount = (...args) => {
                        _args = args;
                        _mount.bind(app)(...args)
                    }
                }
                app.styleElements = styleElements
                return app
            } catch (e) {
                return oldApp
            }
        } catch (e) {
            console.warn(e)
            oldApp.styleElements = styleElements
            return oldApp
        }
    }
    oldApp = f()
    if (window.require) {
        const fs = require('fs');
        const path = require('path');
        let previousContents = {};
        function watchDirectory(directory) {
            fs.readdirSync(directory).forEach(file => {
                let filePath = path.join(directory, file);
                let stats = fs.statSync(filePath);
                if (stats.isFile()) {
                    previousContents[filePath] = fs.readFileSync(filePath, 'utf-8');
                    fs.watchFile(filePath, (curr, prev) => {
                        let currentContent = fs.readFileSync(filePath, 'utf-8');
                        if (currentContent !== previousContents[filePath]) {
                            try {
                                oldApp.styleElements.forEach(el => el.remove())
                            } catch (e) {
                                console.error(e)
                            }
                            oldApp.unmount();
                            oldApp = f();
                            oldApp.mount(..._args);
                            previousContents[filePath] = currentContent;
                        }
                    });
                } else if (stats.isDirectory()) {
                    watchDirectory(filePath);  // Recursively watch subdirectories
                }
            });
        }
        directory && watchDirectory(directory);
    }
    return oldApp
}
