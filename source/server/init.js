/***
 * 这个的作用是替换掉原本的require
 * 使服务能够使用require从自定义的node_modules中加载模块
*/
import '../utils/hack/hackRequire.js'
import { createVueInterface } from '../../src/toolBox/feature/useVue/vueComponentLoader.js'
import { 日志 } from '../../src/toolBox/base/useEcma/forLogs/useLogger.js'
import { 初始化日志系统, 数据库, 格式化器, 处理器 } from './utils/logs/index.js'

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

// 创建日志组件
const 创建日志组件 = async () => {
    try {
        // 等待DOM元素存在
        const logApp = document.getElementById('logApp');
        if (!logApp) {
            throw new Error('找不到日志容器元素');
        }

        // 创建并挂载组件
        console.log("开始加载日志组件...");

        // 初始化日志系统
        await 初始化日志系统();

        // 监听消息事件，用于初始测试
        window.addEventListener('message', (事件) => {
            if (事件.data && 事件.data.type === 'log') {
                // 注释掉此行，防止形成循环日志
                // console.log("接收到日志消息:", 事件.data.log);
            }
        });

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

        // 重写console方法
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
                if (日志 && typeof 日志 === 'object') {
                    // 使用格式化器处理日志
                    const 处理后日志 = 格式化器.格式化日志(
                        日志.级别 || 'info',
                        日志.内容 || '',
                        日志.来源 || 'System'
                    );
                    window.postMessage({ type: 'log', log: 处理后日志 }, '*');
                }
            }
        };

        日志.信息('日志系统初始化完成', 'System');
    } catch (error) {
        console.error('日志组件初始化失败:', error);
    }
};


// 确保在DOM加载完成后创建日志组件
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', 创建日志组件);
} else {
    创建日志组件();
}

modifyWebview()
