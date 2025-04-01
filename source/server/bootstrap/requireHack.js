/**
 * 自定义require实现模块
 * 
 * 该模块提供了对原生require的封装和扩展，允许应用从指定的外部路径加载模块。
 * 它与source/utils/hack/hackRequire.js协同工作，为应用程序提供模块加载能力。
 */

// 配置模块加载路径和环境
const 配置Require环境 = (siyuanConfig, appID, siyuanPort, port) => {
    const path = require('path')
    
    // 设置全局配置
    window.siyuanConfig = siyuanConfig
    window.appID = appID
    window.siyuanPort = siyuanPort
    
    // 构建外部模块路径
    const 外部模块路径 = path.join(siyuanConfig.system.workspaceDir, '/data/plugins/SACAssetsManager/node_modules/')
    
    // 配置自定义require搜索路径
    window.require.setExternalBase(外部模块路径)
    window.require.setExternalDeps(外部模块路径)
    
    // 存储关键路径到全局
    window.externalBase = 外部模块路径
    window.workspaceDir = siyuanConfig.system.workspaceDir
    window.port = port
    
    return {
        externalBase: 外部模块路径,
        workspaceDir: siyuanConfig.system.workspaceDir
    }
}

/**
 * 初始化消息通道
 * 用于接收配置信息并启动服务
 * @returns {BroadcastChannel} 创建的广播通道
 */
const 初始化消息通道 = () => {
    // 创建通道
    const channel = new BroadcastChannel('SACAssets')
    window.channel = channel
    
    // 监听消息
    channel.onmessage = (事件) => {
        // 只处理siyuanConfig类型的消息，且仅在未配置时处理
        if (!window.siyuanConfig && 
            事件.data && 
            事件.data.type === 'siyuanConfig') {
            
            // 配置require环境
            const 配置结果 = 配置Require环境(
                事件.data.data,  // siyuanConfig
                事件.data.app,   // appID
                事件.data.siyuanPort, // siyuanPort
                事件.data.port   // port
            )
            
            console.log('收到配置信息，已配置模块加载环境:', 配置结果)
            
            // 加载主服务
            if (window.require) {
                console.log('开始导入主服务模块...')
                import("../server.js")
                    .then(() => console.log('主服务模块加载成功'))
                    .catch(错误 => console.error('主服务模块加载失败:', 错误))
            } else {
                console.error('require未定义，无法加载主服务')
            }
        }
    }
    
    console.log('消息通道已初始化，等待配置信息...')
    return channel
}

// 导出模块方法
export {
    配置Require环境,
    初始化消息通道
} 