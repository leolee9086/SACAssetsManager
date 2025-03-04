import UAParser from '../../../../static/ua-parser-js.mjs'

/**
 * 创建一个新的 UA 解析器实例
 * @param {string} [userAgent] - 可选的自定义 UA 字符串
 * @returns {UAParser} UA 解析器实例
 */
export const 创建解析器 = (userAgent) => new UAParser(userAgent)

/**
 * 获取 CPU 架构信息
 * @returns {Object} CPU 信息
 */
export const 获取CPU信息 = () => {
    const parser = new UAParser()
    return parser.getCPU()
}

/**
 * 获取浏览器引擎信息
 * @returns {Object} 引擎信息，包含名称和版本
 */
export const 获取浏览器引擎 = () => {
    const parser = new UAParser()
    return parser.getEngine()
}

/**
 * 获取设备信息
 * @returns {Object} 设备信息，包含类型、厂商、型号等
 */
export const 获取设备信息 = () => {
    const parser = new UAParser()
    return parser.getDevice()
}

/**
 * 获取操作系统信息
 * @returns {Object} 操作系统信息，包含名称和版本
 */
export const 获取操作系统 = () => {
    const parser = new UAParser()
    return parser.getOS()
}

/**
 * 获取浏览器信息
 * @returns {Object} 浏览器信息，包含名称和版本
 */
export const 获取浏览器 = () => {
    const parser = new UAParser()
    return parser.getBrowser()
}

/**
 * 扩展功能：检测是否为特定浏览器版本
 * @param {string} browserName - 浏览器名称
 * @param {string} version - 版本号（支持比较操作符，如 '>10.0.0'）
 * @returns {boolean} 是否匹配指定条件
 */
export const 检测浏览器版本 = (browserName, version) => {
    const parser = new UAParser()
    const browser = parser.getBrowser()
    
    if (browser.name !== browserName) return false
    
    const currentVersion = browser.version
    const operator = version.match(/^[><=]+/)?.[0]
    const targetVersion = version.replace(/^[><=]+/, '')
    
    if (!operator) return currentVersion === targetVersion
    
    const compare = (v1, v2) => {
        const parts1 = v1.split('.').map(Number)
        const parts2 = v2.split('.').map(Number)
        
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0
            const p2 = parts2[i] || 0
            if (p1 !== p2) return p1 - p2
        }
        return 0
    }
    
    const diff = compare(currentVersion, targetVersion)
    switch (operator) {
        case '>': return diff > 0
        case '>=': return diff >= 0
        case '<': return diff < 0
        case '<=': return diff <= 0
        default: return false
    }
}

/**
 * 扩展功能：获取完整的设备指纹信息
 * @returns {Object} 设备指纹信息
 */
export const 获取设备指纹 = () => {
    const parser = new UAParser()
    const result = parser.getResult()
    
    return {
        系统: {
            名称: result.os.name,
            版本: result.os.version,
            架构: result.cpu.architecture
        },
        浏览器: {
            名称: result.browser.name,
            版本: result.browser.version,
            引擎: {
                名称: result.engine.name,
                版本: result.engine.version
            }
        },
        设备: {
            类型: result.device.type || 'desktop',
            厂商: result.device.vendor,
            型号: result.device.model,
            移动设备: !!result.device.type
        },
        原始UA: parser.getUA()
    }
}

/**
 * 扩展功能：检测是否为特定设备类型
 * @param {string} type - 设备类型 ('mobile'|'tablet'|'desktop'|'smarttv'|'wearable'|'embedded')
 * @returns {boolean} 是否为指定设备类型
 */
export const 检测设备类型 = (type) => {
    const parser = new UAParser()
    const device = parser.getDevice()
    return device.type === type || (type === 'desktop' && !device.type)
}

/**
 * 获取当前UA字符串
 * @returns {string} UA字符串
 */
export const 获取UA字符串 = () => {
    const parser = new UAParser()
    return parser.getUA()
}

/**
 * 使用自定义UA字符串创建解析结果
 * @param {string} ua - 自定义UA字符串
 * @returns {Object} 解析结果
 */
export const 解析UA字符串 = (ua) => {
    const parser = new UAParser()
    parser.setUA(ua)
    return parser.getResult()
}

/**
 * 批量解析UA字符串
 * @param {string[]} uaList - UA字符串数组
 * @returns {Object[]} 解析结果数组
 */
export const 批量解析UA = (uaList) => {
    return uaList.map(ua => 解析UA字符串(ua))
}

/**
 * 扩展UA解析规则
 * @param {Object} extensions - 自定义规则对象
 */
export const 扩展解析规则 = (extensions) => {
    const parser = new UAParser()
    if (extensions.browser) UAParser.BROWSER = { ...UAParser.BROWSER, ...extensions.browser }
    if (extensions.device) UAParser.DEVICE = { ...UAParser.DEVICE, ...extensions.device }
    if (extensions.os) UAParser.OS = { ...UAParser.OS, ...extensions.os }
    if (extensions.engine) UAParser.ENGINE = { ...UAParser.ENGINE, ...extensions.engine }
    if (extensions.cpu) UAParser.CPU = { ...UAParser.CPU, ...extensions.cpu }
}

/**
 * 创建自定义配置的解析器
 * @param {Object} config - 解析器配置
 * @returns {UAParser} 配置后的解析器实例
 */
export const 创建自定义解析器 = (config) => {
    return new UAParser(config)
}

/**
 * 扩展功能：获取完整的UA解析链
 * @param {string} [ua] - 可选的UA字符串
 * @returns {Object} 包含解析过程的详细信息
 */
export const 获取解析链 = (ua) => {
    const parser = new UAParser(ua)
    const result = parser.getResult()
    
    return {
        原始UA: parser.getUA(),
        解析结果: {
            浏览器: parser.getBrowser(),
            设备: parser.getDevice(),
            引擎: parser.getEngine(),
            操作系统: parser.getOS(),
            CPU: parser.getCPU()
        },
        完整结果: result
    }
}

/**
 * 扩展功能：检测特定浏览器引擎版本
 * @param {string} engineName - 引擎名称
 * @param {string} version - 版本号（支持比较操作符）
 * @returns {boolean} 是否匹配指定条件
 */
export const 检测浏览器引擎版本 = (engineName, version) => {
    const parser = new UAParser()
    const engine = parser.getEngine()
    
    // 复用之前的版本比较逻辑
    return 检测版本(engine.name, engine.version, engineName, version)
}

// 内部辅助函数：版本比较
const 检测版本 = (currentName, currentVersion, targetName, targetVersion) => {
    if (currentName !== targetName) return false
    
    const operator = targetVersion.match(/^[><=]+/)?.[0]
    const compareVersion = targetVersion.replace(/^[><=]+/, '')
    
    if (!operator) return currentVersion === compareVersion
    
    const compare = (v1, v2) => {
        const parts1 = v1.split('.').map(Number)
        const parts2 = v2.split('.').map(Number)
        
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0
            const p2 = parts2[i] || 0
            if (p1 !== p2) return p1 - p2
        }
        return 0
    }
    
    const diff = compare(currentVersion, compareVersion)
    switch (operator) {
        case '>': return diff > 0
        case '>=': return diff >= 0
        case '<': return diff < 0
        case '<=': return diff <= 0
        default: return false
    }
} 