/**
 * 系统初始化主入口
 * 
 * 该文件负责协调所有初始化流程，包括：
 * 1. 引入自定义require功能
 * 2. 初始化消息通道
 * 3. 初始化日志系统
 * 
 * 注：静态图片服务现在由独立进程负责
 * 
 * @module 系统初始化
 */

// 启用自定义require功能
import '../utils/hack/hackRequire.js'

// 导入各初始化模块
import { 初始化消息通道 } from './bootstrap/requireHack.js'
import { 在DOM加载后初始化日志 } from './bootstrap/logManager.js'

/**
 * 系统启动流程
 * 按照特定顺序初始化各模块
 */
const 系统启动 = async () => {
    console.log('====== 开始初始化系统 ======')
    
    // 1. 初始化消息通道，等待配置信息
    const 消息通道 = 初始化消息通道()
    console.log('消息通道初始化完成，等待接收配置...')
    
    // 2. 初始化日志系统
    console.log('开始初始化日志系统...')
    const 日志结果 = await 在DOM加载后初始化日志()
    if (日志结果) {
        console.log('✓ 日志系统初始化成功')
    } else {
        console.log('✗ 日志系统初始化失败，将使用默认日志')
    }
    
    console.log('====== 系统初始化流程完成 ======')
}

// 执行启动流程
系统启动()
