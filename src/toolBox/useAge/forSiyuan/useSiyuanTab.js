/**
 * 思源笔记页签管理工具函数
 * 
 * 本模块提供思源笔记页签相关功能:
 * - 打开附件面板
 * - 打开笔记本资源视图
 * - 打开笔记资源视图
 * - 打开标签资源视图
 * - 打开本地资源视图
 * - 打开efu文件视图
 * - 打开颜色资源视图
 * - 打开搜索面板
 * 
 * @module useSiyuanTab
 * @author YourName
 * @version 1.0.0
 */

import { 检查思源环境 } from '../useSiyuan.js';

/**
 * 打开附件面板
 * 
 * @function 打开附件面板
 * @param {Object} custom - 自定义配置项
 * @param {Object} options - 附加选项
 * @param {Object} pluginInstance - 插件实例
 * @returns {Object|undefined} 打开的页签对象
 */
export function 打开附件面板(custom, options = {}, pluginInstance) {
    检查思源环境();
    
    const app = window.siyuan?.ws?.app?.plugins?.find(p => p.name === pluginInstance.name)?.data?.app;
    const clientApi = window.siyuan?.ws?.app?.plugins?.find(p => p.name === pluginInstance.name)?.data?.clientApi;
    
    if (!app || !clientApi) {
        console.error('无法获取应用实例或客户端API');
        return;
    }
    
    const assetsTabID = pluginInstance.name + "AssetsTab";
    return clientApi.openTab({
        app: app,
        custom: { ...custom, id: assetsTabID },
        ...options
    });
}

export const openAssetsPanel = 打开附件面板;

/**
 * 打开笔记本资源视图
 * 
 * @function 打开笔记本资源视图
 * @param {string} box - 笔记本ID
 * @param {Object} pluginInstance - 插件实例
 * @returns {Object|undefined} 打开的页签对象
 */
export function 打开笔记本资源视图(box, pluginInstance) {
    return 打开附件面板({
        icon: "iconAssets",
        title: "资源:笔记本",
        data: {
            box
        },
    }, {}, pluginInstance);
}

export const openNotebookAssetsView = 打开笔记本资源视图;

/**
 * 打开笔记资源视图
 * 
 * @function 打开笔记资源视图
 * @param {string} block_id - 块ID
 * @param {Object} pluginInstance - 插件实例
 * @returns {Object|undefined} 打开的页签对象
 */
export function 打开笔记资源视图(block_id, pluginInstance) {
    return 打开附件面板({
        icon: "iconAssets",
        title: "资源:笔记",
        data: {
            block_id
        },
    }, {}, pluginInstance);
}

export const openDocumentAssetsView = 打开笔记资源视图;

/**
 * 打开标签资源视图
 * 
 * @function 打开标签资源视图
 * @param {string} tagLabel - 标签名称
 * @param {Object} pluginInstance - 插件实例
 * @returns {Object|undefined} 打开的页签对象
 */
export function 打开标签资源视图(tagLabel, pluginInstance) {
    return 打开附件面板({
        icon: "iconAssets",
        title: "资源:标签",
        data: {
            tagLabel
        },
    }, {}, pluginInstance);
}

export const openTagAssetsView = 打开标签资源视图;

/**
 * 打开本地资源视图
 * 
 * @function 打开本地资源视图
 * @param {string} localPath - 本地路径
 * @param {Object} pluginInstance - 插件实例
 * @returns {Object|undefined} 打开的页签对象
 */
export function 打开本地资源视图(localPath, pluginInstance) {
    检查思源环境();
    
    if (!localPath.endsWith('/')) {
        localPath += '/';
    }
    
    // 如果插件有最近打开本地文件夹列表，添加此路径
    if (pluginInstance.最近打开本地文件夹列表 instanceof Set) {
        pluginInstance.最近打开本地文件夹列表.add(localPath);
    }
    
    return 打开附件面板({
        icon: "iconAssets",
        title: "资源:本地",
        data: {
            localPath
        },
    }, {}, pluginInstance);
}

export const openLocalAssetsView = 打开本地资源视图;

/**
 * 打开efu文件视图页签
 * 
 * @function 打开efu文件视图页签
 * @param {string} efuPath - EFU文件路径
 * @param {Object} pluginInstance - 插件实例
 * @returns {Object|undefined} 打开的页签对象
 */
export function 打开efu文件视图页签(efuPath, pluginInstance) {
    const formattedPath = efuPath.replace(/\\/g, '/');
    
    return 打开附件面板({
        icon: "iconAssets",
        title: "资源:efu文件列表",
        data: {
            efuPath: formattedPath
        },
    }, {}, pluginInstance);
}

export const openEfuFileView = 打开efu文件视图页签;

/**
 * 打开颜色资源视图
 * 
 * @function 打开颜色资源视图
 * @param {string} color - 颜色值
 * @param {Object} pluginInstance - 插件实例
 * @returns {Object|undefined} 打开的页签对象
 */
export function 打开颜色资源视图(color, pluginInstance) {
    return 打开附件面板({
        icon: "iconAssets",
        title: "资源:颜色",
        data: {
            color
        },
    }, {}, pluginInstance);
}

export const openColorAssetsView = 打开颜色资源视图;

/**
 * 打开everything搜索面板
 * 
 * @function 打开everything搜索面板
 * @param {string} everythingApiLocation - Everything API位置
 * @param {Object} pluginInstance - 插件实例
 * @returns {Object|undefined} 打开的页签对象
 */
export function 打开everything搜索面板(everythingApiLocation, pluginInstance) {
    return 打开附件面板({
        icon: "iconAssets",
        title: "资源:everything搜索",
        data: {
            type: "thirdParty",
            provider: 'everything',
            everythingApiLocation
        },
    }, {}, pluginInstance);
}

export const openEverythingSearchPanel = 打开everything搜索面板;

/**
 * 打开anytxt搜索面板
 * 
 * @function 打开anytxt搜索面板
 * @param {string} anytxtApiLocation - Anytxt API位置
 * @param {Object} pluginInstance - 插件实例
 * @returns {Object|undefined} 打开的页签对象
 */
export function 打开anytxt搜索面板(anytxtApiLocation, pluginInstance) {
    return 打开附件面板({
        icon: "iconAssets",
        title: "资源:anytxt搜索",
        data: {
            type: "thirdParty",
            provider: 'anytxt',
            anytxtApiLocation
        },
    }, {}, pluginInstance);
}

export const openAnytxtSearchPanel = 打开anytxt搜索面板;

/**
 * 注册页签事件处理函数
 * 
 * @function 注册页签事件处理函数
 * @param {Object} eventBus - 事件总线
 * @param {Object} tabEvents - 页签事件定义
 * @param {Object} pluginInstance - 插件实例
 */
export function 注册页签事件处理函数(eventBus, tabEvents, pluginInstance) {
    检查思源环境();

    // 注册打开附件面板事件
    eventBus.on(
        tabEvents.打开附件面板, (event) => {
            打开附件面板({icon: "iconAssets", title: event.detail.title || "资源", data: event.detail.data}, event.detail.options, pluginInstance);
        }
    );
    
    // 注册打开笔记本资源视图事件
    eventBus.on(
        tabEvents.打开笔记本资源视图, (event) => {
            打开笔记本资源视图(event.detail.data.box, pluginInstance);
        }
    );
    
    // 注册打开笔记资源视图事件
    eventBus.on(
        tabEvents.打开笔记资源视图, (event) => {
            打开笔记资源视图(event.detail, pluginInstance);
        }
    );
    
    // 注册标签点击事件
    eventBus.on(
        'click-tag-item', (event) => {
            打开标签资源视图(event.detail, pluginInstance);
        }
    );
    
    // 注册本地文件图标点击事件
    eventBus.on(
        'click-galleryLocalFIleicon', (event) => {
            打开本地资源视图(event.detail, pluginInstance);
        }
    );
    
    // 注册颜色点击事件
    eventBus.on(
        'click-galleryColor', (event) => {
            打开颜色资源视图(event.detail, pluginInstance);
        }
    );
    
    // 注册打开本地文件夹事件
    eventBus.on(
        'open-localfoldertab', (event) => {
            const path = require('path').dirname(event.detail);
            打开本地资源视图(path, pluginInstance);
        }
    );
}

export const registerTabEventHandlers = 注册页签事件处理函数;

/**
 * 页签生命周期管理
 * 
 * @function 监控页签状态
 * @param {Object} tab - 页签对象
 * @param {Function} onDestroy - 销毁时的回调函数
 */
export function 监控页签状态(tab, onDestroy) {
    if (!tab) return;
    
    // 使用MutationObserver监控页签状态
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && 
                mutation.removedNodes.length > 0 &&
                Array.from(mutation.removedNodes).some(node => 
                    node.contains && node.contains(tab.element))) {
                
                // 页签被移除
                if (typeof onDestroy === 'function') {
                    onDestroy();
                }
                observer.disconnect();
                break;
            }
        }
    });
    
    // 开始监控
    const workspace = document.querySelector('#layouts');
    if (workspace) {
        observer.observe(workspace, { childList: true, subtree: true });
    }
    
    return observer;
}

export const monitorTabStatus = 监控页签状态; 