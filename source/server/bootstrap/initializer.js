/**
 * 服务器初始化模块
 * 负责初始化服务器环境、配置和基础服务
 */

import '../../utils/hack/hackRequire.js'
import { createVueInterface } from '../../../src/toolBox/feature/useVue/vueComponentLoader.js'
import * as Vue from '../../../static/vue.esm-browser.js'
import * as SfcLoader from '../../../static/vue3-sfc-loader.esm.js'
import { 日志 } from '../../../src/toolBox/base/useEcma/forLogs/useLogger.js'
import { 初始化日志系统, 数据库, 格式化器, 处理器 } from '../utils/logs/index.js'

const channel = new BroadcastChannel('SACAssets')
window.channel = channel

/**
 * 处理广播通道消息
 * 设置全局配置并初始化服务
 */
channel.onmessage = (e) => {
    const path = require('path')
    if (!window.siyuanConfig && e.data && e.data.type && e.data.type === 'siyuanConfig') {
        window.siyuanConfig = e.data.data
        window.appID = e.data.app
        window.siyuanPort = e.data.siyuanPort
        window.require.setExternalBase(path.join(siyuanConfig.system.workspaceDir, '/data/plugins/SACAssetsManager/node_modules/'))
        window.require.setExternalDeps(path.join(siyuanConfig.system.workspaceDir, '/data/plugins/SACAssetsManager/node_modules/'))
        window.externalBase = path.join(siyuanConfig.system.workspaceDir, '/data/plugins/SACAssetsManager/node_modules/')
        window.workspaceDir = siyuanConfig.system.workspaceDir
        window.port = e.data.port
        if (window.require) {
            import("./serverStarter.js")
        }
    }
}

/**
 * 初始化图片静态服务
 */
export const initializeStaticImageService = async () => {
    const webview = document.querySelector('webview')
    if (webview.src !== 'about:blank') {
        return
    }
    if (window.externalBase) {
        try {
            webview.src = `./imageStaticService.html?externalBase=${window.externalBase.replace(/\\/g, '/')}&port=${window.port + 1}`
            webview.openDevTools();
        } catch (e) {
            console.error('启用静态图片服务器失败:', e);
        }
    } else {
        setTimeout(() => {
            initializeStaticImageService()
        }, 100)
    }
}

/**
 * 初始化日志组件
 */
export const initializeLogComponent = async () => {
    try {
        // 等待DOM元素存在
        const logApp = document.getElementById('logApp');
        if (!logApp) {
            throw new Error('找不到日志容器元素');
        }

        // 初始化日志系统
        await 初始化日志系统();

        // 创建Vue日志组件
        try {
            const 组件接口 = await createVueInterface(
                logApp, 
                '/plugins/SACAssetsManager/source/UI/pannels/logViewer.vue',
                'log-viewer',
                {}
            );
            
            if (!组件接口) {
                throw new Error('日志组件接口创建失败');
            }
            
            console.log('日志组件创建成功');
        } catch (错误) {
            console.error('创建Vue接口失败:', 错误);
            
            // 如果Vue组件创建失败，回退到简单日志显示
            logApp.innerHTML = `
                <div style="padding: 20px; background: #161b22; color: #c9d1d9;">
                    <h3>日志组件加载失败</h3>
                    <p>错误信息: ${错误.message}</p>
                    <p>错误堆栈: ${错误.stack}</p>
                </div>
            `;
        }

        setupLogInterception();
    } catch (error) {
        console.error('初始化日志组件失败:', error);
    }
}

/**
 * 设置日志拦截
 * 重写console方法以支持UI日志显示
 */
const setupLogInterception = () => {
    // 保存原始console方法
    const 原始console = {
        log: console.log,
        warn: console.warn,
        error: console.error,
        debug: console.debug
    };

    // 标记是否正在处理日志，防止循环调用
    let 正在处理日志 = false;

    // 开发模式标志（可通过全局变量控制）
    const 开发模式 = window.开发模式 === true;

    const 发送日志 = (级别, args) => {
        try {
            // 如果已经在处理日志中，不再发送消息，防止循环
            if (正在处理日志) {
                return;
            }
            正在处理日志 = true;
            
            const 日志 = 格式化器.格式化日志(级别, args, 'Console');
            window.postMessage({ type: 'log', log: 日志 }, '*');
            
            正在处理日志 = false;
        } catch (e) {
            正在处理日志 = false;
            原始console.error('发送日志失败:', e);
        }
    };

    // 创建节流日志发送函数
    const 节流发送日志 = 处理器.创建节流函数(发送日志, 50);

    // 替换控制台方法
    console.log = (...args) => {
        // 防止循环日志
        if (args.length > 0 && 
            typeof args[0] === 'string' && 
            (args[0].includes('接收到日志消息') || args[0].includes('操作日志'))) {
            原始console.log.apply(console, args);
            return;
        }
        
        // 仅在开发模式下在控制台输出
        if (开发模式) {
            原始console.log.apply(console, args);
        }
        
        // 始终发送到UI日志
        节流发送日志('info', args);
    };

    console.warn = (...args) => {
        if (args.length > 0 && 
            typeof args[0] === 'string' && 
            (args[0].includes('接收到日志消息') || args[0].includes('操作日志'))) {
            原始console.warn.apply(console, args);
            return;
        }
        
        // 警告级别，即使在非开发模式下也在控制台显示
        原始console.warn.apply(console, args);
        节流发送日志('warn', args);
    };

    console.error = (...args) => {
        if (args.length > 0 && 
            typeof args[0] === 'string' && 
            (args[0].includes('接收到日志消息') || args[0].includes('操作日志'))) {
            原始console.error.apply(console, args);
            return;
        }
        
        // 错误级别，始终在控制台显示
        原始console.error.apply(console, args);
        节流发送日志('error', args);
    };

    console.debug = (...args) => {
        if (args.length > 0 && 
            typeof args[0] === 'string' && 
            (args[0].includes('接收到日志消息') || args[0].includes('操作日志'))) {
            原始console.debug.apply(console, args);
            return;
        }
        
        // 调试级别，仅在开发模式下在控制台输出
        if (开发模式) {
            原始console.debug.apply(console, args);
        }
        
        // 始终发送到UI日志
        节流发送日志('debug', args);
    };

    // 导出日志组件方法
    window.日志组件 = {
        添加日志: (日志) => {
            // 确保日志对象格式正确
            if (typeof 日志 === 'object' && 日志.级别 && 日志.消息) {
                window.postMessage({ type: 'log', log: 日志 }, '*');
            } else {
                console.warn('日志格式不正确', 日志);
            }
        }
    };
}

// 监听DOM加载完成后初始化组件
window.addEventListener('DOMContentLoaded', async () => {
    await initializeLogComponent();
    initializeStaticImageService();
}); 