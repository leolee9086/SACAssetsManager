/**
 * 静态图片服务加载模块
 * 负责修改webview并加载静态图片服务
 */

const 初始化静态图片服务 = async () => {
    const webview = document.querySelector('webview')
    if (!webview) {
        console.error('找不到webview元素')
        return false
    }

    if (webview.src !== 'about:blank') {
        return true // 已经初始化
    }

    if (window.externalBase) {
        try {
            webview.src = `./imageStaticService.html?externalBase=${window.externalBase.replace(/\\/g, '/')}&port=${window.port + 1}`
            webview.openDevTools()
            return true
        } catch (e) {
            console.error('启用静态图片服务器失败:', e)
            return false
        }
    } else {
        return false // 需要重试
    }
}

const 轮询初始化图片服务 = async () => {
    const 最大尝试次数 = 30 // 最多尝试30次，每次间隔100ms
    let 当前尝试次数 = 0
    
    const 尝试初始化 = () => {
        return new Promise((resolve) => {
            const 递归尝试 = async () => {
                if (当前尝试次数 >= 最大尝试次数) {
                    console.error('静态图片服务初始化超时')
                    resolve(false)
                    return
                }
                
                当前尝试次数++
                const 结果 = await 初始化静态图片服务()
                
                if (结果) {
                    resolve(true)
                    return
                }
                
                setTimeout(递归尝试, 100)
            }
            
            递归尝试()
        })
    }
    
    return await 尝试初始化()
}

export {
    初始化静态图片服务,
    轮询初始化图片服务
} 