/**
 * 平台信息检测工具
 * 
 * 提供统一的API来检测当前运行环境的平台、系统和浏览器信息
 * 支持浏览器、Node.js和Electron环境
 * 无依赖轻量版本，不使用外部库
 */

/**
 * 获取基础平台信息（不依赖外部库）
 * @param {Object} hostAPI - 宿主环境API（可选，用于Electron环境）
 * @returns {Object} 平台、浏览器和运行环境信息
 */
export const 获取基础平台信息 = (hostAPI) => {
    const userAgent = typeof window !== 'undefined' ? 
        window.navigator.userAgent.toLowerCase() : '';

    return {
        系统平台: {
            是否Windows: hostAPI?.platform === 'win32' || /windows/.test(userAgent),
            是否Mac: hostAPI?.platform === 'darwin' || /macintosh/.test(userAgent),
            是否Linux: hostAPI?.platform === 'linux' || /linux/.test(userAgent),
            是否移动端: /mobile|android|ios/.test(userAgent)
        },
        浏览器: {
            是否Chrome: /chrome/.test(userAgent) && !/edge|opr/.test(userAgent),
            是否Firefox: /firefox/.test(userAgent),
            是否Safari: /safari/.test(userAgent) && !/chrome/.test(userAgent),
            是否Edge: /edg/.test(userAgent),
            是否Opera: /opr/.test(userAgent) || /opera/.test(userAgent),
            是否IE: /trident/.test(userAgent)
        },
        运行环境: {
            是否浏览器: typeof window !== 'undefined' && typeof document !== 'undefined',
            是否Electron: !!(hostAPI?.isElectron),
            是否WebWorker: typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope,
            是否ServiceWorker: typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope
        }
    };
};

/**
 * 获取用户代理字符串
 * @returns {string} 用户代理字符串或空字符串（非浏览器环境）
 */
export const 获取用户代理 = () => {
    return typeof window !== 'undefined' ? window.navigator.userAgent : '';
};

/**
 * 检测特定浏览器版本
 * @param {string} 浏览器名称 - 要检测的浏览器名称 
 * @param {string} 最低版本 - 最低版本要求
 * @returns {boolean} 是否符合版本要求
 */
export const 检测浏览器版本 = (浏览器名称, 最低版本) => {
    const userAgent = 获取用户代理();
    
    // 版本号提取正则表达式
    const 版本正则表达式映射 = {
        'Chrome': /chrome\/(\d+(\.\d+)?)/i,
        'Firefox': /firefox\/(\d+(\.\d+)?)/i,
        'Safari': /version\/(\d+(\.\d+)?).+safari/i,
        'Edge': /edg(?:e|)\/(\d+(\.\d+)?)/i,
        'Opera': /(?:opr|opera)\/(\d+(\.\d+)?)/i,
        'IE': /(?:msie |rv:)(\d+(\.\d+)?)/i
    };
    
    const regex = 版本正则表达式映射[浏览器名称];
    if (!regex) return false;
    
    const match = userAgent.match(regex);
    if (!match) return false;
    
    const 当前版本 = parseFloat(match[1]);
    return 当前版本 >= parseFloat(最低版本);
};

/**
 * 获取设备类型
 * @returns {string} 设备类型：'mobile', 'tablet', 'desktop' 或 'unknown'
 */
export const 获取设备类型 = () => {
    const userAgent = 获取用户代理().toLowerCase();
    
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
        return 'tablet';
    }
    
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
        return 'mobile';
    }
    
    return 'desktop';
};

/**
 * 获取操作系统信息
 * @returns {Object} 操作系统名称和版本
 */
export const 获取操作系统信息 = () => {
    const userAgent = 获取用户代理();
    let 系统名称 = 'unknown';
    let 系统版本 = '';
    
    // Windows
    if (/Windows/.test(userAgent)) {
        系统名称 = 'Windows';
        const match = userAgent.match(/Windows NT (\d+\.\d+)/);
        if (match) {
            const nt版本 = parseFloat(match[1]);
            const 版本映射 = {
                10.0: '10',
                6.3: '8.1',
                6.2: '8',
                6.1: '7',
                6.0: 'Vista',
                5.2: 'XP',
                5.1: 'XP',
                5.0: '2000'
            };
            系统版本 = 版本映射[nt版本] || '';
        }
    } 
    // macOS
    else if (/Macintosh/.test(userAgent)) {
        系统名称 = 'Mac OS';
        const match = userAgent.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
        if (match) {
            系统版本 = match[1].replace(/_/g, '.');
        }
    } 
    // Linux
    else if (/Linux/.test(userAgent)) {
        系统名称 = 'Linux';
        // Linux通常不暴露具体版本号
    } 
    // iOS
    else if (/iPhone|iPad|iPod/.test(userAgent)) {
        系统名称 = 'iOS';
        const match = userAgent.match(/OS (\d+[._]\d+[._]?\d*)/);
        if (match) {
            系统版本 = match[1].replace(/_/g, '.');
        }
    } 
    // Android
    else if (/Android/.test(userAgent)) {
        系统名称 = 'Android';
        const match = userAgent.match(/Android (\d+(\.\d+)+)/);
        if (match) {
            系统版本 = match[1];
        }
    }
    
    return { 系统名称, 系统版本 };
};

/**
 * 检测是否支持特定API或功能
 * @param {string} 特性名称 - 要检测的API或功能名称
 * @returns {boolean} 是否支持该特性
 */
export const 检测特性支持 = (特性名称) => {
    const 特性检测映射 = {
        'WebP': () => {
            const elem = document.createElement('canvas');
            if (!elem.getContext || !elem.getContext('2d')) return false;
            return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        },
        'WebGL': () => {
            try {
                const canvas = document.createElement('canvas');
                return !!(window.WebGLRenderingContext && 
                          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
            } catch (e) {
                return false;
            }
        },
        'WebAssembly': () => {
            return typeof WebAssembly === 'object' && typeof WebAssembly.compile === 'function';
        },
        'ServiceWorker': () => {
            return 'serviceWorker' in navigator;
        },
        'WebRTC': () => {
            return navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
        },
        '触摸屏': () => {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        }
    };
    
    if (!特性检测映射[特性名称]) return false;
    
    try {
        return 特性检测映射[特性名称]();
    } catch (e) {
        return false;
    }
};

export default {
    获取基础平台信息,
    获取用户代理,
    检测浏览器版本,
    获取设备类型,
    获取操作系统信息,
    检测特性支持
}; 