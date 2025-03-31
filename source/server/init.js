/***
 * 这个的作用是替换掉原本的require
 * 使服务能够使用require从自定义的node_modules中加载模块
*/
import '../utils/hack/hackRequire.js'
import { createVueInterface } from '../../src/toolBox/feature/useVue/vueComponentLoader.js'
import * as Vue from '../../static/vue.esm-browser.js'
import * as SfcLoader from '../../static/vue3-sfc-loader.esm.js'

// 等待Vue环境注入
const 等待Vue环境 = () => {
    return new Promise((resolve) => {
        const 检查Vue = () => {
            if (window.Vue) {
                resolve(window.Vue);
            } else {
                setTimeout(检查Vue, 100);
            }
        };
        检查Vue();
    });
};

const channel = new BroadcastChannel('SACAssets')
window.channel = channel
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
            import("./server.js")
        }
    }
}
const modifyWebview = async () => {
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
            modifyWebview()
        }, 100)
    }
}

window.onload = async () => {
    const logAppContainer = document.getElementById('logApp')
    logAppContainer.innerHTML = '<button id="forceButton">强制取得数据库控制</button><div id="logContainer"></div>'
    document.getElementById('forceButton').addEventListener(
        'click', async () => {
            if (confirm('确定要强制释放所有文件锁吗?当且仅当切换SACAssetsManager的主工作空间时使用。')) {
                await window.强制释放所有文件锁()
                window.location.reload()
            }
        }
    )
    
    // 创建日志组件
    const 创建日志组件 = async () => {
        try {
            const Vue = await 等待Vue环境();
            const app = await createVueInterface(
                { element: logAppContainer },
                '/plugins/SACAssetsManager/source/UI/pannels/logViewer.vue',
                'log-viewer',
                {}
            );
            
            // 保存日志组件实例
            window.日志组件 = app._instance.proxy;
            
            return app;
        } catch (错误) {
            console.error('加载日志组件失败:', 错误);
            return null;
        }
    };

    // 修改日志处理函数
    const 处理日志 = (消息) => {
        if (window.日志组件) {
            window.日志组件.添加日志({
                级别: 消息.类型 || 'info',
                内容: 消息.内容 || 消息
            });
        }
    };

    // 初始化时创建日志组件
    const 初始化 = async () => {
        try {
            await 创建日志组件();
            console.log('日志组件初始化成功');
        } catch (错误) {
            console.error('日志组件初始化失败:', 错误);
        }
    };

    // 启动初始化
    初始化();

    // 创建日志元素池
    const logElementPool = {
        elements: [],
        maxSize: 1000,
        get: function() {
            if (this.elements.length > 0) {
                return this.elements.pop();
            } else {
                const el = document.createElement('div');
                el.className = 'log';
                return el;
            }
        },
        release: function(element) {
            if (this.elements.length < this.maxSize) {
                // 清空元素内容以释放内存
                element.textContent = '';
                element.className = 'log';
                this.elements.push(element);
            }
        }
    };

    // 虚拟化日志容器
    const logContainer = document.getElementById('logContainer');
    logContainer.style.cssText = 'height: calc(100% - 30px); overflow-y: auto; position: relative;';
    
    const logs = [];
    const maxVisibleLogs = 500;  // 最大可见日志条数
    const bufferSize = 50;       // 缓冲区大小
    
    // 拦截console.log等方法
    const originalMethods = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info
    };

    // 根据日志类型设置样式
    const getLogClass = (type) => {
        switch(type) {
            case 'error': return 'log error';
            case 'warn': return 'log warning';
            case 'info': return 'log info';
            default: return 'log';
        }
    };
    
    // 批量更新DOM的函数，使用requestAnimationFrame进行优化
    let isRenderPending = false;
    const renderLogs = () => {
        if (isRenderPending) return;
        
        isRenderPending = true;
        requestAnimationFrame(() => {
            const fragment = document.createDocumentFragment();
            
            // 计算应该显示的日志范围
            const startIdx = Math.max(0, logs.length - maxVisibleLogs);
            const endIdx = logs.length;
            
            // 清空容器
            while (logContainer.firstChild) {
                const element = logContainer.firstChild;
                logContainer.removeChild(element);
                logElementPool.release(element);
            }
            
            // 添加可见的日志
            for (let i = startIdx; i < endIdx; i++) {
                const log = logs[i];
                const logElement = logElementPool.get();
                logElement.textContent = log.text;
                logElement.className = log.class;
                fragment.appendChild(logElement);
            }
            
            logContainer.appendChild(fragment);
            
            // 如果用户在底部，则自动滚动
            if (logContainer.scrollHeight - logContainer.scrollTop <= logContainer.clientHeight + 50) {
                logContainer.scrollTop = logContainer.scrollHeight;
            }
            
            isRenderPending = false;
        });
    };
    
    // 限制日志数量的函数
    const limitLogs = () => {
        if (logs.length > maxVisibleLogs + bufferSize) {
            // 保留最新的日志
            logs.splice(0, logs.length - maxVisibleLogs);
        }
    };
    
    // 自定义console方法
    console.log = function(...args) {
        // 原始输出到控制台
        originalMethods.log.apply(console, args);
        
        // 添加到日志显示
        logs.push({
            text: args.join(' '),
            class: getLogClass('log'),
            time: Date.now()
        });
        
        limitLogs();
        renderLogs();
    };
    
    console.error = function(...args) {
        originalMethods.error.apply(console, args);
        logs.push({
            text: args.join(' '),
            class: getLogClass('error'),
            time: Date.now()
        });
        limitLogs();
        renderLogs();
    };
    
    console.warn = function(...args) {
        originalMethods.warn.apply(console, args);
        logs.push({
            text: args.join(' '),
            class: getLogClass('warn'),
            time: Date.now()
        });
        limitLogs();
        renderLogs();
    };
    
    console.info = function(...args) {
        originalMethods.info.apply(console, args);
        logs.push({
            text: args.join(' '),
            class: getLogClass('info'),
            time: Date.now()
        });
        limitLogs();
        renderLogs();
    };
    
    // 添加清除日志的功能
    window.clearLogs = function() {
        logs.length = 0;
        renderLogs();
    };

    const webview = document.querySelector('webview')
    webview.addEventListener('dom-ready', modifyWebview);
}
