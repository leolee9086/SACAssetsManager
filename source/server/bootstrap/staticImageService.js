/**
 * 静态图片服务加载模块 (适配器)
 * 
 * 该模块现在作为适配器使用，为了兼容旧的调用方式，
 * 实际的静态图片服务实现已经移动到独立的窗口中。
 */

/**
 * 检查静态图片服务是否已初始化
 * 该函数现在通过检查全局状态判断静态服务是否已经启动
 * @returns {boolean} 是否已初始化
 */
const 服务是否已初始化 = () => {
    // 检查主进程中的标志位
    if (window.plugin && window.plugin.staticServerContainer) {
        return true;
    }
    
    // 检查全局映射表中是否有静态服务器窗口
    if (window.staticServerWindows && window.staticServerWindows.length > 0) {
        return true;
    }
    
    return false;
};

/**
 * 初始化静态图片服务
 * 该函数现在只是返回状态，实际的服务启动由main.js处理
 * @returns {Promise<boolean>} 是否成功初始化
 */
const 初始化静态图片服务 = async () => {
    console.log('检查静态图片服务状态...');
    
    // 如果已经初始化，直接返回成功
    if (服务是否已初始化()) {
        console.log('静态图片服务已经初始化');
        return true;
    }
    
    // 尝试通过广播通道检查服务状态
    try {
        // 创建广播通道
        const channel = new BroadcastChannel('SACAssetsStatic');
        
        // 发送ping消息
        console.log('发送静态服务检测消息...');
        channel.postMessage({ type: 'ping', timestamp: Date.now() });
        
        // 等待响应
        const 响应 = await new Promise((resolve) => {
            const 超时 = setTimeout(() => {
                resolve(false);
            }, 2000);
            
            channel.onmessage = (事件) => {
                if (事件.data && 事件.data.type === 'pong') {
                    clearTimeout(超时);
                    resolve(true);
                }
            };
        });
        
        // 关闭通道
        channel.close();
        
        return 响应;
    } catch (错误) {
        console.error('静态图片服务检测失败:', 错误);
        return false;
    }
};

/**
 * 轮询初始化图片服务
 * 尝试多次检测静态服务是否启动
 * @returns {Promise<boolean>} 是否成功初始化
 */
const 轮询初始化图片服务 = async () => {
    const 最大尝试次数 = 30;
    let 当前尝试次数 = 0;
    
    return new Promise((resolve) => {
        const 递归尝试 = async () => {
            if (当前尝试次数 >= 最大尝试次数) {
                console.error('静态图片服务初始化超时');
                resolve(false);
                return;
            }
            
            当前尝试次数++;
            const 结果 = await 初始化静态图片服务();
            
            if (结果) {
                resolve(true);
                return;
            }
            
            // 如果未检测到服务，尝试请求main.js启动服务
            if (当前尝试次数 === 10 || 当前尝试次数 === 20) {
                console.log('尝试请求启动静态图片服务...');
                try {
                    // 通过主进程通道请求启动
                    const mainChannel = new BroadcastChannel('SACAssets');
                    mainChannel.postMessage({ type: 'requestStartStaticServer' });
                    mainChannel.close();
                } catch (e) {
                    console.warn('请求启动静态服务失败:', e);
                }
            }
            
            setTimeout(递归尝试, 500);
        };
        
        递归尝试();
    });
};

export {
    初始化静态图片服务,
    轮询初始化图片服务
} 