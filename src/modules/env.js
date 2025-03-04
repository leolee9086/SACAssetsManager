/**
 * 环境模块 - 提供运行环境信息和能力检测
 */
export function createEnvModule(hostAPI) {
    // 运行环境检测
    const isElectron = !!(hostAPI?.isElectron);
    const isWebWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
    const isServiceWorker = typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope;
    const isMainThread = !isWebWorker && !isServiceWorker;
    
    // 浏览器环境检测
    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    const userAgent = isBrowser ? window.navigator.userAgent.toLowerCase() : '';
    
    // 平台检测
    const platform = {
        isWindows: hostAPI?.platform === 'win32' || /windows/.test(userAgent),
        isMac: hostAPI?.platform === 'darwin' || /macintosh/.test(userAgent),
        isLinux: hostAPI?.platform === 'linux' || /linux/.test(userAgent),
        isMobile: /mobile|android|ios/.test(userAgent)
    };
    
    // 功能检测
    const features = {
        // 存储相关
        localStorage: (() => {
            try {
                return typeof localStorage !== 'undefined';
            } catch {
                return false;
            }
        })(),
        indexedDB: typeof indexedDB !== 'undefined',
        
        // API相关
        webWorker: typeof Worker !== 'undefined',
        serviceWorker: 'serviceWorker' in navigator,
        broadcastChannel: typeof BroadcastChannel !== 'undefined',
        
        // 网络相关
        webSocket: typeof WebSocket !== 'undefined',
        fetch: typeof fetch !== 'undefined',
        
        // 硬件相关
        webGL: (() => {
            if (!isBrowser) return false;
            try {
                const canvas = document.createElement('canvas');
                return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
            } catch {
                return false;
            }
        })()
    };

    // 版本信息
    const versions = {
        app: hostAPI?.version || '0.0.0',
        electron: hostAPI?.electronVersion,
        chrome: hostAPI?.chromeVersion || (() => {
            const match = userAgent.match(/chrome\/(\d+\.\d+\.\d+\.\d+)/);
            return match ? match[1] : undefined;
        })(),
        node: hostAPI?.nodeVersion
    };

    /**
     * 添加环境信息到宿主环境
     */
    if (hostAPI?.addToHost) {
        hostAPI.addToHost('env', {
            isElectron,
            isWebWorker,
            isServiceWorker,
            isMainThread,
            isBrowser,
            platform,
            features,
            versions
        });
    }

    return {
        // 环境类型
        isElectron,
        isWebWorker,
        isServiceWorker,
        isMainThread,
        isBrowser,
        
        // 平台信息
        platform,
        
        // 功能检测
        features,
        
        // 版本信息
        versions,
        
        /**
         * 检查特定功能是否可用
         * @param {string} featureName - 功能名称
         * @returns {boolean}
         */
        hasFeature(featureName) {
            return !!features[featureName];
        },
        
        /**
         * 获取特定版本信息
         * @param {string} component - 组件名称
         * @returns {string|undefined}
         */
        getVersion(component) {
            return versions[component];
        },
        
        /**
         * 获取完整的环境信息
         * @returns {Object}
         */
        getFullInfo() {
            return {
                type: {
                    isElectron,
                    isWebWorker,
                    isServiceWorker,
                    isMainThread,
                    isBrowser
                },
                platform: { ...platform },
                features: { ...features },
                versions: { ...versions }
            };
        }
    };
}

// 导出中文API
export const 环境模块 = {
    创建模块: createEnvModule
};

export default createEnvModule; 