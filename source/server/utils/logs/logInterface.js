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
    暴露日志方法
} 