import UAParser from 'ua-parser-js'

/**
 * 统一的平台检测接口
 * @param {Object} hostAPI - 宿主环境API（可选，用于Electron环境）
 * @returns {Object} 平台、浏览器和运行环境信息
 */
export const 获取平台信息 = (hostAPI) => {
    const parser = new UAParser()
    const result = parser.getResult()
    
    return {
        系统平台: {
            是否Windows: hostAPI?.platform === 'win32' || result.os.name === 'Windows',
            是否Mac: hostAPI?.platform === 'darwin' || result.os.name === 'Mac OS',
            是否Linux: hostAPI?.platform === 'linux' || result.os.name === 'Linux',
            是否移动端: result.device.type === 'mobile' || result.device.type === 'tablet',
            系统名称: result.os.name,
            系统版本: result.os.version
        },
        浏览器: {
            名称: result.browser.name,
            版本: result.browser.version,
            内核: result.engine.name,
            是否Chrome: result.browser.name === 'Chrome',
            是否Firefox: result.browser.name === 'Firefox',
            是否Safari: result.browser.name === 'Safari',
            是否Edge: result.browser.name === 'Edge',
            是否Opera: result.browser.name === 'Opera'
        },
        运行环境: {
            是否浏览器: typeof window !== 'undefined' && typeof document !== 'undefined',
            是否Electron: !!(hostAPI?.isElectron),
            是否WebWorker: typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope,
            是否ServiceWorker: typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope,
            设备类型: result.device.type || 'desktop',
            设备厂商: result.device.vendor,
            设备型号: result.device.model
        }
    }
}

/**
 * 获取完整的 UA 解析结果
 * @returns {Object} UAParser 的原始解析结果
 */
export const 获取详细信息 = () => {
    const parser = new UAParser()
    return parser.getResult()
} 