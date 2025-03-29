/**
 * 基础平台检测
 */
export const 获取平台信息 = (hostAPI) => {
    const userAgent = typeof window !== 'undefined' ? 
        window.navigator.userAgent.toLowerCase() : '';

    return {
        系统平台: {
            是否Windows: hostAPI?.platform === 'win32' || /windows/.test(userAgent),
            是否Mac: hostAPI?.platform === 'darwin' || /macintosh/.test(userAgent),
            是否Linux: hostAPI?.platform === 'linux' || /linux/.test(userAgent),
            是否移动端: /mobile|android|ios/.test(userAgent)
        },
        运行环境: {
            是否浏览器: typeof window !== 'undefined' && typeof document !== 'undefined',
            是否Electron: !!(hostAPI?.isElectron),
            是否WebWorker: typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope,
            是否ServiceWorker: typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope
        }
    };
}; 