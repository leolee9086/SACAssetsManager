/**
 * 日志管理模块
 * 负责日志组件的启动、初始化与事件监听
 */
import { 初始化日志系统 } from '../utils/logs/index.js'
import { 
    创建Vue日志组件,
    创建回退日志显示,
    重写控制台方法,
    暴露日志方法
} from '../utils/logs/logInterface.js'
import { 日志 } from '../../../src/toolBox/base/useEcma/forLogs/useLogger.js'

/**
 * 初始化日志组件
 * @returns {Promise<boolean>} 日志系统初始化是否成功
 */
const 初始化日志组件 = async () => {
    try {
        // 等待DOM元素存在
        const logApp = document.getElementById('logApp')
        if (!logApp) {
            throw new Error('找不到日志容器元素')
        }

        // 初始化日志系统
      //  console.log("开始加载日志系统...")
        await 初始化日志系统()

        // 监听消息事件，用于初始测试
        window.addEventListener('message', (事件) => {
            if (事件.data && 事件.data.type === 'log') {
                // 注释掉此行，防止形成循环日志
                // console.log("接收到日志消息:", 事件.data.log)
            }
        })

        // 创建Vue日志组件
        let 组件创建成功 = false
        try {
            const 组件接口 = await 创建Vue日志组件(logApp)
            
            if (!组件接口) {
                throw new Error('日志组件接口创建失败')
            }
            组件创建成功 = true
        } catch (错误) {
            console.error('创建Vue接口失败:', 错误)
            
            // 如果Vue组件创建失败，回退到简单日志显示
            创建回退日志显示(logApp, 错误)
        }

        // 开发模式标志（可通过全局变量控制）
        const 开发模式 = window.开发模式 === true
        
        // 重写控制台
     //   重写控制台方法(开发模式)
        
        // 暴露日志接口
        暴露日志方法()

        日志.信息('日志系统初始化完成', 'System')
        return 组件创建成功
    } catch (错误) {
        console.error('日志组件初始化失败:', 错误)
        return false
    }
}

/**
 * 在DOM加载完成后初始化日志组件
 * @returns {Promise<boolean>} 日志系统初始化是否成功
 */
const 在DOM加载后初始化日志 = () => {
    return new Promise((resolve) => {
        const 执行初始化 = async () => {
            try {
                const 结果 = await 初始化日志组件()
                resolve(结果)
            } catch (错误) {
                console.error('日志初始化过程中发生错误:', 错误)
                resolve(false)
            }
        }
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', 执行初始化)
        } else {
            执行初始化()
        }
    })
}

export {
    初始化日志组件,
    在DOM加载后初始化日志
} 