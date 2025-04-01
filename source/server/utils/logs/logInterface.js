/**
 * 日志界面接口模块
 * 用于创建和管理日志显示组件
 * 
 * 本模块提供了日志界面相关的功能，包括：
 * 1. 创建基于Vue的日志显示组件
 * 2. 提供备用的纯HTML日志显示
 * 3. 重写console方法，将日志导向界面
 * 4. 提供日志接口给其他模块使用
 */
import { createVueInterface } from '../../../../src/toolBox/feature/useVue/vueComponentLoader.js'
import { 格式化器, 处理器 } from './index.js'

/**
 * 创建Vue日志组件
 * @param {HTMLElement} 容器元素 - 挂载日志组件的DOM元素
 * @returns {Promise<Object|null>} 组件接口或null（创建失败时）
 */
const 创建Vue日志组件 = async (容器元素) => {
    try {
        const 组件接口 = await createVueInterface(
            容器元素, 
            '/plugins/SACAssetsManager/source/UI/pannels/logViewer.vue',
            'log-viewer',
            {}
        )
        
        console.log('日志组件创建成功')
        return 组件接口
    } catch (错误) {
        console.error('创建Vue日志组件失败:', 错误)
        return null
    }
}

/**
 * 创建回退日志显示
 * @param {HTMLElement} 容器元素 - 要显示回退日志的DOM元素
 * @param {Error} 错误 - 导致回退的错误
 */
const 创建回退日志显示 = (容器元素, 错误) => {
    容器元素.innerHTML = `
        <div style="padding: 20px; background: #161b22; color: #c9d1d9;">
            <h3>日志组件加载失败</h3>
            <p>错误信息: ${错误.message}</p>
            <p>错误堆栈: ${错误.stack}</p>
        </div>
    `
}

/**
 * 重写控制台日志方法
 * @param {boolean} 开发模式 - 是否在开发模式下
 * @returns {Object} 原始的console方法集
 */
const 重写控制台方法 = (开发模式 = false) => {
    // 保存原始console方法
    const 原始console = {
        log: console.log,
        warn: console.warn,
        error: console.error,
        debug: console.debug
    }

    // 标记是否正在处理日志，防止循环调用
    let 正在处理日志 = false

    const 发送日志 = (级别, args) => {
        try {
            // 如果已经在处理日志中，不再发送消息，防止循环
            if (正在处理日志) {
                return
            }
            正在处理日志 = true
            
            const 日志内容 = 格式化器.格式化日志(级别, args, 'Console')
            window.postMessage({ type: 'log', log: 日志内容 }, '*')
            
            正在处理日志 = false
        } catch (e) {
            正在处理日志 = false
            原始console.error('发送日志失败:', e)
        }
    }

    // 创建节流日志发送函数
    const 节流发送日志 = 处理器.创建节流函数(发送日志, 50)

    // 检查是否为内部日志
    const 是内部日志 = (args) => {
        return args.length > 0 && 
            typeof args[0] === 'string' && 
            (args[0].includes('接收到日志消息') || args[0].includes('操作日志'))
    }

    // 替换控制台方法
    console.log = (...args) => {
        if (是内部日志(args)) {
            原始console.log.apply(console, args)
            return
        }
        
        // 仅在开发模式下在控制台输出
        if (开发模式) {
            原始console.log.apply(console, args)
        }
        
        // 始终发送到UI日志
        节流发送日志('info', args)
    }

    console.warn = (...args) => {
        if (是内部日志(args)) {
            原始console.warn.apply(console, args)
            return
        }
        
        // 警告级别，即使在非开发模式下也在控制台显示
        原始console.warn.apply(console, args)
        节流发送日志('warn', args)
    }

    console.error = (...args) => {
        if (是内部日志(args)) {
            原始console.error.apply(console, args)
            return
        }
        
        // 错误级别，始终在控制台显示
        原始console.error.apply(console, args)
        节流发送日志('error', args)
    }

    console.debug = (...args) => {
        if (是内部日志(args)) {
            原始console.debug.apply(console, args)
            return
        }
        
        // 调试级别，仅在开发模式下在控制台输出
        if (开发模式) {
            原始console.debug.apply(console, args)
        }
        
        // 始终发送到UI日志
        节流发送日志('debug', args)
    }

    return 原始console
}

/**
 * 暴露日志方法到全局
 */
const 暴露日志方法 = () => {
    window.日志组件 = {
        添加日志: (日志) => {
            // 确保日志对象格式正确
            if (日志 && typeof 日志 === 'object') {
                // 使用格式化器处理日志
                const 处理后日志 = 格式化器.格式化日志(
                    日志.级别 || 'info',
                    日志.内容 || '',
                    日志.来源 || 'System'
                )
                window.postMessage({ type: 'log', log: 处理后日志 }, '*')
            }
        }
    }
}

export {
    创建Vue日志组件,
    创建回退日志显示,
    重写控制台方法,
    暴露日志方法
} 