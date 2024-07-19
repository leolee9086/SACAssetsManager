import * as Vue from '../../../static/vue.esm-browser.js'
import { loadModule } from '../../../static/vue3-sfc-loader.esm.js'
import * as runtime from '../../asyncModules.js';
import pickr from '../../../static/pickr-esm2022.js'

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


export const initVueApp = (appURL, name, mixinOptions = {}, directory = `${siyuan.config.system.workspaceDir}/data/plugins/${runtime.plugin.name}/source/UI/components`, data) => {
    const asyncModules = {}
    const styleElements = []
    const options = {
        moduleCache: {
            ...moduleCache
        },
        async getFile(url) {
            console.log(url)

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
